import { Controller, Get, Param, UseGuards, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
// import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { RoleEnum } from 'src/roles/roles.enum';
import { GetUser } from 'src/utils/user.decorator';
import fs from 'fs';
import { Response } from 'express';
import { ReportExportService } from './report-export.service';
import { safeDeleteFile, safeDeleteFiles } from 'src/utils/file-cleanup.util';

@ApiBearerAuth()
@ApiTags('Report Export')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(
  RoleEnum.admin,
  RoleEnum.general_contractor,
  RoleEnum.power_plant,
  RoleEnum.manufacturer,
  RoleEnum.wood_processing,
  RoleEnum.end_client,
  RoleEnum.cms,
)
@Controller({
  path: 'reports/export',
  version: '1',
})
export class ReportExportController {
  constructor(private readonly reportExportService: ReportExportService) {}

  @Get(':jobId/status')
  @ApiOperation({ summary: 'Get export job status' })
  async getExportStatus(
    @Param('jobId') jobId: string,
    @GetUser() user: any,
    @Res() res: Response,
  ) {
    const status = await this.reportExportService.getExportStatus(
      jobId,
      user.id,
    );
    res.json(status);
  }

  @Get(':jobId/download')
  @ApiOperation({ summary: 'Download archive ZIP for a completed export job' })
  @ApiProduces('application/zip')
  @ApiOkResponse({
    description: 'ZIP file',
    content: {
      'application/zip': { schema: { type: 'string', format: 'binary' } },
    },
  })
  async downloadExport(
    @Param('jobId') jobId: string,
    @GetUser() user: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.reportExportService.getExportZip(
        jobId,
        user.id,
      );
      if (!result || !result.zip || !result.zip.path) {
        res.status(404).json({ message: 'Report not ready' });
        return;
      }
      const { path: filePath, filename } = result.zip;
      const artifacts = result.artifacts || [];
      const stat = fs.statSync(filePath);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename || 'report.zip'}"`,
      );
      res.setHeader('Content-Length', stat.size);
      res.flushHeaders();
      const stream = fs.createReadStream(filePath);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.status(500).end();
        } else {
          try {
            res.end();
          } catch {}
        }
      });
      // Without this, a client disconnecting mid-download makes `res` emit an
      // 'error' with no listener → uncaught 'error' event → process crash.
      res.on('error', () => {
        stream.destroy();
      });
      stream.on('end', async () => {
        // Delete files after download is complete
        try {
          // Delete the outer ZIP file
          await safeDeleteFile(filePath);
          // Delete all artifact files (individual files and inner ZIPs)
          if (artifacts.length > 0) {
            await safeDeleteFiles(artifacts);
          }
        } catch (error) {
          console.error('Error cleaning up files after download:', error);
        }
      });
      stream.pipe(res);
    } catch (e) {
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to download file' });
        return;
      }
      try {
        res.end();
      } catch {}
    }
  }
}
