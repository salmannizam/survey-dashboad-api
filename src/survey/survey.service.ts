import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as sql from 'mssql';  // Ensure 'mssql' is imported
import * as ftp from 'basic-ftp';
import * as sharp from 'sharp';
import { BlobServiceClient } from '@azure/storage-blob';
import * as archiver from 'archiver';
import { Response } from 'express'
import { Readable } from 'stream';


@Injectable()
export class SurveyService {
  constructor(private databaseService: DatabaseService) { }

  private readonly AZURE_CONNECTION_STRING = process.env.AZURE_BUCKET_KEY;
  private readonly CONTAINER_NAME = 'survey'; // Replace if needed

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

    try {
      const result = await this.databaseService.query(query, [
        { name: 'OutletNameInput', type: sql.NVarChar(100), value: params.outletNameInput || null },
        { name: 'FromDate', type: sql.NVarChar(50), value: params.fromDate || '' },
        { name: 'ToDate', type: sql.NVarChar(50), value: params.toDate || '' },
        { name: 'Brand', type: sql.NVarChar(100), value: params.brand || null },
        { name: 'Location', type: sql.NVarChar(100), value: params.location || null },
        { name: 'State', type: sql.NVarChar(100), value: params.state || null },
        { name: 'defect_type', type: sql.NVarChar(100), value: params.defect_type || null },
        { name: 'BatchNumber', type: sql.NVarChar(100), value: params.batchNumber || null },
      ]);

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
  


}
