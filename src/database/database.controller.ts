import { Controller, Get, Param } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller('database')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('tables')
  async getTables() {
    try {
      const tables = await this.databaseService.getTableNames();
      return { tables };
    } catch (error) {
      console.error('Error fetching tables:', error);
      throw error;
    }
  }

  @Get('columns')
  async getColumns() {
    try {
      const columns = await this.databaseService.getTableColumns('users'); // Change 'users' to any other table name
      return { columns };
    } catch (error) {
      console.error('Error fetching columns:', error);
      throw error;
    }
  }

  @Get('procedure')
  async getStoredProcedures() {
    try {
      const procedure = await this.databaseService.getStoredProcedures(); // Change 'users' to any other table name
      return { procedure };
    } catch (error) {
      console.error('Error fetching columns:', error);
      throw error;
    }
  }

  @Get('procedure/:name')
  async getProcedureDetails(@Param('name') name:string) {
    try {
      const procedureDetails = await this.databaseService.getProcedureDetails(name); // Change 'users' to any other table name
      return { procedureDetails };
    } catch (error) {
      console.error('Error fetching columns:', error);
      throw error;
    }
  }

  
}
