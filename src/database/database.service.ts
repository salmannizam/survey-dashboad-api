import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';

@Injectable()
export class DatabaseService {
  private poolPromise: Promise<sql.ConnectionPool>;

  constructor() {
    // Create a pool and keep it open for reuse
this.poolPromise = sql.connect({
  user: process.env.DBUSER,
  password: process.env.DBPASS,
  server: process.env.DBSERVER,
  database: process.env.DBNAME,
  requestTimeout: 60000,          // <- important fix
  connectionTimeout: 30000,       // <- extra safe
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
});
  }
  // Define a method to execute a query with parameters
  async query(sqlQuery: string, parameters: any[]) {
    try {
      const pool = await this.poolPromise;
      // Dynamically add parameters to the request
      const request = pool.request();

      // Add each parameter to the request, determining the type dynamically
      parameters.forEach((param: { name: string, value: any }) => {
        let sqlType;

        // Determine the SQL type based on the JavaScript value type
        if (typeof param.value === 'string') {
          sqlType = sql.NVarChar;
        } else if (typeof param.value === 'number') {
          sqlType = sql.Int; // or use sql.Float, sql.Decimal depending on the number type
        } else if (param.value instanceof Date) {
          sqlType = sql.DateTime;
        } else if (typeof param.value === 'boolean') {
          sqlType = sql.Bit;
        } else {
          sqlType = sql.NVarChar; // Default type, can be adjusted based on your needs
        }

        // Add the parameter to the request
        request.input(param.name, sqlType, param.value);
      });

      // Execute the query
      const result = await request.query(sqlQuery);

      return result.recordset;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }


  // Define a method to get all table names
  async getTableNames() {
    try {
      const pool = await this.poolPromise;
      const tablesResult = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
      `);
      return tablesResult.recordset.map((row: { TABLE_NAME: string }) => row.TABLE_NAME);
    } catch (error) {
      console.error('Error fetching table names:', error);
      throw error;
    }
  }

  // Define a method to get columns of a specific table
  async getTableColumns(tableName: string) {
    try {
      const pool = await this.poolPromise;
      const columnsResult = await pool.request()
        .input('tableName', sql.NVarChar, tableName)
        .query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = @tableName
        `);
      return columnsResult.recordset.map((row: { COLUMN_NAME: string }) => row.COLUMN_NAME);
    } catch (error) {
      console.error('Error fetching columns:', error);
      throw error;
    }
  }

  // Define a method to get all stored procedures
  async getStoredProcedures() {
    try {
      const pool = await this.poolPromise;
      const proceduresResult = await pool.request().query(`
        SELECT ROUTINE_NAME
        FROM INFORMATION_SCHEMA.ROUTINES
        WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_CATALOG = 'survey'
      `);
      return proceduresResult.recordset.map((row: { ROUTINE_NAME: string }) => row.ROUTINE_NAME);
    } catch (error) {
      console.error('Error fetching stored procedures:', error);
      throw error;
    }
  }

  // Define a method to get details of a specific stored procedure
  async getProcedureDetails(procedureName: string) {
    try {
      const pool = await this.poolPromise;

      // Get procedure definition (SQL code)
      const definitionResult = await pool.request()
        .input('procedureName', sql.NVarChar, procedureName)
        .query(`
          SELECT OBJECT_DEFINITION(OBJECT_ID(@procedureName)) AS ProcedureDefinition
        `);

      const procedureDefinition = definitionResult.recordset[0]?.ProcedureDefinition;

      if (!procedureDefinition) {
        throw new Error(`Procedure ${procedureName} not found`);
      }

      // Get procedure parameters
      const parametersResult = await pool.request()
        .input('procedureName', sql.NVarChar, procedureName)
        .query(`
          SELECT 
            PARAMETER_NAME, 
            DATA_TYPE, 
            CHARACTER_MAXIMUM_LENGTH, 
            NUMERIC_PRECISION, 
            NUMERIC_SCALE
          FROM INFORMATION_SCHEMA.PARAMETERS
          WHERE SPECIFIC_NAME = @procedureName
        `);

      const parameters = parametersResult.recordset;

      return {
        procedureDefinition,
        parameters,
      };
    } catch (error) {
      console.error('Error fetching procedure details:', error);
      throw error;
    }
  }
}
