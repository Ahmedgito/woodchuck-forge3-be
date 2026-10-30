import puppeteer, { Browser, Page, LaunchOptions } from 'puppeteer';

class PuppeteerPool {
  private static browser: Browser | null = null;
  private static isLaunching = false;
  private static pageQueue: Array<() => void> = [];
  // Configurable via PUPPETEER_MAX_PAGES env var — tune to container RAM (~200 MB per page)
  private static maxPages = parseInt(
    process.env.PUPPETEER_MAX_PAGES || '4',
    10,
  );
  private static activePages = 0;
  private static refCount = 0; // Reference count for browser usage

  static async getBrowser(options?: LaunchOptions): Promise<Browser> {
    if (!this.browser && !this.isLaunching) {
      this.isLaunching = true;
      this.browser = await puppeteer.launch(options);
      this.isLaunching = false;
    }
    while (!this.browser) {
      await new Promise((res) => setTimeout(res, 100));
    }
    return this.browser;
  }

  static async usePage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    this.refCount++; // Increment refCount when a page is requested
    return new Promise<T>(async (resolve, reject) => {
      const run = async () => {
        this.activePages++;
        try {
          const browser = await this.getBrowser({
            headless: true,
            executablePath: '/usr/bin/chromium-browser',
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage', // helps with small Docker /dev/shm
            ],
            // devtools: true,
            protocolTimeout: 300000, // Increased timeout to 300 seconds (5 minutes)
          });
          const page = await browser.newPage();
          try {
            const result = await fn(page);
            await page.close();
            resolve(result);
          } catch (err) {
            console.log('err', err);
            await page.close();
            console.log(this.refCount, '<<< ref count');
            reject(err);
          }
        } catch (e) {
          console.log('Error occurred while processing page:', e);
        } finally {
          console.log('finally block');
          this.activePages--;
          this.refCount--; // Decrement refCount when page is done
          if (this.pageQueue.length > 0) {
            const next = this.pageQueue.shift();
            if (next) next();
          }
        }
      };
      if (this.activePages < this.maxPages) {
        await run();
      } else {
        this.pageQueue.push(run);
      }
    });
  }

  static async close() {
    console.log('closing the browser');
    // Only close if no one is using the browser
    if (this.browser && this.refCount === 0) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export default PuppeteerPool;
