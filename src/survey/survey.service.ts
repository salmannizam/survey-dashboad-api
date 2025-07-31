import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as sql from 'mssql';  // Ensure 'mssql' is imported
import * as ftp from 'basic-ftp';
import * as sharp from 'sharp';
import { BlobServiceClient } from '@azure/storage-blob';
import * as archiver from 'archiver';
import { Response } from 'express'
import { Readable } from 'stream';
import * as ExcelJS from 'exceljs';

@Injectable()
export class SurveyService {
  constructor(private databaseService: DatabaseService) { }

  private readonly AZURE_CONNECTION_STRING = process.env.AZURE_BUCKET_KEY;
  private readonly CONTAINER_NAME = 'survey'; // Replace if needed


  private convertISTtoUTCString(istDateStr: string): string {
    if (!istDateStr) return '';

    // Assume istDateStr is in "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss" format (IST)
    const [datePart, timePart] = istDateStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour = 0, minute = 0, second = 0] = (timePart || '').split(':').map(Number);

    // Construct IST date (UTC + 5:30)
    const istDate = new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30, second));
    return istDate.toISOString().slice(0, 19).replace('T', ' ');
  }


  async getPivotSurveyData(params: {
    outletNameInput?: string;
    fromDate?: string;
    toDate?: string;
    brand?: string;
    location?: string;
    state?: string;
    defect_type?: string;
    batchNumber?: string;
  }) {

    const fromDateUTC = params.fromDate ? this.convertISTtoUTCString(params.fromDate) : '';
    const toDateUTC = params.toDate ? this.convertISTtoUTCString(params.toDate) : '';


    const query = `
    EXEC [dbo].[PivotSurveyAnswersByQuestion1]
      @OutletNameInput = @OutletNameInput,
      @FromDate = @FromDate,
      @ToDate = @ToDate,
      @Brand = @Brand,
      @Location = @Location,
      @State = @State,
      @defect_type = @defect_type,
      @BatchNumber = @BatchNumber
  `;

    const queryParams = [
      { name: 'OutletNameInput', type: sql.NVarChar(100), value: params.outletNameInput || null },
      { name: 'FromDate', type: sql.NVarChar(50), value: params.fromDate },
      { name: 'ToDate', type: sql.NVarChar(50), value: params.toDate },
      { name: 'Brand', type: sql.NVarChar(100), value: params.brand || null },
      { name: 'Location', type: sql.NVarChar(100), value: params.location || null },
      { name: 'State', type: sql.NVarChar(100), value: params.state || null },
      { name: 'defect_type', type: sql.NVarChar(100), value: params.defect_type || null },
      { name: 'BatchNumber', type: sql.NVarChar(100), value: params.batchNumber || null },
    ];

    try {
      // Log input parameters
      console.log('Executing stored procedure [PivotSurveyAnswersByQuestion1] with params:', queryParams);

      const result = await this.databaseService.query(query, queryParams);

      // Log output result
      console.log('Stored procedure result:', JSON.stringify(result, null, 2));

      return result;
    } catch (error) {
      console.error('Error executing stored procedure:', error);
      throw error;
    }
  }



  async downloadSingleImage(projectId: string, fileName: string, res: Response): Promise<void> {
    if (!fileName) throw new BadRequestException('File name is required');

    const blobServiceClient = BlobServiceClient.fromConnectionString(this.AZURE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(this.CONTAINER_NAME);

    const fullPath = `${"Dabur2025"}/${fileName.trim()}`;
    const blobClient = containerClient.getBlobClient(fullPath);
    const downloadBlockBlobResponse = await blobClient.download();
    const properties = await blobClient.getProperties();

    res.setHeader('Content-Type', properties.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    downloadBlockBlobResponse.readableStreamBody!.pipe(res);
  }

  async downloadImagesZip(projectId: string, files: string[], res: Response): Promise<void> {
    if (!files || files.length === 0) throw new BadRequestException('Files array cannot be empty');

    const blobServiceClient = BlobServiceClient.fromConnectionString(this.AZURE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(this.CONTAINER_NAME);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="images.zip"');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const fileName of files) {
      try {
        const fullPath = `${"Dabur2025"}/${fileName.trim()}`;
        const blobClient = containerClient.getBlobClient(fullPath);
        const download = await blobClient.download();

        if (!download.readableStreamBody) {
          console.warn(`No stream found for ${fullPath}, skipping`);
          continue;
        }

        archive.append(download.readableStreamBody as Readable, {
          name: fileName,
        });
      } catch (error) {
        console.error(`Failed to append ${fileName} to archive:`, error);
      }
    }

    await archive.finalize();
  }


  // Helper: Convert yyyyDDD (2025011) to YYYY-MM-DD
// Helper: Convert yyyyDDD (e.g. 2025011) to YYYY-MM-DD
private convertDayOfYearToIST(dateStr: string): { formatted: string, istDate: Date } | null {
  if (!dateStr || dateStr.length < 7) return null;

  const year = parseInt(dateStr.substring(0, 4), 10);
  const dayOfYear = parseInt(dateStr.substring(4), 10);
  if (isNaN(year) || isNaN(dayOfYear)) return null;

  // Simple local time logic (same as frontend)
  const date = new Date(year, 0); // Jan 1
  date.setDate(dayOfYear); // Adds day of year

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return {
    formatted: `${mm}-${dd}-${yyyy}`,
    istDate: date
  };
}

  // Helper: Get Freshness days from MFG Date (string)
private getFreshnessDays(mfgDateStr: string): { freshness: string, formattedMfg: string } {
  const converted = this.convertDayOfYearToIST(mfgDateStr);
  if (!converted) return { freshness: 'NA', formattedMfg: 'NA' };

  const { istDate: mfgDate, formatted: formattedMfg } = converted;

  const today = new Date();

  // Set both to midnight to ignore time component
  mfgDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - mfgDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return {
    freshness: diffDays < 0 ? '0' : diffDays.toString(),
    formattedMfg
  };
}


  // Main export function
  async exportSurveyExcel(filters: any, res: Response) {
    // 1. Get data
    const result = await this.getPivotSurveyData({
      outletNameInput: filters.OutletNameInput,
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      brand: filters.Brand,
      location: filters.Location,
      state: filters.State,
      defect_type: filters.defect_type,
      batchNumber: filters.BatchNumber,
    });

    // 2. Excel headers, in your required order
    const headers = [
      "State", "Zone", "Outlet Name", "Location", "Survey Date", "Brand",
      "SKU", "Unit", "Batch No", "MfgDate", "ExpDate", "Sample Checked",
      "VisualDefects", "no_of_defect", "Defect_image", "defect_type",
      "Remarks", "Freshness",'Address'
    ];

    
    // 3. Create workbook/worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Survey Data');
    worksheet.addRow(headers);

    
    worksheet.getColumn(10).numFmt = 'dd-mmm-yyyy';
worksheet.getColumn(11).numFmt = 'dd-mmm-yyyy';
    
    // 4. Add rows in same order
    result.forEach(row => {
      const mfgRaw = row["MFG Date"] || row["MfgDate"];
      const expRaw = row["Exp. Date"];

   const mfgConverted = mfgRaw ? this.convertDayOfYearToIST(mfgRaw) : null;
const expConverted = expRaw ? this.convertDayOfYearToIST(expRaw) : null;

const mfgDate = mfgConverted?.istDate || 'NA';
const expDate = expConverted?.istDate || 'NA';

const freshness = mfgConverted ? this.getFreshnessDays(mfgRaw).freshness : 'NA';

      worksheet.addRow([
        row.State || 'NA',
        row.Zone || 'NA',
        row['Outlet Name'] || 'NA',
        row.Location || 'NA',
        row.StartDate || 'NA',
        row.Brand || 'NA',
        Number(row.SKU || 0) || 'NA',
        row.Unit || 'NA',
        (row['Batch No.'] || row['Batch No1.'])
          ? `${row['Batch No.'] || ''}${row['Batch No1.'] || ''}`
          : 'NA',
        mfgDate,
        expDate,
        row['Sample Checked'] || 'NA',
        row.VisualDefects || 'NA',
        Number(row.no_of_defect || 0) || 'NA',
        row.Defect_image || 'NA',
        row.defect_type || 'NA',
        row.Remarks || 'NA',
        freshness,
        row.Address || 'NA',
        
      ]);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="survey-data-${filters.fromDate}-to-${filters.toDate}.xlsx"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    await workbook.xlsx.write(res);
    res.end();
  }


}
