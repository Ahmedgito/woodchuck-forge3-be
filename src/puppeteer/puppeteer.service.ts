import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import PuppeteerPool from './puppeteer-pool';

@Injectable()
export class PuppeteerService {
  private browser: puppeteer.Browser;

  // Constants for delays and timeouts
  private static readonly PLOTLY_LOAD_TIMEOUT = 30000; // 30 seconds for Plotly to load
  private static readonly SELECTOR_RENDER_DELAY = 5000;
  private static readonly UI_SETTLE_DELAY = 2000;
  private static readonly VIEWPORT_WIDTH = 1500;
  private static readonly VIEWPORT_HEIGHT = 1080;
  private static readonly DEVICE_SCALE_FACTOR = 2;
  private static readonly PAGE_NAVIGATION_TIMEOUT = 120000; // 120 seconds for page navigation
  private static readonly PAGE_OPERATION_TIMEOUT = 300000; // 300 seconds (5 minutes) for page operations

  // Common graph selectors that need to be ready before PDF export
  private static readonly GRAPH_SELECTORS = [
    '#sankey-container--r0-',
    '.js-plotly-plot',
    '.plot-container',
    '.svg-container',
    '.main-svg',
  ];

  async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  async newPage(width = 1920, height = 1080): Promise<puppeteer.Page> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    return page;
  }

  async exportPdfWithCommonParams(
    page: puppeteer.Page,
    pdfPath: string,
    selector = '.container.white-area',
    options?: { fullPagePdf?: boolean },
  ) {
    // Find the target element by selector
    const element = await page.$(selector);
    if (!element) {
      console.error(`[PDF Export] Element not found for selector: ${selector}`);
      throw new Error(`Element ${selector} not found`);
    }

    const boundingBox = await element.boundingBox();
    if (!boundingBox) {
      console.error(
        `[PDF Export] Could not get bounding box for selector: ${selector}`,
      );
      throw new Error(`Could not get bounding box for ${selector}`);
    }

    // Wait for graph selectors to be ready (non-blocking)
    await this.waitForGraphSelectors(page);

    if (options?.fullPagePdf) {
      // Wait for UI to settle after getting bounding box
      await new Promise((res) =>
        setTimeout(res, PuppeteerService.UI_SETTLE_DELAY),
      );

      // Get the actual content height by finding the last child element's bottom position
      const contentDimensions = await page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement;
        if (!el) return null;

        // Scroll to bottom to ensure all content is rendered
        el.scrollTop = el.scrollHeight;
        // Small delay to ensure rendering
        // eslint-disable-next-line no-unused-expressions
        void el.offsetHeight;

        // Find the last visible child element to determine actual content height
        const children = Array.from(el.children) as HTMLElement[];
        let maxBottom = 0;
        let hasVisibleContent = false;

        children.forEach((child) => {
          const rect = child.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          // Calculate position relative to parent
          const relativeBottom = rect.bottom - elRect.top;

          // Only count children that are actually visible and have content
          if (rect.height > 0 && rect.width > 0) {
            hasVisibleContent = true;
            if (relativeBottom > maxBottom) {
              maxBottom = relativeBottom;
            }
          }
        });

        // Scroll back to top
        el.scrollTop = 0;

        // Use the last child's bottom position if we found visible content,
        // otherwise fall back to scrollHeight
        const actualHeight =
          hasVisibleContent && maxBottom > 0 ? maxBottom : el.scrollHeight;

        return {
          width: el.clientWidth || el.offsetWidth,
          height: actualHeight,
          scrollHeight: el.scrollHeight,
        };
      }, selector);

      if (!contentDimensions) {
        throw new Error(
          `Could not get content dimensions for selector: ${selector}`,
        );
      }

      const pdfWidth = boundingBox.width;
      // Use the actual content height, not the bounding box height which may include extra space
      const pdfHeight = contentDimensions.height;

      console.log('[PDF Export] PDF Dimensions:', pdfWidth, pdfHeight);
      console.log('[PDF Export] ScrollHeight:', contentDimensions.scrollHeight);
      console.log('[PDF Export] BoundingBox height:', boundingBox.height);

      // Hide all elements except the target element and its children
      await page.evaluate((sel) => {
        const targetEl = document.querySelector(sel);
        if (!targetEl) return;

        // Hide body's direct children that are not the target or its ancestors
        const body = document.body;
        const allElements = body.querySelectorAll('*');

        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          // Skip if it's the target element or a child of the target
          if (targetEl.contains(htmlEl) || htmlEl === targetEl) {
            return;
          }
          // Hide the element
          htmlEl.style.visibility = 'hidden';
        });

        // Also hide body's direct children that aren't ancestors of target
        Array.from(body.children).forEach((child) => {
          const htmlChild = child as HTMLElement;
          if (!targetEl.contains(htmlChild) && htmlChild !== targetEl) {
            htmlChild.style.visibility = 'hidden';
          }
        });

        // Make sure target element is visible and positioned correctly
        (targetEl as HTMLElement).style.visibility = 'visible';
        (targetEl as HTMLElement).style.position = 'absolute';
        (targetEl as HTMLElement).style.top = '0px';
        (targetEl as HTMLElement).style.left = '0px';
        (targetEl as HTMLElement).style.margin = '0';
        (targetEl as HTMLElement).style.padding = '0';
      }, selector);

      // Set viewport to match exact content dimensions (no extra space)
      await page.setViewport({
        width: PuppeteerService.VIEWPORT_WIDTH,
        height: Math.max(
          PuppeteerService.VIEWPORT_HEIGHT,
          Math.ceil(pdfHeight),
        ),
        deviceScaleFactor: PuppeteerService.DEVICE_SCALE_FACTOR,
      });

      // Wait for viewport to adjust
      await new Promise((res) =>
        setTimeout(res, PuppeteerService.UI_SETTLE_DELAY),
      );

      // Use Puppeteer's native PDF generation which handles large content properly
      await page.pdf({
        path: pdfPath,
        width: `${pdfWidth}px`,
        height: `${pdfHeight}px`,
        printBackground: true,
        preferCSSPageSize: false,
        margin: {
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px',
        },
      });

      console.log('[PDF Export] PDF generated successfully:', pdfPath);

      return;
    }

    // Default screenshot-based approach
    await new Promise((res) =>
      setTimeout(res, PuppeteerService.UI_SETTLE_DELAY),
    );

    // Take screenshot of only that element
    const screenshotBuffer = await element.screenshot({});
    const bufferSize = screenshotBuffer.length;
    console.log(
      `[PDF Export] Screenshot buffer size: ${bufferSize} bytes for selector: ${selector}`,
    );
    if (!screenshotBuffer || bufferSize < 1024) {
      console.error(
        `[PDF Export] Screenshot buffer is empty or too small (<1KB) for selector: ${selector}`,
      );
      throw new Error(
        `Screenshot buffer is empty or too small for ${selector}`,
      );
    }

    // Put that screenshot into a PDF
    const doc = new PDFDocument({
      autoFirstPage: false,
    });

    const pdfWidth = boundingBox.width;
    const pdfHeight = boundingBox.height;
    console.log('[PDF Export] PDF Dimensions:', pdfWidth, pdfHeight);
    doc.addPage({ size: [pdfWidth, pdfHeight] });
    doc.image(screenshotBuffer, 0, 0, {
      width: pdfWidth,
      height: pdfHeight,
    });
    console.log('writing to pdf path:', pdfPath);
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    console.log('done');
    doc.end();
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  /**
   * Opens a page, injects data, waits for selectors, waits extra, and exports a PDF of a selector.
   * @param url - The URL to open
   * @param data - The data to inject (POSTed to injectEndpoint)
   * @param injectEndpoint - The endpoint to POST data to (relative to page)
   * @param waitForSelectors - Array of selectors to wait for (all must be present)
   * @param waitForTextNotIncludes - Optional: {selector, text} to ensure text does not include value
   * @param exportSelector - The selector to export as PDF
   * @param pdfPath - Output PDF path
   * @param waitAfterReadyMs - Extra wait time after selectors are ready (ms)
   */
  async exportReportPageToPdf({
    url,
    data,
    injectEndpoint = '/api/report-data',
    waitForSelectors = [],
    waitForTextNotIncludes,
    exportSelector = '.container.white-area',
    pdfPath,
    waitAfterReadyMs = 0,
    fullPagePdf = false,
    shouldWaitForPlotly = true,
    afterPdf,
  }: {
    url: string;
    data: any;
    injectEndpoint?: string;
    waitForSelectors: string[];
    waitForTextNotIncludes?: { selector: string; text: string };
    exportSelector?: string;
    pdfPath: string;
    waitAfterReadyMs?: number;
    fullPagePdf?: boolean;
    shouldWaitForPlotly?: boolean;
    /** Optional callback executed on the live page after PDF generation, before the page closes.
     *  Use this to capture screenshots (e.g. collapse-item PNGs) without opening a second page. */
    afterPdf?: (page: puppeteer.Page) => Promise<void>;
  }) {
    await PuppeteerPool.usePage(async (page) => {
      // domcontentloaded is sufficient — waitForFunction below gates actual content readiness
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.evaluate(
        async (endpoint, data) => {
          await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
        },
        injectEndpoint,
        data,
      );

      // Wait for Plotly library to be loaded (only if needed)
      if (shouldWaitForPlotly) {
        const plotlyLoaded = await page
          .waitForSelector('.js-plotly-plot', {
            timeout: PuppeteerService.PLOTLY_LOAD_TIMEOUT,
          })
          .catch(() => false);

        if (!plotlyLoaded) {
          console.error(
            `[PDF Export] Plotly library was not loaded within ${PuppeteerService.PLOTLY_LOAD_TIMEOUT}ms.`,
          );
          throw new Error(
            `Plotly library was not loaded within ${PuppeteerService.PLOTLY_LOAD_TIMEOUT}ms.`,
          );
        }

        // Give time for selectors to render after Plotly is loaded
        await new Promise((res) =>
          setTimeout(res, PuppeteerService.SELECTOR_RENDER_DELAY),
        );
      }

      // Now wait for all selectors
      const selectorsReady = await page
        .waitForFunction(
          (selectors, waitForTextNotIncludes) => {
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (!el || !el.textContent) return false;
            }
            if (waitForTextNotIncludes) {
              const el = document.querySelector(
                waitForTextNotIncludes.selector,
              );
              if (
                el &&
                el.textContent &&
                el.textContent.includes(waitForTextNotIncludes.text)
              ) {
                return false;
              }
            }
            return true;
          },
          { timeout: 120000 },
          waitForSelectors,
          waitForTextNotIncludes,
        )
        .catch(() => false);

      if (!selectorsReady) {
        console.error(
          '[PDF Export] Required selectors were not found or not ready.',
          { selectors: waitForSelectors },
        );
        throw new Error('Required selectors were not found or not ready.');
      }

      // Set viewport for PDF export
      await this.setViewportForExport(page);

      if (waitAfterReadyMs > 0) {
        await new Promise((res) => setTimeout(res, waitAfterReadyMs));
      }

      await this.exportPdfWithCommonParams(page, pdfPath, exportSelector, {
        fullPagePdf,
      });

      if (afterPdf) {
        await afterPdf(page);
      }
    });
  }

  /**
   * Waits for graph selectors to be ready in parallel (non-blocking - continues if selector not found)
   */
  private async waitForGraphSelectors(page: puppeteer.Page): Promise<void> {
    await Promise.all(
      PuppeteerService.GRAPH_SELECTORS.map((graphSelector) =>
        page
          .waitForSelector(graphSelector, {
            timeout: PuppeteerService.PLOTLY_LOAD_TIMEOUT,
          })
          .catch(() => {
            console.warn(
              `[PDF Export] Graph selector ${graphSelector} not found, continuing...`,
            );
          }),
      ),
    );
  }

  /**
   * Sets viewport for PDF export with standard dimensions
   */
  private async setViewportForExport(page: puppeteer.Page): Promise<void> {
    await page.setViewport({
      width: PuppeteerService.VIEWPORT_WIDTH,
      height: PuppeteerService.VIEWPORT_HEIGHT,
      deviceScaleFactor: PuppeteerService.DEVICE_SCALE_FACTOR,
    });
  }

  /**
   * Takes PNG screenshots of all elements matching a selector on the page.
   * @param page Puppeteer Page instance
   * @param selector CSS selector for elements to screenshot
   * @param outputDir Directory to save PNGs
   * @param filenamePrefix Prefix for output files (default: 'element')
   * @param timeoutMs How long to wait for the selector before giving up (default: 60000)
   * @returns Array of file paths to saved PNGs
   */
  async screenshotElements(
    page: puppeteer.Page,
    selector: string,
    outputDir: string,
    filenamePrefix = 'element',
    timeoutMs = 60000,
  ): Promise<string[]> {
    await page.waitForSelector(selector, { timeout: timeoutMs });
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });

    // Get count of elements first
    const elementCount = await page.$$eval(selector, (els) => els.length);
    if (!elementCount) {
      throw new Error(`No elements found for selector: ${selector}`);
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePaths: string[] = [];
    // Re-query elements right before each screenshot to avoid detached nodes
    for (let i = 0; i < elementCount; i++) {
      // Re-query to get fresh element handles
      const elements = await page.$$(selector);
      if (i >= elements.length) {
        throw new Error(
          `Element at index ${i} no longer exists for selector: ${selector}`,
        );
      }
      const el = elements[i];
      const filePath = `${outputDir}/${filenamePrefix}_${i + 1}.png`;

      try {
        await el.screenshot({ path: filePath as `${string}.png` });
        filePaths.push(filePath);
      } catch (error) {
        // If element is detached, try one more time with a fresh query
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('detached')) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          const retryElements = await page.$$(selector);
          if (i < retryElements.length) {
            await retryElements[i].screenshot({
              path: filePath as `${string}.png`,
            });
            filePaths.push(filePath);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }
    return filePaths;
  }

  static async closeBrowser() {
    await PuppeteerPool.close();
  }
}
