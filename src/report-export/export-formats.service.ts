import { Injectable } from '@nestjs/common';
import { ReportFormatEnum } from 'src/report-subscriptions/report-format.enum';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { RoleEnum } from 'src/roles/roles.enum';

@Injectable()
export class ExportFormatsService {
  /**
   * Round a number to 3 decimal places
   */
  private roundTo3Decimals(value: number): number {
    return Math.round(value * 1000) / 1000;
  }

  /**
   * Format address object to a readable string
   */
  private formatAddress(address: any): string {
    if (!address) {
      return 'N/A';
    }

    // If address is already a string, return it
    if (typeof address === 'string') {
      return address;
    }

    // If addressFull is available, use it
    if (address.addressFull) {
      return address.addressFull;
    }

    // Otherwise, construct from parts
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ]
      .filter(Boolean)
      .map((part) => part!.trim());

    return parts.length > 0 ? parts.join(', ') : 'N/A';
  }

  /**
   * Export report data to the specified format
   */
  async exportReport(
    reportData: any,
    format: ReportFormatEnum,
    outputPath: string,
    reportType: 'job-site' | 'dashboard',
    monthName?: string,
    jobSiteName?: string,
    rangeMonths?: Array<{
      monthName: string;
      startDate: string;
      endDate: string;
    }>,
  ): Promise<
    | { filename: string; path: string }
    | Array<{ filename: string; path: string }>
  > {
    switch (format) {
      case ReportFormatEnum.PDF:
        throw new Error('PDF export should be handled by PuppeteerService');

      case ReportFormatEnum.EXCEL:
        return this.exportToExcel(
          reportData,
          outputPath,
          reportType,
          monthName,
          jobSiteName,
          rangeMonths,
        );

      case ReportFormatEnum.CSV:
        return this.exportToCSV(
          reportData,
          outputPath,
          reportType,
          monthName,
          jobSiteName,
          rangeMonths,
        );

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Export data to Excel format
   */
  private async exportToExcel(
    reportData: any,
    outputPath: string,
    reportType: 'job-site' | 'dashboard',
    monthName?: string,
    jobSiteName?: string,
    rangeMonths?: Array<{
      monthName: string;
      startDate: string;
      endDate: string;
    }>,
  ): Promise<{ filename: string; path: string }> {
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Woodchuck Report Export';
    workbook.created = new Date();

    // === STYLES ===
    const titleFont = {
      name: 'Arial',
      size: 20,
      bold: true,
      color: { argb: 'FF5E2E91' },
    };
    const headerFont = { name: 'Arial', size: 14, bold: true };
    const boldFont = { bold: true };
    const center = { horizontal: 'center', vertical: 'middle' };

    // Single sheet - original behavior (rangeMonths will be handled in generateDashboardExcel)
    const ws = workbook.addWorksheet('Report', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
      views: [{ showGridLines: false }],
    });

    if (reportType === 'dashboard') {
      this.generateDashboardExcel(
        ws,
        reportData,
        titleFont,
        headerFont,
        boldFont,
        center,
        monthName,
        rangeMonths,
      );
    } else {
      this.generateJobSiteExcel(
        ws,
        reportData,
        titleFont,
        headerFont,
        boldFont,
        center,
        jobSiteName,
        monthName,
        rangeMonths,
      );
    }

    // Generate filename
    const filename = this.generateFilename('xlsx', monthName);
    const fullPath = path.join(outputPath, filename);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write Excel file
    await workbook.xlsx.writeFile(fullPath);

    return { filename, path: fullPath };
  }

  /**
   * Apply black border around the entire report
   */
  private applyReportBorder(
    ws: ExcelJS.Worksheet,
    lastRow: number,
    lastColumn: string,
  ): void {
    const lastColNum = lastColumn.charCodeAt(0) - 64; // Convert A-M to 1-13
    const blackBorder = {
      style: 'thin' as const,
      color: { argb: 'FF000000' }, // Black
    };

    // Top border: row 1, columns A to lastColumn
    for (let col = 1; col <= lastColNum; col++) {
      const cell = ws.getCell(1, col);
      if (!cell.border) {
        cell.border = {};
      }
      cell.border.top = blackBorder;
    }

    // Bottom border: lastRow, columns A to lastColumn
    for (let col = 1; col <= lastColNum; col++) {
      const cell = ws.getCell(lastRow, col);
      if (!cell.border) {
        cell.border = {};
      }
      cell.border.bottom = blackBorder;
    }

    // Left border: column A, rows 1 to lastRow
    for (let row = 1; row <= lastRow; row++) {
      const cell = ws.getCell(row, 1);
      if (!cell.border) {
        cell.border = {};
      }
      cell.border.left = blackBorder;
    }

    // Right border: lastColumn, rows 1 to lastRow
    for (let row = 1; row <= lastRow; row++) {
      const cell = ws.getCell(row, lastColNum);
      if (!cell.border) {
        cell.border = {};
      }
      cell.border.right = blackBorder;
    }
  }

  /**
   * Common function to render shared report elements (tree stats, flow boxes, metrics)
   */
  private renderCommonReportElements(
    ws: ExcelJS.Worksheet,
    stats: any,
    config: {
      woodBoxStartRow: number;
      woodBoxStartCol: string;
      biomassBoxStartRow: number;
      biomassBoxStartCol: string;
      metricsStartRow: number;
      metricsStartCol: string;
      footnoteRow: number;
      otherStreamsRow: number;
      bannerRow: number;
      collectedDivertedRow: number;
      collectedStartCol: string;
      divertedStartCol: string;
    },
    titleFont: any,
    headerFont: any,
    boldFont: any,
    center: any,
    isDashboard: boolean = false,
  ): void {
    // === WOOD WASTE DIVERSION TITLE ===
    ws.getCell(`A${config.woodBoxStartRow - 2}`).value = 'WOOD WASTE DIVERSION';
    ws.getCell(`A${config.woodBoxStartRow - 2}`).font = headerFont;
    ws.getCell(`A${config.woodBoxStartRow - 2}`).alignment = {
      horizontal: 'left',
    };

    // === FLOW BOXES ===
    // Wood Waste Box - Using separate merged areas with outer border only
    // Empty row above (for spacing)
    ws.mergeCells(
      `${config.woodBoxStartCol}${config.woodBoxStartRow}:D${config.woodBoxStartRow}`,
    );
    const emptyRowAboveWood = ws.getCell(
      `${config.woodBoxStartCol}${config.woodBoxStartRow}`,
    );
    emptyRowAboveWood.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF38761D' }, // Dark green #38761D
    };
    emptyRowAboveWood.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Title area
    ws.mergeCells(
      `${config.woodBoxStartCol}${config.woodBoxStartRow + 1}:D${config.woodBoxStartRow + 1}`,
    );
    const woodBoxTitle = ws.getCell(
      `${config.woodBoxStartCol}${config.woodBoxStartRow + 1}`,
    );
    woodBoxTitle.value = 'Wood Waste';
    woodBoxTitle.font = {
      bold: false,
      size: 12,
      color: { argb: 'FFFFFFFF' },
    }; // White text
    woodBoxTitle.alignment = { horizontal: 'left' };
    woodBoxTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF38761D' }, // Dark green #38761D
    };
    woodBoxTitle.border = {
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Value area
    ws.mergeCells(
      `${config.woodBoxStartCol}${config.woodBoxStartRow + 2}:D${config.woodBoxStartRow + 2}`,
    );
    const woodBoxValue = ws.getCell(
      `${config.woodBoxStartCol}${config.woodBoxStartRow + 2}`,
    );
    woodBoxValue.value = `${stats.wood_waste || 0} tn`;
    woodBoxValue.font = {
      bold: false,
      size: 12,
      color: { argb: 'FFFFFFFF' },
    }; // White text
    woodBoxValue.alignment = { horizontal: 'left' };
    woodBoxValue.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF38761D' }, // Dark green #38761D
    };
    woodBoxValue.border = {
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Carbon Credits Label area
    ws.mergeCells(
      `${config.woodBoxStartCol}${config.woodBoxStartRow + 3}:D${config.woodBoxStartRow + 3}`,
    );
    const carbonLabel = ws.getCell(
      `${config.woodBoxStartCol}${config.woodBoxStartRow + 3}`,
    );
    carbonLabel.value = 'Carbon Credits';
    carbonLabel.font = {
      bold: false,
      size: 10,
      color: { argb: 'FFFFFFFF' },
    }; // White text
    carbonLabel.alignment = { horizontal: 'left' };
    carbonLabel.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF38761D' }, // Dark green #38761D
    };
    carbonLabel.border = {
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Carbon Credits Value area
    ws.mergeCells(
      `${config.woodBoxStartCol}${config.woodBoxStartRow + 4}:D${config.woodBoxStartRow + 4}`,
    );
    const carbonValue = ws.getCell(
      `${config.woodBoxStartCol}${config.woodBoxStartRow + 4}`,
    );
    carbonValue.value = '0 tn';
    carbonValue.font = {
      bold: false,
      size: 10,
      color: { argb: 'FFFFFFFF' },
    }; // White text
    carbonValue.alignment = { horizontal: 'left' };
    carbonValue.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF38761D' }, // Dark green #38761D
    };
    carbonValue.border = {
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Empty row below (for spacing)
    ws.mergeCells(
      `${config.woodBoxStartCol}${config.woodBoxStartRow + 5}:D${config.woodBoxStartRow + 5}`,
    );
    const emptyRowBelowWood = ws.getCell(
      `${config.woodBoxStartCol}${config.woodBoxStartRow + 5}`,
    );
    emptyRowBelowWood.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF38761D' }, // Dark green #38761D
    };
    emptyRowBelowWood.border = {
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Biomass + Clean Energy Box - Using separate merged areas with outer border only
    // Empty row above (for spacing)
    ws.mergeCells(
      `${config.biomassBoxStartCol}${config.biomassBoxStartRow}:H${config.biomassBoxStartRow}`,
    );
    const emptyRowAboveBiomass = ws.getCell(
      `${config.biomassBoxStartCol}${config.biomassBoxStartRow}`,
    );
    emptyRowAboveBiomass.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8E7CC3' }, // Medium purple #8E7CC3
    };
    emptyRowAboveBiomass.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Title area
    ws.mergeCells(
      `${config.biomassBoxStartCol}${config.biomassBoxStartRow + 1}:H${config.biomassBoxStartRow + 1}`,
    );
    const biomassBoxTitle = ws.getCell(
      `${config.biomassBoxStartCol}${config.biomassBoxStartRow + 1}`,
    );
    biomassBoxTitle.value = 'Biomass for Clean Energy';
    biomassBoxTitle.font = {
      bold: false,
      size: 12,
      color: { argb: 'FFFFFFFF' },
    }; // White text
    biomassBoxTitle.alignment = { horizontal: 'left' };
    biomassBoxTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8E7CC3' }, // Medium purple #8E7CC3
    };
    biomassBoxTitle.border = {
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Biomass Value area
    ws.mergeCells(
      `${config.biomassBoxStartCol}${config.biomassBoxStartRow + 2}:H${config.biomassBoxStartRow + 2}`,
    );
    const biomassBoxValue = ws.getCell(
      `${config.biomassBoxStartCol}${config.biomassBoxStartRow + 2}`,
    );
    biomassBoxValue.value = `${stats.biomass_clean_energy || 0} tn`;
    biomassBoxValue.font = {
      bold: false,
      size: 12,
      color: { argb: 'FFFFFFFF' },
    }; // White text
    biomassBoxValue.alignment = { horizontal: 'left' };
    biomassBoxValue.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8E7CC3' }, // Medium purple #8E7CC3
    };
    biomassBoxValue.border = {
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Clean Energy Label area
    ws.mergeCells(
      `${config.biomassBoxStartCol}${config.biomassBoxStartRow + 3}:H${config.biomassBoxStartRow + 3}`,
    );
    const cleanEnergyLabel = ws.getCell(
      `${config.biomassBoxStartCol}${config.biomassBoxStartRow + 3}`,
    );
    cleanEnergyLabel.value = 'Clean Energy';
    cleanEnergyLabel.font = {
      bold: false,
      size: 10,
      color: { argb: 'FFFFFFFF' },
    }; // White text
    cleanEnergyLabel.alignment = { horizontal: 'left' };
    cleanEnergyLabel.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8E7CC3' }, // Medium purple #8E7CC3
    };
    cleanEnergyLabel.border = {
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Clean Energy Value area
    ws.mergeCells(
      `${config.biomassBoxStartCol}${config.biomassBoxStartRow + 4}:H${config.biomassBoxStartRow + 4}`,
    );
    const cleanEnergyValue = ws.getCell(
      `${config.biomassBoxStartCol}${config.biomassBoxStartRow + 4}`,
    );
    cleanEnergyValue.value = `${stats.clean_energy || 0} MWh`;
    cleanEnergyValue.font = {
      bold: false,
      size: 10,
      color: { argb: 'FFFFFFFF' },
    }; // White text
    cleanEnergyValue.alignment = { horizontal: 'left' };
    cleanEnergyValue.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8E7CC3' }, // Medium purple #8E7CC3
    };
    cleanEnergyValue.border = {
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Empty row below (for spacing)
    ws.mergeCells(
      `${config.biomassBoxStartCol}${config.biomassBoxStartRow + 5}:H${config.biomassBoxStartRow + 5}`,
    );
    const emptyRowBelowBiomass = ws.getCell(
      `${config.biomassBoxStartCol}${config.biomassBoxStartRow + 5}`,
    );
    emptyRowBelowBiomass.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8E7CC3' }, // Medium purple #8E7CC3
    };
    emptyRowBelowBiomass.border = {
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Remanufacturing (Top Right) - First box in right column
    // Title area
    ws.mergeCells(`I${config.woodBoxStartRow}:J${config.woodBoxStartRow}`);
    const remanBoxTitle = ws.getCell(`I${config.woodBoxStartRow}`);
    remanBoxTitle.value = 'Remanufacturing';
    remanBoxTitle.font = {
      bold: false,
      size: 10,
      color: { argb: 'FFFFFFFF' },
    }; // White text
    remanBoxTitle.alignment = { horizontal: 'left' };
    remanBoxTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4C346F' }, // Dark purple #4C346F
    };
    remanBoxTitle.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Value area
    ws.mergeCells(
      `I${config.woodBoxStartRow + 1}:J${config.woodBoxStartRow + 1}`,
    );
    const remanBoxValue = ws.getCell(`I${config.woodBoxStartRow + 1}`);
    remanBoxValue.value = `${stats.remanufacturing || 0} tn`;
    remanBoxValue.font = {
      bold: false,
      size: 10,
      color: { argb: 'FFFFFFFF' },
    }; // White text
    remanBoxValue.alignment = { horizontal: 'left' };
    remanBoxValue.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4C346F' }, // Dark purple #4C346F
    };
    remanBoxValue.border = {
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Industrial Product (Middle Right) - Second box in right column
    // Title area
    ws.mergeCells(
      `I${config.woodBoxStartRow + 2}:J${config.woodBoxStartRow + 2}`,
    );
    const indBoxTitle = ws.getCell(`I${config.woodBoxStartRow + 2}`);
    indBoxTitle.value = 'Industrial Product';
    indBoxTitle.font = {
      bold: false,
      size: 10,
      color: { argb: 'FFFFFFFF' },
    }; // White text
    indBoxTitle.alignment = { horizontal: 'left' };
    indBoxTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB5ABC8' }, // Light purple #B5ABC8
    };
    indBoxTitle.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Value area
    ws.mergeCells(
      `I${config.woodBoxStartRow + 3}:J${config.woodBoxStartRow + 3}`,
    );
    const indBoxValue = ws.getCell(`I${config.woodBoxStartRow + 3}`);
    indBoxValue.value = `${stats.industrial_product || 0} tn`;
    indBoxValue.font = {
      bold: false,
      size: 10,
      color: { argb: 'FFFFFFFF' },
    }; // White text
    indBoxValue.alignment = { horizontal: 'left' };
    indBoxValue.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB5ABC8' }, // Light purple #B5ABC8
    };
    indBoxValue.border = {
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Landfill (Bottom Right) - Third box in right column
    // Title area
    ws.mergeCells(
      `I${config.woodBoxStartRow + 4}:J${config.woodBoxStartRow + 4}`,
    );
    const landfillBoxTitle = ws.getCell(`I${config.woodBoxStartRow + 4}`);
    landfillBoxTitle.value = 'Landfill';
    landfillBoxTitle.font = {
      bold: false,
      size: 10,
      color: { argb: 'FFFFFFFF' },
    }; // White text
    landfillBoxTitle.alignment = { horizontal: 'left' };
    landfillBoxTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF0000' }, // Red #FF0000
    };
    landfillBoxTitle.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Value area
    ws.mergeCells(
      `I${config.woodBoxStartRow + 5}:J${config.woodBoxStartRow + 5}`,
    );
    const landfillBoxValue = ws.getCell(`I${config.woodBoxStartRow + 5}`);
    landfillBoxValue.value = `${stats.landfill || 0} tn`;
    landfillBoxValue.font = {
      bold: false,
      size: 10,
      color: { argb: 'FFFFFFFF' },
    }; // White text
    landfillBoxValue.alignment = { horizontal: 'left' };
    landfillBoxValue.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF0000' }, // Red #FF0000
    };
    landfillBoxValue.border = {
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // === METRICS ===
    const metrics = [
      // Old metrics (commented out)
      // ['Total diverted', `${stats.total_diverted || 0} tn`],
      ['Total CO2e diverted', `${stats.total_co2_diverted || 0} tn`],
      // ['Client diversion goal', `${stats.client_diversion_goal || 0}%`],
      // ['Chuck result', `${stats.chuck_result || 0}%`],
      // New metrics
      ['Transport CO2', `${stats.transport_co2 || 0} tn`],
      ['% diverted', `${stats.diverted_percentage || 0}%`],
      ['Clean energy', `${stats.clean_energy || 0} MWh`],
      ['net CO2 avoided', `${stats.net_co2_avoided || 0} tn`],
    ];

    metrics.forEach(([label, value], i) => {
      const row = config.metricsStartRow + i;
      ws.getCell(`${config.metricsStartCol}${row}`).value = label;
      ws.getCell(`D${row}`).value = value;
      ws.getCell(`D${row}`).font = { bold: true, color: { argb: 'FF006400' } };
      ws.getCell(`D${row}`).alignment = center;
    });

    // === OTHER WASTE STREAMS ===
    ws.getCell(`A${config.otherStreamsRow}`).value = 'WASTE STREAMS';
    ws.getCell(`A${config.otherStreamsRow}`).font = headerFont;
    ws.getCell(`A${config.otherStreamsRow}`).alignment = { horizontal: 'left' };

    const otherStreams = [
      [
        'CARD BOARD',
        `${this.roundTo3Decimals(stats.card_board?.delivered || 0)} tn`,
        `${this.roundTo3Decimals(stats.card_board?.transport_co2 || 0)} tn transport CO2`,
        `${this.roundTo3Decimals(stats.card_board?.rebate_recycling || 0)} tn recycling rebates`,
      ],
      [
        'WASTE HAULING',
        `${this.roundTo3Decimals(stats.waste_hauling?.delivered || 0)} tn`,
        `${this.roundTo3Decimals(stats.waste_hauling?.transport_co2 || 0)} tn transport CO2`,
      ],
      [
        'METAL',
        `${this.roundTo3Decimals(stats.metal?.delivered || 0)} tn`,
        `${this.roundTo3Decimals(stats.metal?.transport_co2 || 0)} tn transport CO2`,
      ],
      [
        'PLASTIC',
        `${this.roundTo3Decimals(stats.plastic?.delivered || 0)} tn`,
        `${this.roundTo3Decimals(stats.plastic?.transport_co2 || 0)} tn transport CO2`,
      ],
      [
        'CONCRETE',
        `${this.roundTo3Decimals(stats.concrete?.delivered || 0)} tn`,
        `${this.roundTo3Decimals(stats.concrete?.transport_co2 || 0)} tn transport CO2`,
      ],
    ];

    let row = config.otherStreamsRow + 2;
    otherStreams.forEach(([name, tons, co2, recyclingRebates]) => {
      ws.getCell(`B${row}`).value = name;
      ws.getCell(`D${row}`).value = tons;
      ws.getCell(`F${row}`).value = co2;
      ws.getCell(`H${row}`).value = recyclingRebates;
      ws.getCell(`B${row}`).font = boldFont;
      row++;
    });

    // === 100% BANNER ===
    ws.mergeCells(`A${config.bannerRow}:L${config.bannerRow}`);
    ws.getCell(`A${config.bannerRow}`).value = `${
      stats.wood_waste_diverted || 0
    }% WOOD WASTE DIVERSION`;
    ws.getCell(`A${config.bannerRow}`).font = {
      size: 18,
      bold: true,
      color: { argb: isDashboard ? 'FF006400' : 'FFFFFFFF' }, // Green #006400 for dashboard, white for job site
    };
    ws.getCell(`A${config.bannerRow}`).alignment = { horizontal: 'left' };
    // Only apply blue background for job site reports, not dashboard
    if (!isDashboard) {
      ws.getCell(`A${config.bannerRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF69AAE3' }, // Light blue #69AAE3
      };
    }

    ws.getCell(`A${config.bannerRow + 1}`).value = `${
      stats.total_wood_waste_diversion || 0
    }% TOTAL WASTE DIVERSION`;
    ws.getCell(`A${config.bannerRow + 1}`).font = { italic: true };
    ws.getCell(`A${config.bannerRow + 1}`).alignment = { horizontal: 'left' };

    // === COLLECTED vs DIVERTED - Using separate merged areas ===
    // Collected Title area
    ws.mergeCells(
      `${config.collectedStartCol}${config.collectedDivertedRow}:D${config.collectedDivertedRow}`,
    );
    const collectedTitle = ws.getCell(
      `${config.collectedStartCol}${config.collectedDivertedRow}`,
    );
    collectedTitle.value = 'Wood Waste Collected';
    collectedTitle.font = boldFont;
    collectedTitle.alignment = center;

    // Collected Value area
    ws.mergeCells(
      `${config.collectedStartCol}${config.collectedDivertedRow + 1}:D${config.collectedDivertedRow + 1}`,
    );
    const collectedValue = ws.getCell(
      `${config.collectedStartCol}${config.collectedDivertedRow + 1}`,
    );
    collectedValue.value = `${stats.wood_waste_collected || 0} tn`;
    collectedValue.font = boldFont;
    collectedValue.alignment = center;

    // Diverted Title area
    ws.mergeCells(
      `${config.divertedStartCol}${config.collectedDivertedRow}:I${config.collectedDivertedRow}`,
    );
    const divertedTitle = ws.getCell(
      `${config.divertedStartCol}${config.collectedDivertedRow}`,
    );
    divertedTitle.value = 'Wood Waste Diverted';
    divertedTitle.font = boldFont;
    divertedTitle.alignment = center;

    // Diverted Value area
    ws.mergeCells(
      `${config.divertedStartCol}${config.collectedDivertedRow + 1}:I${config.collectedDivertedRow + 1}`,
    );
    const divertedValue = ws.getCell(
      `${config.divertedStartCol}${config.collectedDivertedRow + 1}`,
    );
    divertedValue.value = `${stats.total_waste_diversion || 0} tn`;
    divertedValue.font = boldFont;
    divertedValue.alignment = center;
  }

  /**
   * Generate Dashboard Excel report
   */
  private generateDashboardExcel(
    ws: ExcelJS.Worksheet,
    reportData: any,
    titleFont: any,
    headerFont: any,
    boldFont: any,
    center: any,
    monthName?: string,
    rangeMonths?: Array<{
      monthName: string;
      startDate: string;
      endDate: string;
    }>,
  ): void {
    // Use the unified reportData structure
    const stats = reportData.treeStats || {};
    const wasteStreamDataByMonth = reportData.wasteStreamDataByMonth || [];

    // === HEADER ===
    ws.mergeCells('A1:L1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'DASHBOARD REPORT';
    titleCell.font = { ...titleFont, color: { argb: 'FFFFFFFF' } }; // White text
    titleCell.alignment = { horizontal: 'left' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6B5691' }, // Purple #6B5691
    };

    ws.mergeCells('A2:L2');
    ws.getCell('A2').value = `Report Period: ${monthName || 'Current Period'}`;
    ws.getCell('A2').font = { italic: true };
    ws.getCell('A2').alignment = { horizontal: 'left' };

    // Use common function to render shared elements
    this.renderCommonReportElements(
      ws,
      stats,
      {
        woodBoxStartRow: 6,
        woodBoxStartCol: 'B',
        biomassBoxStartRow: 6,
        biomassBoxStartCol: 'E',
        metricsStartRow: 13,
        metricsStartCol: 'B',
        footnoteRow: 18,
        otherStreamsRow: 20,
        bannerRow: 28,
        collectedDivertedRow: 31,
        collectedStartCol: 'C',
        divertedStartCol: 'G',
      },
      titleFont,
      headerFont,
      boldFont,
      center,
      true, // isDashboard = true
    );

    // === CLIENT/JOB SITES WASTE STREAMS ===
    const roleId = reportData.role?.id ?? reportData.role;
    const isAdmin = roleId === RoleEnum.admin || roleId === RoleEnum.cms;
    let startRow = 34;
    ws.mergeCells(`A${startRow}:L${startRow}`);
    ws.getCell(`A${startRow}`).value = isAdmin
      ? 'CLIENT WASTE STREAMS'
      : 'JOB SITE WASTE STREAMS';
    ws.getCell(`A${startRow}`).font = {
      ...headerFont,
      color: { argb: 'FFFFFFFF' }, // White text
    };
    ws.getCell(`A${startRow}`).alignment = { horizontal: 'left' };
    ws.getCell(`A${startRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF69AAE3' }, // Light blue #69AAE3 (same as job site banner)
    };
    startRow += 2;

    const headers = ['Waste Stream', 'Tons', 'Vessels', 'Vessel Size'];

    // If rangeMonths is provided, render month-wise waste streams
    if (rangeMonths && rangeMonths.length > 0) {
      const monthReportDataList = (reportData as any).monthReportDataList || [];

      rangeMonths.forEach((monthPlan, monthIndex) => {
        // Month name header
        ws.mergeCells(`A${startRow}:L${startRow}`);
        ws.getCell(`A${startRow}`).value = monthPlan.monthName;
        ws.getCell(`A${startRow}`).font = headerFont;
        ws.getCell(`A${startRow}`).alignment = { horizontal: 'left' };
        ws.getCell(`A${startRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC8E6C9' },
        };
        startRow += 1;

        // Get month-specific waste stream data
        const monthData =
          monthReportDataList && monthReportDataList[monthIndex]
            ? monthReportDataList[monthIndex]
            : reportData;
        const monthWasteStreams = monthData.wasteStreamDataByMonth || [];

        if (monthWasteStreams.length > 0) {
          monthWasteStreams.forEach((stream: any) => {
            // Client name header
            ws.mergeCells(`A${startRow}:L${startRow}`);
            ws.getCell(`A${startRow}`).value = isAdmin
              ? stream.clientName || 'Unknown Client'
              : stream.jobsiteName || 'Unknown Job Site';
            ws.getCell(`A${startRow}`).font = boldFont;
            ws.getCell(`A${startRow}`).alignment = { horizontal: 'left' };
            startRow += 1;

            // Column headers
            headers.forEach((h, i) => {
              const cell = ws.getCell(startRow, i + 1);
              cell.value = h;
              cell.font = { ...boldFont, color: { argb: 'FF000000' } }; // Black text
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFBFBFBF' }, // Light grey #BFBFBF
              };
              cell.alignment = { horizontal: 'left' };
              // No borders on headers
            });
            startRow++;

            // Stream data rows - Group by name and dumpster_weight
            if (stream.data && Array.isArray(stream.data)) {
              // Group data by name and dumpster_weight
              const groupedData = new Map<
                string,
                {
                  tons: number;
                  moved: number;
                  dumpsterWeight: string;
                }
              >();

              stream.data.forEach((item: any) => {
                const itemName = item.name || 'Unknown';
                const dumpsterWeight = item.dumpster_weight || 'Unknown';
                const key = `${itemName}|${dumpsterWeight}`;

                if (groupedData.has(key)) {
                  const existing = groupedData.get(key)!;
                  existing.tons += item.tons || 0;
                  existing.moved += item.moved || 0;
                } else {
                  groupedData.set(key, {
                    tons: item.tons || 0,
                    moved: item.moved || 0,
                    dumpsterWeight: dumpsterWeight,
                  });
                }
              });

              // Add grouped data to Excel
              groupedData.forEach((data, key) => {
                const [itemName] = key.split('|');
                ws.getCell(startRow, 1).value = itemName;
                ws.getCell(startRow, 2).value = data.tons;
                ws.getCell(startRow, 3).value = data.moved;
                ws.getCell(startRow, 4).value = data.dumpsterWeight;
                // Left-align data cells
                ws.getCell(startRow, 1).alignment = { horizontal: 'left' };
                ws.getCell(startRow, 2).alignment = { horizontal: 'left' };
                ws.getCell(startRow, 3).alignment = { horizontal: 'left' };
                ws.getCell(startRow, 4).alignment = { horizontal: 'left' };
                // No borders on data rows
                startRow++;
              });
            }
            startRow++;
          });
        } else {
          ws.mergeCells(`A${startRow}:L${startRow}`);
          ws.getCell(`A${startRow}`).value =
            `No waste streams found for ${monthPlan.monthName}`;
          ws.getCell(`A${startRow}`).font = boldFont;
          ws.getCell(`A${startRow}`).alignment = { horizontal: 'left' };
          startRow += 2;
        }
        startRow += 1; // Add spacing between months
      });
    } else {
      // Original behavior - render cumulative waste streams
      if (wasteStreamDataByMonth.length > 0) {
        wasteStreamDataByMonth.forEach((stream: any) => {
          // Client name header
          ws.mergeCells(`A${startRow}:L${startRow}`);
          ws.getCell(`A${startRow}`).value = isAdmin
            ? stream.clientName || 'Unknown Client'
            : stream.jobsiteName || 'Unknown Job Site';
          ws.getCell(`A${startRow}`).font = boldFont;
          ws.getCell(`A${startRow}`).alignment = { horizontal: 'left' };
          startRow += 1;

          // Column headers
          headers.forEach((h, i) => {
            const cell = ws.getCell(startRow, i + 1);
            cell.value = h;
            cell.font = { ...boldFont, color: { argb: 'FF000000' } }; // Black text
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFBFBFBF' }, // Light grey #BFBFBF
            };
            cell.alignment = { horizontal: 'left' };
            // No borders on headers
          });
          startRow++;

          // Stream data rows - Group by name and dumpster_weight
          if (stream.data && Array.isArray(stream.data)) {
            // Group data by name and dumpster_weight
            const groupedData = new Map<
              string,
              {
                tons: number;
                moved: number;
                dumpsterWeight: string;
              }
            >();

            stream.data.forEach((item: any) => {
              const itemName = item.name || 'Unknown';
              const dumpsterWeight = item.dumpster_weight || 'Unknown';
              const key = `${itemName}|${dumpsterWeight}`;

              if (groupedData.has(key)) {
                const existing = groupedData.get(key)!;
                existing.tons += item.tons || 0;
                existing.moved += item.moved || 0;
              } else {
                groupedData.set(key, {
                  tons: item.tons || 0,
                  moved: item.moved || 0,
                  dumpsterWeight: dumpsterWeight,
                });
              }
            });

            // Add grouped data to Excel
            groupedData.forEach((data, key) => {
              const [itemName] = key.split('|');
              ws.getCell(startRow, 1).value = itemName;
              ws.getCell(startRow, 2).value = data.tons;
              ws.getCell(startRow, 3).value = data.moved;
              ws.getCell(startRow, 4).value = data.dumpsterWeight;
              // Left-align data cells
              ws.getCell(startRow, 1).alignment = { horizontal: 'left' };
              ws.getCell(startRow, 2).alignment = { horizontal: 'left' };
              ws.getCell(startRow, 3).alignment = { horizontal: 'left' };
              ws.getCell(startRow, 4).alignment = { horizontal: 'left' };
              // No borders on data rows
              startRow++;
            });
          }
          startRow++;
        });
      } else {
        ws.mergeCells(`A${startRow}:L${startRow}`);
        ws.getCell(`A${startRow}`).value = 'No waste streams found';
        ws.getCell(`A${startRow}`).font = boldFont;
        ws.getCell(`A${startRow}`).alignment = { horizontal: 'left' };
        startRow += 2;
      }
    }

    // Apply black border around the entire report
    const lastRow = startRow - 1; // Last row with content
    this.applyReportBorder(ws, lastRow, 'L');
  }

  /**
   * Generate Job Site Excel report
   */
  private generateJobSiteExcel(
    ws: ExcelJS.Worksheet,
    reportData: any,
    titleFont: any,
    headerFont: any,
    boldFont: any,
    center: any,
    jobSiteName?: string,
    monthName?: string,
    rangeMonths?: Array<{
      monthName: string;
      startDate: string;
      endDate: string;
    }>,
  ): void {
    // Use the unified reportData structure
    const stats = reportData.treeStats || {};
    const monthGraph = reportData.monthGraph || {};

    // === HEADER ===
    ws.mergeCells('A1:L1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'JOBSITE REPORT';
    titleCell.font = { ...titleFont, color: { argb: 'FFFFFFFF' } }; // White text
    titleCell.alignment = { horizontal: 'left' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6B5691' }, // Purple #6B5691
    };

    ws.getCell('A2').value = `Report Period: ${monthName || 'Current Period'}`;
    ws.getCell('A2').font = { italic: true };
    ws.getCell('A2').alignment = { horizontal: 'left' };

    // === JOBSITE TITLE ===
    ws.getCell('A4').value = `JOBSITE: ${jobSiteName || 'JOB SITE'}`;
    ws.getCell('A4').font = headerFont;
    ws.getCell('A4').alignment = { horizontal: 'left' };

    ws.getCell('A5').value =
      `CLIENT: ${reportData.jobSite?.clientName || 'Unknown Client'}`;
    ws.getCell('A5').font = { italic: true };
    ws.getCell('A5').alignment = { horizontal: 'left' };

    // === JOBSITE DETAILS ===
    ws.getCell('A7').value = 'Address:';
    ws.getCell('B7').value = this.formatAddress(reportData.jobSite?.address);
    ws.getCell('A8').value = 'Phone:';
    ws.getCell('B8').value = reportData.jobSite?.phone || 'N/A';
    ws.getCell('A9').value = 'Email:';
    ws.getCell('B9').value = reportData.jobSite?.email || 'N/A';
    ws.getCell('A10').value = 'Completion By:';
    ws.getCell('B10').value = reportData.jobSite?.completionBy || 'N/A';
    ws.getCell('A11').value = 'Size:';
    ws.getCell('B11').value = reportData.jobSite?.size || 'N/A';
    ws.getCell('A12').value = 'Sustainability Goal:';
    ws.getCell('B12').value = `${reportData.jobSite?.sustainabilityGoal || 0}%`;

    // === WOOD WASTE DIVERSION TITLE ===
    // Use common function to render shared elements
    this.renderCommonReportElements(
      ws,
      stats,
      {
        woodBoxStartRow: 16,
        woodBoxStartCol: 'B',
        biomassBoxStartRow: 16,
        biomassBoxStartCol: 'E',
        metricsStartRow: 23,
        metricsStartCol: 'B',
        footnoteRow: 30,
        otherStreamsRow: 32,
        bannerRow: 40,
        collectedDivertedRow: 43,
        collectedStartCol: 'B',
        divertedStartCol: 'I',
      },
      titleFont,
      headerFont,
      boldFont,
      center,
      false, // isDashboard = false (job site)
    );

    // === VESSEL OVERVIEW (cumulative only) ===
    let startRow = 47; // Start after banner and collected/diverted sections
    ws.getCell(`A${startRow}`).value = 'VESSEL OVERVIEW';
    ws.getCell(`A${startRow}`).font = headerFont;
    ws.getCell(`A${startRow}`).alignment = { horizontal: 'left' };
    startRow += 2;

    // Headers
    const headers = [
      'Waste Stream',
      'Tons',
      'Vessels',
      'Carbon Credits',
      'Recycling Rebates',
    ];

    {
      // Original behavior - render cumulative vessel overview
      headers.forEach((h, i) => {
        const cell = ws.getCell(startRow, i + 1);
        cell.value = h;
        cell.font = boldFont;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFBFBFBF' }, // Light grey #BFBFBF
        };
        cell.alignment = {
          horizontal: 'left',
          vertical: 'top',
          wrapText: true,
        };
        // No borders on headers
      });
      startRow++;

      // Calculate totals and group by waste stream type
      let totalVessels = 0;
      let totalTons = 0;
      const groupedByVessel = new Map<
        string,
        Map<string, { vessels: number; tons: number }>
      >();

      const jobSiteWasteStreams =
        reportData.barGraph?.jobSitesWasteStreams || [];
      jobSiteWasteStreams.forEach((stream: any) => {
        const vessels = stream.moved || 0;
        const tons = stream.tons || 0;
        totalVessels += vessels;
        totalTons += tons;

        const vesselLabel =
          stream.dumpster_type && stream.dumpster_weight
            ? `${stream.dumpster_type} ${stream.dumpster_weight}`
            : stream.wasteStream?.name || 'Unknown';
        const streamName = stream.wasteStream?.name || 'Unknown';
        if (!groupedByVessel.has(vesselLabel)) {
          groupedByVessel.set(vesselLabel, new Map());
        }
        const vesselMap = groupedByVessel.get(vesselLabel)!;
        if (vesselMap.has(streamName)) {
          const existing = vesselMap.get(streamName)!;
          existing.vessels += vessels;
          existing.tons += tons;
        } else {
          vesselMap.set(streamName, {
            vessels: vessels,
            tons: tons,
          });
        }
      });

      // Render vessel headings with waste stream breakdown
      groupedByVessel.forEach((wasteStreams, vesselLabel) => {
        ws.getCell(startRow, 1).value = vesselLabel;
        ws.getCell(startRow, 1).font = boldFont;
        ws.getCell(startRow, 1).alignment = { horizontal: 'left' };
        ws.getCell(startRow, 2).alignment = { horizontal: 'left' };
        ws.getCell(startRow, 3).alignment = { horizontal: 'left' };
        ws.getCell(startRow, 4).alignment = { horizontal: 'left' };
        ws.getCell(startRow, 5).alignment = { horizontal: 'left' };
        startRow++;

        wasteStreams.forEach((data, streamName) => {
          ws.getCell(startRow, 1).value = streamName;
          ws.getCell(startRow, 2).value = `${data.tons.toFixed(1)} tn`;
          ws.getCell(startRow, 3).value = data.vessels;
          ws.getCell(startRow, 4).value = '0 tn';
          ws.getCell(startRow, 5).value = '$0';
          ws.getCell(startRow, 1).alignment = { horizontal: 'left' };
          ws.getCell(startRow, 2).alignment = { horizontal: 'left' };
          ws.getCell(startRow, 3).alignment = { horizontal: 'left' };
          ws.getCell(startRow, 4).alignment = { horizontal: 'left' };
          ws.getCell(startRow, 5).alignment = { horizontal: 'left' };
          startRow++;
        });

        startRow++;
      });

      // Add totals row
      ws.getCell(startRow, 1).value = 'Totals';
      ws.getCell(startRow, 1).font = boldFont;
      ws.getCell(startRow, 2).value = `${totalTons.toFixed(1)} tn`;
      ws.getCell(startRow, 3).value = totalVessels;
      ws.getCell(startRow, 4).value = '0 tn';
      ws.getCell(startRow, 5).value = '$0';
      ws.getCell(startRow, 1).alignment = { horizontal: 'left' };
      ws.getCell(startRow, 2).alignment = { horizontal: 'left' };
      ws.getCell(startRow, 3).alignment = { horizontal: 'left' };
      ws.getCell(startRow, 4).alignment = { horizontal: 'left' };
      ws.getCell(startRow, 5).alignment = { horizontal: 'left' };
      startRow += 2;

      // === WASTE STREAM IMAGES (from wasteStreamImagesMap) ===
      const imagesMap: Record<number, any[]> =
        reportData.wasteStreamImagesMap || {};
      const imageEntries = Object.entries(imagesMap).filter(
        ([, imgs]) => (imgs as any[]).length > 0,
      );
      if (imageEntries.length > 0) {
        ws.getCell(`A${startRow}`).value = 'WASTE STREAM IMAGES';
        ws.getCell(`A${startRow}`).font = headerFont;
        startRow++;

        const imgHeaders = [
          'Waste Stream',
          'Image',
          'Image URL / Link',
          'AI Verified',
          'Confidence (%)',
        ];
        imgHeaders.forEach((h, i) => {
          const cell = ws.getCell(startRow, i + 1);
          cell.value = h;
          cell.font = boldFont;
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFBFBFBF' },
          };
          cell.alignment = { horizontal: 'left' };
        });
        startRow++;

        imageEntries.forEach(([wsId, imgs]) => {
          const latestImgs = (imgs as any[]).filter((img) => img.isLatest);
          latestImgs.forEach((img, i) => {
            const streamName =
              jobSiteWasteStreams.find(
                (s: any) => String(s.id) === String(wsId),
              )?.wasteStream?.name || wsId;
            const displayConf =
              img.adminConfidenceOverride ?? img.aiConfidenceLevel ?? 'N/A';
            const verified =
              img.aiStatus === 'complete'
                ? img.aiVerified
                  ? 'Yes'
                  : 'No'
                : img.aiStatus;
            const imageUrl = img.file?.path || '';

            ws.getCell(startRow, 1).value = streamName;
            ws.getCell(startRow, 2).value = `Image ${i + 1}`;
            if (imageUrl) {
              ws.getCell(startRow, 3).value = {
                text: `View Image ${i + 1}`,
                hyperlink: imageUrl,
              };
              ws.getCell(startRow, 3).font = {
                color: { argb: 'FF1677FF' },
                underline: true,
              };
            } else {
              ws.getCell(startRow, 3).value = 'N/A';
            }
            ws.getCell(startRow, 4).value = verified;
            ws.getCell(startRow, 5).value =
              typeof displayConf === 'number'
                ? Number(displayConf).toFixed(1)
                : displayConf;

            [1, 2, 3, 4, 5].forEach((col) => {
              ws.getCell(startRow, col).alignment = { horizontal: 'left' };
            });
            startRow++;
          });
          startRow++; // spacer between waste streams
        });
        startRow++;
      }
    }

    // === MONTHLY REPORTS (render month-wise when rangeMonths provided) ===
    ws.getCell(`A${startRow}`).value = 'MONTHLY REPORTS';
    ws.getCell(`A${startRow}`).font = headerFont;
    ws.getCell(`A${startRow}`).alignment = { horizontal: 'left' };
    startRow += 2;

    // When rangeMonths available, loop and render each month's details
    const monthReportDataList = (reportData as any).monthReportDataList || [];
    if (rangeMonths && rangeMonths.length > 0) {
      for (let i = 0; i < rangeMonths.length; i++) {
        const monthPlan = rangeMonths[i];
        const monthData =
          monthReportDataList && monthReportDataList[i]
            ? monthReportDataList[i]
            : reportData;
        const mg = monthData.monthGraph || {};
        if (
          mg &&
          mg.data?.jobSitesWasteStreams &&
          Array.isArray(mg.data.jobSitesWasteStreams)
        ) {
          ws.mergeCells(`A${startRow}:L${startRow}`);
          ws.getCell(`A${startRow}`).value = monthPlan.monthName;
          ws.getCell(`A${startRow}`).font = boldFont;
          ws.getCell(`A${startRow}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F8FF' },
          };
          startRow += 2;

          const detailHeaders = [
            'Waste Stream',
            'Tons',
            'Moved',
            'Vessel Size',
          ];
          detailHeaders.forEach((h, j) => {
            const cell = ws.getCell(startRow, j + 1);
            cell.value = h;
            cell.font = { ...boldFont, color: { argb: 'FF000000' } }; // Black text
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFBFBFBF' }, // Light grey #BFBFBF
            };
            cell.alignment = {
              horizontal: 'left',
              vertical: 'top',
              wrapText: true,
            };
            cell.border = {};
          });
          startRow++;

          const groupedByDumpster = new Map<
            string,
            {
              wasteStreams: Map<
                string,
                { moved: number; tons: number; dumpsterWeight?: string }
              >;
            }
          >();
          mg.data.jobSitesWasteStreams.forEach((stream: any) => {
            const streamName = stream.wasteStream?.name || 'Unknown';
            const dumpsterType = stream.dumpster_type || 'Unknown';
            const dumpsterWeight = stream.dumpster_weight || 'Unknown';
            const dumpsterKey = `${dumpsterType} ${dumpsterWeight}`;
            if (!groupedByDumpster.has(dumpsterKey)) {
              groupedByDumpster.set(dumpsterKey, { wasteStreams: new Map() });
            }
            const entry = groupedByDumpster.get(dumpsterKey)!;
            if (entry.wasteStreams.has(streamName)) {
              const existing = entry.wasteStreams.get(streamName)!;
              existing.moved += stream.moved || 0;
              existing.tons += stream.tons || 0;
            } else {
              entry.wasteStreams.set(streamName, {
                moved: stream.moved || 0,
                tons: stream.tons || 0,
                dumpsterWeight,
              });
            }
          });

          groupedByDumpster.forEach((dumpsterData, dumpsterKey) => {
            ws.getCell(startRow, 1).value = dumpsterKey;
            ws.getCell(startRow, 1).font = boldFont;
            ws.getCell(startRow, 1).alignment = { horizontal: 'left' };
            ws.getCell(startRow, 2).alignment = { horizontal: 'left' };
            ws.getCell(startRow, 3).alignment = { horizontal: 'left' };
            ws.getCell(startRow, 4).alignment = { horizontal: 'left' };
            startRow++;
            dumpsterData.wasteStreams.forEach((data, streamName) => {
              ws.getCell(startRow, 1).value = streamName;
              ws.getCell(startRow, 2).value = data.tons;
              ws.getCell(startRow, 3).value = data.moved;
              ws.getCell(startRow, 4).value = data.dumpsterWeight || '';
              ws.getCell(startRow, 1).alignment = { horizontal: 'left' };
              ws.getCell(startRow, 2).alignment = { horizontal: 'left' };
              ws.getCell(startRow, 3).alignment = { horizontal: 'left' };
              ws.getCell(startRow, 4).alignment = { horizontal: 'left' };
              startRow++;
            });
            startRow++;
          });
          const monthlyTotalTons = Number(
            (mg.data?.total_tons || 0).toFixed(2),
          );
          const monthlyTotalMoved = mg.data?.total_moved || 0;
          ws.getCell(startRow, 1).value = 'Totals';
          ws.getCell(startRow, 1).font = boldFont;
          ws.getCell(startRow, 2).value = monthlyTotalTons;
          ws.getCell(startRow, 3).value = monthlyTotalMoved;
          ws.getCell(startRow, 4).value = '';
          ws.getCell(startRow, 1).alignment = { horizontal: 'left' };
          ws.getCell(startRow, 2).alignment = { horizontal: 'left' };
          ws.getCell(startRow, 3).alignment = { horizontal: 'left' };
          ws.getCell(startRow, 4).alignment = { horizontal: 'left' };
          startRow += 2;
        } else {
          ws.mergeCells(`A${startRow}:L${startRow}`);
          ws.getCell(`A${startRow}`).value =
            `No monthly data for ${monthPlan.monthName}`;
          ws.getCell(`A${startRow}`).font = boldFont;
          ws.getCell(`A${startRow}`).alignment = center;
          startRow += 2;
        }
      }
    } else if (monthGraph && Object.keys(monthGraph).length > 0) {
      // Single-month/cumulative behavior (existing)
      // Add detailed waste streams for this month if available
      if (
        monthGraph.data?.jobSitesWasteStreams &&
        Array.isArray(monthGraph.data?.jobSitesWasteStreams)
      ) {
        ws.mergeCells(`A${startRow}:L${startRow}`);
        ws.getCell(`A${startRow}`).value = 'Monthly Waste Stream Details';
        ws.getCell(`A${startRow}`).font = boldFont;
        ws.getCell(`A${startRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F8FF' },
        };
        startRow += 2;

        // Headers for detailed data
        const detailHeaders = [
          'Waste Stream',
          'Tons',
          'Vessels',
          'Vessel Size',
        ];
        detailHeaders.forEach((h, i) => {
          const cell = ws.getCell(startRow, i + 1);
          cell.value = h;
          cell.font = { ...boldFont, color: { argb: 'FF000000' } }; // Black text
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFBFBFBF' }, // Light grey #BFBFBF
          };
          cell.alignment = { horizontal: 'left' };
          cell.border = {};
        });
        startRow++;

        // Group data by dumpster type + weight first
        const groupedByDumpster = new Map<
          string,
          {
            wasteStreams: Map<string, { moved: number; tons: number }>;
          }
        >();

        monthGraph.data?.jobSitesWasteStreams.forEach((stream: any) => {
          const streamName = stream.wasteStream?.name || 'Unknown';
          const dumpsterType = stream.dumpster_type || 'Unknown';
          const dumpsterWeight = stream.dumpster_weight || 'Unknown';
          const dumpsterKey = `${dumpsterType} ${dumpsterWeight} YRD`;

          if (!groupedByDumpster.has(dumpsterKey)) {
            groupedByDumpster.set(dumpsterKey, {
              wasteStreams: new Map(),
            });
          }

          const dumpsterData = groupedByDumpster.get(dumpsterKey)!;
          if (dumpsterData.wasteStreams.has(streamName)) {
            const existing = dumpsterData.wasteStreams.get(streamName)!;
            existing.moved += stream.moved || 0;
            existing.tons += stream.tons || 0;
          } else {
            dumpsterData.wasteStreams.set(streamName, {
              moved: stream.moved || 0,
              tons: stream.tons || 0,
            });
          }
        });

        // Add grouped data to Excel
        groupedByDumpster.forEach((dumpsterData, dumpsterKey) => {
          // Add dumpster type + weight as header
          ws.getCell(startRow, 1).value = dumpsterKey;
          ws.getCell(startRow, 1).font = boldFont;
          ws.getCell(startRow, 1).alignment = { horizontal: 'left' };
          ws.getCell(startRow, 2).alignment = { horizontal: 'left' };
          ws.getCell(startRow, 3).alignment = { horizontal: 'left' };
          ws.getCell(startRow, 4).alignment = { horizontal: 'left' };
          startRow++;

          // Add waste streams under this dumpster
          dumpsterData.wasteStreams.forEach((data, streamName) => {
            ws.getCell(startRow, 1).value = streamName;
            ws.getCell(startRow, 2).value = data.tons;
            ws.getCell(startRow, 3).value = data.moved;
            // Left align all data
            ws.getCell(startRow, 1).alignment = { horizontal: 'left' };
            ws.getCell(startRow, 2).alignment = { horizontal: 'left' };
            ws.getCell(startRow, 3).alignment = { horizontal: 'left' };
            ws.getCell(startRow, 4).alignment = { horizontal: 'left' };
            startRow++;
          });

          startRow++; // Add spacing between dumpster types
        });
        const singleMonthTotalTons = Number(
          (monthGraph.data?.total_tons || 0).toFixed(2),
        );
        const singleMonthTotalMoved = monthGraph.data?.total_moved || 0;
        ws.getCell(startRow, 1).value = 'Totals';
        ws.getCell(startRow, 1).font = boldFont;
        ws.getCell(startRow, 2).value = singleMonthTotalTons;
        ws.getCell(startRow, 3).value = singleMonthTotalMoved;
        ws.getCell(startRow, 4).value = '';
        ws.getCell(startRow, 1).alignment = { horizontal: 'left' };
        ws.getCell(startRow, 2).alignment = { horizontal: 'left' };
        ws.getCell(startRow, 3).alignment = { horizontal: 'left' };
        ws.getCell(startRow, 4).alignment = { horizontal: 'left' };
        startRow += 2; // Add spacing
      }
    }

    // Apply black border around the entire report
    const lastRow = startRow - 1; // Last row with content
    this.applyReportBorder(ws, lastRow, 'L');
  }

  /**
   * Generate Dashboard CSV report
   */
  private generateDashboardCSV(
    reportData: any,
    outputPath: string,
    monthName?: string,
    rangeMonths?: Array<{
      monthName: string;
      startDate: string;
      endDate: string;
    }>,
  ): Promise<{ filename: string; path: string }> {
    return new Promise((resolve, reject) => {
      try {
        const stats = reportData.treeStats || {};
        const wasteStreamDataByMonth = reportData.wasteStreamDataByMonth || [];

        // Create CSV content
        const csvRows: string[] = [];

        // Header
        csvRows.push('DASHBOARD REPORT');
        csvRows.push(`Report Period,${monthName || 'Current Period'}`);
        csvRows.push(','); // Empty line

        // Wood Waste Diversion Section
        csvRows.push('WOOD WASTE DIVERSION');
        csvRows.push('Metric,Value');
        csvRows.push(`Wood Waste,${stats.wood_waste || 0} tn`);
        csvRows.push(
          `Biomass for Clean Energy,${stats.biomass_clean_energy || 0} tn`,
        );
        csvRows.push(`Clean Energy,${stats.clean_energy || 0} MWh`);
        csvRows.push(`Remanufacturing,${stats.remanufacturing || 0} tn`);
        csvRows.push(`Industrial Product,${stats.industrial_product || 0} tn`);
        csvRows.push(`Landfill,${stats.landfill || 0} tn`);
        csvRows.push(','); // Empty line

        // Key Metrics
        csvRows.push('KEY METRICS');
        // Old metrics (commented out)
        // csvRows.push(`Total diverted,${stats.total_diverted || 0} tn`);
        csvRows.push(`Total CO2e diverted,${stats.total_co2_diverted || 0} tn`);
        // csvRows.push(`Client diversion goal,${stats.client_diversion_goal || 0}%`);
        // csvRows.push(`Chuck result,${stats.chuck_result || 0}%`);
        // New metrics
        csvRows.push(`Transport CO2,${stats.transport_co2 || 0} tn`);
        csvRows.push(`% diverted,${stats.diverted_percentage || 0}%`);
        csvRows.push(`Clean energy,${stats.clean_energy || 0} MWh`);
        csvRows.push(`net CO2 avoided,${stats.net_co2_avoided || 0} tn`);
        csvRows.push(','); // Empty line

        // Other Waste Streams
        csvRows.push('WASTE STREAMS');
        csvRows.push('Waste Stream,Tons,Transport CO2,Recycling Rebates');
        csvRows.push(
          `Card Board,${stats.card_board?.delivered || 0} tn,${stats.card_board?.transport_co2 || 0} tn,$0`,
        );
        csvRows.push(
          `Waste Hauling,${stats.waste_hauling?.delivered || 0} tn,${stats.waste_hauling?.transport_co2 || 0} tn`,
        );
        csvRows.push(
          `Metal,${stats.metal?.delivered || 0} tn,${stats.metal?.transport_co2 || 0} tn`,
        );
        csvRows.push(
          `Plastic,${stats.plastic?.delivered || 0} tn,${stats.plastic?.transport_co2 || 0} tn`,
        );
        csvRows.push(
          `Concrete,${stats.concrete?.delivered || 0} tn,${stats.concrete?.transport_co2 || 0} tn`,
        );
        csvRows.push(','); // Empty line

        // Collected vs Diverted
        csvRows.push(
          `Wood Waste Collected,${stats.wood_waste_collected || 0} tn`,
        );
        csvRows.push(
          `Wood Waste Diverted,${stats.total_waste_diversion || 0} tn`,
        );
        csvRows.push(
          `Wood Waste Diversion,${stats.wood_waste_diverted || 100}%`,
        );
        csvRows.push(
          `Total Waste Diversion,${stats.total_wood_waste_diversion || 100}%`,
        );
        csvRows.push(','); // Empty line

        // Client Waste Streams (if available)
        const roleId = reportData.role?.id ?? reportData.role;
        const isAdmin = roleId === RoleEnum.admin || roleId === RoleEnum.cms;
        csvRows.push(
          isAdmin ? 'CLIENT WASTE STREAMS' : 'JOB SITE WASTE STREAMS',
        );

        // If rangeMonths is provided, render month-wise waste streams
        if (rangeMonths && rangeMonths.length > 0) {
          const monthReportDataList =
            (reportData as any).monthReportDataList || [];

          rangeMonths.forEach((monthPlan, monthIndex) => {
            // Month name header
            csvRows.push(`${monthPlan.monthName}`);
            csvRows.push('Client,Waste Stream,Tons,Vessels,Vessel Size');

            // Get month-specific waste stream data
            const monthData =
              monthReportDataList && monthReportDataList[monthIndex]
                ? monthReportDataList[monthIndex]
                : reportData;
            const monthWasteStreams = monthData.wasteStreamDataByMonth || [];

            if (monthWasteStreams.length > 0) {
              monthWasteStreams.forEach((stream: any) => {
                const clientName = isAdmin
                  ? stream.clientName || 'Unknown Client'
                  : stream.jobsiteName || 'Unknown Job Site';
                if (stream.data && Array.isArray(stream.data)) {
                  // Group data by name and dumpster_weight
                  const groupedData = new Map<
                    string,
                    {
                      tons: number;
                      moved: number;
                      dumpsterWeight: string;
                    }
                  >();

                  stream.data.forEach((item: any) => {
                    const itemName = item.name || 'Unknown';
                    const dumpsterWeight = item.dumpster_weight || 'Unknown';
                    const key = `${itemName}|${dumpsterWeight}`;

                    if (groupedData.has(key)) {
                      const existing = groupedData.get(key)!;
                      existing.tons += item.tons || 0;
                      existing.moved += item.moved || 0;
                    } else {
                      groupedData.set(key, {
                        tons: item.tons || 0,
                        moved: item.moved || 0,
                        dumpsterWeight: dumpsterWeight,
                      });
                    }
                  });

                  // Add grouped data to CSV rows
                  groupedData.forEach((data, key) => {
                    const [itemName] = key.split('|');
                    csvRows.push(
                      `${clientName},${itemName},${data.tons},${data.moved},${data.dumpsterWeight}`,
                    );
                  });
                }
              });
            } else {
              csvRows.push(`No waste streams found for ${monthPlan.monthName}`);
            }
            csvRows.push(','); // Empty line between months
          });
        } else {
          // Original behavior - render cumulative waste streams
          csvRows.push('Client,Waste Stream,Tons,Vessels,Vessel Size');

          if (wasteStreamDataByMonth.length > 0) {
            wasteStreamDataByMonth.forEach((stream: any) => {
              const clientName = isAdmin
                ? stream.clientName || 'Unknown Client'
                : stream.jobsiteName || 'Unknown Job Site';
              if (stream.data && Array.isArray(stream.data)) {
                // Group data by name and dumpster_weight
                const groupedData = new Map<
                  string,
                  {
                    tons: number;
                    moved: number;
                    dumpsterWeight: string;
                  }
                >();

                stream.data.forEach((item: any) => {
                  const itemName = item.name || 'Unknown';
                  const dumpsterWeight = item.dumpster_weight || 'Unknown';
                  const key = `${itemName}|${dumpsterWeight}`;

                  if (groupedData.has(key)) {
                    const existing = groupedData.get(key)!;
                    existing.tons += item.tons || 0;
                    existing.moved += item.moved || 0;
                  } else {
                    groupedData.set(key, {
                      tons: item.tons || 0,
                      moved: item.moved || 0,
                      dumpsterWeight: dumpsterWeight,
                    });
                  }
                });

                // Add grouped data to CSV rows
                groupedData.forEach((data, key) => {
                  const [itemName] = key.split('|');
                  csvRows.push(
                    `${clientName},${itemName},${data.tons},${data.moved},${data.dumpsterWeight}`,
                  );
                });
              }
            });
          }
        }

        // Create filename
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${monthName || timestamp}.csv`;
        const fullPath = path.join(outputPath, filename);

        // Write CSV file
        const csvContent = csvRows.join('\n');
        fs.writeFileSync(fullPath, csvContent, 'utf8');

        resolve({ filename, path: fullPath });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Job Site CSV report
   */
  private generateJobSiteCSV(
    reportData: any,
    outputPath: string,
    monthName?: string,
    jobSiteName?: string,
    rangeMonths?: Array<{
      monthName: string;
      startDate: string;
      endDate: string;
    }>,
  ): Promise<{ filename: string; path: string }> {
    return new Promise((resolve, reject) => {
      try {
        const stats = reportData.treeStats || {};
        const jobSiteWasteStreams =
          reportData.barGraph?.jobSitesWasteStreams || [];
        const monthGraph = reportData.monthGraph || {};

        // Create CSV content
        const csvRows: string[] = [];

        // Header
        csvRows.push('JOBSITE REPORT');
        csvRows.push(`Job Site: ${jobSiteName || 'Unknown'}`);
        csvRows.push(`Client: ${reportData.jobSite?.clientName || 'Unknown'}`);
        csvRows.push(`Report Period,${monthName || 'Current Period'}`);
        csvRows.push(','); // Empty line

        // Job Site Details
        csvRows.push('JOB SITE DETAILS');
        csvRows.push('Field,Value');
        csvRows.push(
          `Address,${this.formatAddress(reportData.jobSite?.address)}`,
        );
        csvRows.push(`Phone,${reportData.jobSite?.phone || 'N/A'}`);
        csvRows.push(`Email,${reportData.jobSite?.email || 'N/A'}`);
        csvRows.push(
          `Completion By,${reportData.jobSite?.completionBy || 'N/A'}`,
        );
        csvRows.push(`Size,${reportData.jobSite?.size || 'N/A'}`);
        csvRows.push(
          `Sustainability Goal,${reportData.jobSite?.sustainabilityGoal || 0}%`,
        );
        csvRows.push(','); // Empty line

        // Wood Waste Diversion Section
        csvRows.push('WOOD WASTE DIVERSION');
        csvRows.push('Metric,Value');
        csvRows.push(`Wood Waste,${stats.wood_waste || 0} tn`);
        csvRows.push(
          `Biomass for Clean Energy,${stats.biomass_clean_energy || 0} tn`,
        );
        csvRows.push(`Clean Energy,${stats.clean_energy || 0} MWh`);
        csvRows.push(`Remanufacturing,${stats.remanufacturing || 0} tn`);
        csvRows.push(`Industrial Product,${stats.industrial_product || 0} tn`);
        csvRows.push(`Landfill,${stats.landfill || 0} tn`);
        csvRows.push(','); // Empty line

        // Key Metrics
        csvRows.push('KEY METRICS');
        // Old metrics (commented out)
        // csvRows.push(`Total diverted,${stats.total_diverted || 0} tn`);
        csvRows.push(`Total CO2e diverted,${this.roundTo3Decimals(stats.total_co2_diverted || 0)} tn`);
        // csvRows.push(`Client diversion goal,${stats.client_diversion_goal || 0}%`);
        // csvRows.push(`Chuck result,${stats.chuck_result || 0}%`);
        // New metrics
        csvRows.push(`Transport CO2,${this.roundTo3Decimals(stats.transport_co2 || 0)} tn`);
        csvRows.push(`% diverted,${stats.diverted_percentage || 0}%`);
        csvRows.push(`Clean energy,${stats.clean_energy || 0} MWh`);
        csvRows.push(`net CO2 avoided,${this.roundTo3Decimals(stats.net_co2_avoided || 0)} tn`);
        csvRows.push(','); // Empty line

        // Other Waste Streams
        csvRows.push('WASTE STREAMS');
        csvRows.push('Waste Stream,Tons,Transport CO2,Recycling Rebates');
        csvRows.push(
          `Card Board,${stats.card_board?.delivered || 0} tn,${this.roundTo3Decimals(stats.card_board?.transport_co2 || 0)} tn transport CO2,$0`,
        );
        csvRows.push(
          `Waste Hauling,${stats.waste_hauling?.delivered || 0} tn,${this.roundTo3Decimals(stats.waste_hauling?.transport_co2 || 0)} tn transport CO2`,
        );
        csvRows.push(
          `Metal,${stats.metal?.delivered || 0} tn,${this.roundTo3Decimals(stats.metal?.transport_co2 || 0)} tn transport CO2`,
        );
        csvRows.push(
          `Plastic,${stats.plastic?.delivered || 0} tn,${this.roundTo3Decimals(stats.plastic?.transport_co2 || 0)} tn transport CO2`,
        );
        csvRows.push(
          `Concrete,${stats.concrete?.delivered || 0} tn,${this.roundTo3Decimals(stats.concrete?.transport_co2 || 0)} tn transport CO2`,
        );
        csvRows.push(','); // Empty line

        // Vessel Overview (cumulative only)
        csvRows.push('VESSEL OVERVIEW');
        {
          // Original behavior - render cumulative vessel overview
          csvRows.push(
            'Waste Stream,Tons,Vessels,Carbon Credits,Recycling Rebates',
          );

          // Calculate totals and group by waste stream type
          let totalVessels = 0;
          let totalTons = 0;
          const groupedByVessel = new Map<
            string,
            Map<string, { vessels: number; tons: number }>
          >();

          jobSiteWasteStreams.forEach((stream: any) => {
            const vessels = stream.moved || 0;
            const tons = stream.tons || 0;
            totalVessels += vessels;
            totalTons += tons;

            const vesselLabel =
              stream.dumpster_type && stream.dumpster_weight
                ? `${stream.dumpster_type} ${stream.dumpster_weight}`
                : stream.wasteStream?.name || 'Unknown';
            const streamName = stream.wasteStream?.name || 'Unknown';
            if (!groupedByVessel.has(vesselLabel)) {
              groupedByVessel.set(vesselLabel, new Map());
            }
            const vesselMap = groupedByVessel.get(vesselLabel)!;
            if (vesselMap.has(streamName)) {
              const existing = vesselMap.get(streamName)!;
              existing.vessels += vessels;
              existing.tons += tons;
            } else {
              vesselMap.set(streamName, {
                vessels: vessels,
                tons: tons,
              });
            }
          });

          groupedByVessel.forEach((wasteStreams, vesselLabel) => {
            csvRows.push(vesselLabel);
            wasteStreams.forEach((data, streamName) => {
              csvRows.push(
                `${streamName},${data.tons.toFixed(1)} tn,${data.vessels},0 tn,$0`,
              );
            });
            csvRows.push(','); // spacer between vessel groups
          });

          csvRows.push(
            `Totals,${totalTons.toFixed(1)} tn,${totalVessels},0 tn,$0`,
          );
          csvRows.push(','); // Empty line
        }

        // Monthly Reports (render month-wise when rangeMonths provided)
        const monthReportDataList =
          (reportData as any).monthReportDataList || [];
        if (rangeMonths && rangeMonths.length > 0) {
          csvRows.push('MONTHLY REPORTS');
          for (let i = 0; i < rangeMonths.length; i++) {
            const monthPlan = rangeMonths[i];
            const md =
              monthReportDataList && monthReportDataList[i]
                ? monthReportDataList[i]
                : reportData;
            const mg = md.monthGraph || {};
            csvRows.push(`${monthPlan.monthName}`);
            csvRows.push('Waste Stream,Vessels,Tons');
            if (
              mg &&
              mg.data?.jobSitesWasteStreams &&
              Array.isArray(mg.data?.jobSitesWasteStreams)
            ) {
              const groupedByDumpster = new Map<
                string,
                {
                  wasteStreams: Map<string, { moved: number; tons: number }>;
                }
              >();
              mg.data.jobSitesWasteStreams.forEach((stream: any) => {
                const streamName = stream.wasteStream?.name || 'Unknown';
                const dumpsterType = stream.dumpster_type || 'Unknown';
                const dumpsterWeight = stream.dumpster_weight || 'Unknown';
                const dumpsterKey = `${dumpsterType} ${dumpsterWeight}`;
                if (!groupedByDumpster.has(dumpsterKey)) {
                  groupedByDumpster.set(dumpsterKey, {
                    wasteStreams: new Map(),
                  });
                }
                const dumpsterData = groupedByDumpster.get(dumpsterKey)!;
                if (dumpsterData.wasteStreams.has(streamName)) {
                  const existing = dumpsterData.wasteStreams.get(streamName)!;
                  existing.moved += stream.moved || 0;
                  existing.tons += stream.tons || 0;
                } else {
                  dumpsterData.wasteStreams.set(streamName, {
                    moved: stream.moved || 0,
                    tons: stream.tons || 0,
                  });
                }
              });
              groupedByDumpster.forEach((dumpsterData, dumpsterKey) => {
                csvRows.push(`${dumpsterKey}`);
                dumpsterData.wasteStreams.forEach((data, streamName) => {
                  csvRows.push(
                    `${streamName},${data.moved},${data.tons.toFixed(1)}`,
                  );
                });
                csvRows.push(',');
              });
              const monthlyTotalTons = (mg.data?.total_tons || 0).toFixed(1);
              const monthlyTotalMoved = mg.data?.total_moved || 0;
              csvRows.push(`Totals,${monthlyTotalMoved},${monthlyTotalTons}`);
              csvRows.push(',');
            } else {
              csvRows.push(`No monthly data for ${monthPlan.monthName}`);
            }
            csvRows.push(',');
          }
        } else if (monthGraph && Object.keys(monthGraph).length > 0) {
          csvRows.push('MONTHLY REPORTS');
          csvRows.push('Waste Stream,Vessels,Tons');

          // Process jobSitesWasteStreams from monthgraph data
          if (
            monthGraph.data?.jobSitesWasteStreams &&
            Array.isArray(monthGraph.data?.jobSitesWasteStreams)
          ) {
            // Group data by dumpster type + weight first
            const groupedByDumpster = new Map<
              string,
              {
                wasteStreams: Map<string, { moved: number; tons: number }>;
              }
            >();

            monthGraph.data?.jobSitesWasteStreams.forEach((stream: any) => {
              const streamName = stream.wasteStream?.name || 'Unknown';
              const dumpsterType = stream.dumpster_type || 'Unknown';
              const dumpsterWeight = stream.dumpster_weight || 'Unknown';
              const dumpsterKey = `${dumpsterType} ${dumpsterWeight}`;

              if (!groupedByDumpster.has(dumpsterKey)) {
                groupedByDumpster.set(dumpsterKey, {
                  wasteStreams: new Map(),
                });
              }

              const dumpsterData = groupedByDumpster.get(dumpsterKey)!;
              if (dumpsterData.wasteStreams.has(streamName)) {
                const existing = dumpsterData.wasteStreams.get(streamName)!;
                existing.moved += stream.moved || 0;
                existing.tons += stream.tons || 0;
              } else {
                dumpsterData.wasteStreams.set(streamName, {
                  moved: stream.moved || 0,
                  tons: stream.tons || 0,
                });
              }
            });

            // Add grouped data to CSV rows
            groupedByDumpster.forEach((dumpsterData, dumpsterKey) => {
              // Add dumpster type + weight as header
              csvRows.push(`${dumpsterKey}`);

              // Add waste streams under this dumpster
              dumpsterData.wasteStreams.forEach((data, streamName) => {
                csvRows.push(
                  `${streamName},${data.moved},${data.tons.toFixed(1)}`,
                );
              });

              csvRows.push(','); // Empty line between dumpster types
            });
          }

          // Add summary row for the month
          const singleMonthTotalTons = (monthGraph.total_tons || 0).toFixed(1);
          const singleMonthTotalMoved = monthGraph.total_moved || 0;
          csvRows.push(
            `Totals,${singleMonthTotalMoved},${singleMonthTotalTons}`,
          );
          csvRows.push(`DIVERSION RATE,${monthGraph.waste_diversion || 0}%`);

          csvRows.push(','); // Empty line
        }

        // Waste Stream Images section (from wasteStreamImagesMap populated by the consumer)
        const imagesMap: Record<number, any[]> =
          reportData.wasteStreamImagesMap || {};
        const imageEntries = Object.entries(imagesMap).filter(
          ([, imgs]) => (imgs as any[]).length > 0,
        );
        if (imageEntries.length > 0) {
          csvRows.push('WASTE STREAM IMAGES');
          csvRows.push(
            'Waste Stream ID,Waste Stream,Image #,Image URL,AI Verified,Confidence Score (%)',
          );
          imageEntries.forEach(([wsId, imgs]) => {
            const latestImgs = (imgs as any[]).filter((img) => img.isLatest);
            latestImgs.forEach((img, i) => {
              const streamName =
                jobSiteWasteStreams.find(
                  (s: any) => String(s.id) === String(wsId),
                )?.wasteStream?.name || wsId;
              const displayConf =
                img.adminConfidenceOverride ?? img.aiConfidenceLevel ?? '';
              const verified =
                img.aiStatus === 'complete'
                  ? img.aiVerified
                    ? 'Yes'
                    : 'No'
                  : img.aiStatus;
              csvRows.push(
                `${wsId},"${streamName}",${i + 1},"${img.file?.path || ''}","${verified}","${displayConf}"`,
              );
            });
          });
          csvRows.push(',');
        }

        // Create filename
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${monthName || timestamp}.csv`;
        const fullPath = path.join(outputPath, filename);

        // Write CSV file
        const csvContent = csvRows.join('\n');
        fs.writeFileSync(fullPath, csvContent, 'utf8');

        resolve({ filename, path: fullPath });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Export data to CSV format
   */
  private async exportToCSV(
    reportData: any,
    outputPath: string,
    reportType: 'job-site' | 'dashboard',
    monthName?: string,
    jobSiteName?: string,
    rangeMonths?: Array<{
      monthName: string;
      startDate: string;
      endDate: string;
    }>,
  ): Promise<
    | { filename: string; path: string }
    | Array<{ filename: string; path: string }>
  > {
    // Single CSV file - original behavior (rangeMonths will be handled in generateDashboardCSV/generateJobSiteCSV)
    if (reportType === 'dashboard') {
      return this.generateDashboardCSV(
        reportData,
        outputPath,
        monthName,
        rangeMonths,
      );
    } else {
      return this.generateJobSiteCSV(
        reportData,
        outputPath,
        monthName,
        jobSiteName,
        rangeMonths,
      );
    }
  }

  /**
   * Prepare summary data for export
   */
  private prepareSummaryData(
    reportData: any,
  ): Array<{ Metric: string; Value: any }> {
    const summary: Array<{ Metric: string; Value: any }> = [];

    if (reportData.treeStats) {
      summary.push({
        Metric: 'Total Wood Waste (tons)',
        Value: reportData.treeStats.wood_waste || 0,
      });
      summary.push({
        Metric: 'Total Diverted (tons)',
        Value: reportData.treeStats.total_diverted || 0,
      });
      summary.push({
        Metric: 'Waste Diversion (%)',
        Value: reportData.treeStats.wood_waste_diverted || 0,
      });
      summary.push({
        Metric: 'CO2 Avoided (tons)',
        Value: reportData.treeStats.total_co2_diverted || 0,
      });
    }

    if (reportData.barGraph) {
      summary.push({
        Metric: 'Total Moved',
        Value: reportData.barGraph.total_moved || 0,
      });
      summary.push({
        Metric: 'Total Tons',
        Value: reportData.barGraph.total_tons || 0,
      });
      summary.push({
        Metric: 'Tons Diverted',
        Value: reportData.barGraph.tons_diverted || 0,
      });
      summary.push({
        Metric: 'Waste Diversion Rate (%)',
        Value: reportData.barGraph.waste_diversion || 0,
      });
    }

    return summary;
  }

  /**
   * Prepare detailed data for export
   */
  private prepareDetailedData(
    reportData: any,
  ): Array<{ Category: string; Field: string; Value: any }> {
    const detailed: Array<{ Category: string; Field: string; Value: any }> = [];

    // Add job site information if available
    if (reportData.jobSite) {
      detailed.push({
        Category: 'Job Site Information',
        Field: 'Job Site Name',
        Value: reportData.jobSite.title || 'N/A',
      });
      detailed.push({
        Category: 'Job Site Information',
        Field: 'Client Name',
        Value: reportData.jobSite.clientName || 'N/A',
      });
      detailed.push({
        Category: 'Job Site Information',
        Field: 'Address',
        Value: this.formatAddress(reportData.jobSite.address),
      });
    }

    // Add tree stats details
    if (reportData.treeStats) {
      Object.entries(reportData.treeStats).forEach(([key, value]) => {
        if (typeof value === 'number' || typeof value === 'string') {
          detailed.push({
            Category: 'Tree Statistics',
            Field: key
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase()),
            Value: value,
          });
        }
      });
    }

    return detailed;
  }

  /**
   * Prepare waste streams data for export
   */
  private prepareWasteStreamsData(
    reportData: any,
  ): Array<{ [key: string]: any }> {
    const wasteStreams: Array<{ [key: string]: any }> = [];

    if (reportData.barGraph?.jobSitesWasteStreams) {
      reportData.barGraph.jobSitesWasteStreams.forEach(
        (stream: any, index: number) => {
          wasteStreams.push({
            'Waste Stream':
              stream.wasteStreamType?.name || `Stream ${index + 1}`,
            'Total Moved': stream.total_moved || 0,
            'Total Tons': stream.total_tons || 0,
            'Tons Diverted': stream.tons_diverted || 0,
            'Diversion Rate (%)': stream.waste_diversion || 0,
          });
        },
      );
    }

    return wasteStreams;
  }

  /**
   * Prepare CSV data
   */
  private prepareCSVData(reportData: any): string {
    const summaryData = this.prepareSummaryData(reportData);
    const detailedData = this.prepareDetailedData(reportData);

    let csv = 'Report Summary\n';
    csv += 'Metric,Value\n';
    summaryData.forEach((row) => {
      csv += `"${row.Metric}","${row.Value}"\n`;
    });

    csv += '\nDetailed Information\n';
    csv += 'Category,Field,Value\n';
    detailedData.forEach((row) => {
      csv += `"${row.Category}","${row.Field}","${row.Value}"\n`;
    });

    if (reportData.barGraph?.jobSitesWasteStreams) {
      csv += '\nWaste Streams\n';
      csv +=
        'Waste Stream,Total Moved,Total Tons,Tons Diverted,Diversion Rate (%)\n';
      reportData.barGraph.jobSitesWasteStreams.forEach(
        (stream: any, index: number) => {
          csv += `"${stream.wasteStreamType?.name || `Stream ${index + 1}`}","${
            stream.total_moved || 0
          }","${stream.total_tons || 0}","${stream.tons_diverted || 0}","${
            stream.waste_diversion || 0
          }"\n`;
        },
      );
    }

    return csv;
  }

  /**
   * Generate filename based on report type and format
   */
  /**
   * Sanitize sheet name for Excel (max 31 chars, no special chars)
   */
  private sanitizeSheetName(name: string): string {
    // Excel sheet names can be max 31 characters and cannot contain: \ / ? * [ ]
    let sanitized = name.replace(/[\\/:?*\[\]]/g, '').substring(0, 31);
    // Ensure it's not empty
    if (!sanitized || sanitized.trim().length === 0) {
      sanitized = 'Sheet';
    }
    return sanitized;
  }

  private generateFilename(extension: string, monthName?: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${monthName || timestamp}.${extension}`;
  }
}
