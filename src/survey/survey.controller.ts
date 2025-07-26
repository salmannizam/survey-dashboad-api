import { Controller, Post, Body, Get, Param, Query, UseGuards, Res, BadRequestException } from '@nestjs/common';
import { SurveyService } from './survey.service';
import { AuthGuard } from '../auth/auth.guard';
import { Response } from 'express'

@Controller('survey')
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) { }



  @Post('download-single-image')
  async downloadSingle(
    @Body('projectId') projectId: string,
    @Body('file') file: string,
    @Res() res: Response,
  ) {
    if (!projectId) throw new BadRequestException('projectId is required');
    await this.surveyService.downloadSingleImage(projectId, file, res);
  }

  @Post('download-zip-image')
  async downloadZip(
    @Body('projectId') projectId: string,
    @Body('files') files: string[],
    @Res() res: Response,
  ) {
    if (!projectId) throw new BadRequestException('projectId is required');
    await this.surveyService.downloadImagesZip(projectId, files, res);
  }

  @Get('pivot-data')
  @UseGuards(AuthGuard)
  async getPivotData(
    @Query('OutletNameInput') outletNameInput: string,
    @Query('FromDate') fromDate: string,
    @Query('ToDate') toDate: string,
    @Query('Brand') brand: string,
    @Query('Location') location: string,
    @Query('State') state: string,
    @Query('defect_type') defectType: string,
    @Query('BatchNumber') batchNumber: string,
  ) {
    return this.surveyService.getPivotSurveyData({
      outletNameInput,
      fromDate,
      toDate,
      brand,
      location,
      state,
      defect_type: defectType,
      batchNumber,
    });
  }

  @Post('export-excel')
  @UseGuards(AuthGuard)
  async exportExcel(
    @Body() body: any,
    @Res() res: Response
  ) {
    // body should have fromDate, toDate, and other filters as in your frontend
    if (!body.fromDate || !body.toDate) {
      throw new BadRequestException('fromDate and toDate are required');
    }
    return this.surveyService.exportSurveyExcel(body, res);
  }
}
