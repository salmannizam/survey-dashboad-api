
import { Module } from '@nestjs/common';
import { SurveyModule } from './survey/survey.module';
import { DatabaseModule } from './database/database.module';

import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '@nestjs/config'; // Import the ConfigModule
import { AppController } from './app.controller';
import { AppService } from './app.service';
@Module({
  controllers: [AppController],
  imports: [SurveyModule,
    DatabaseModule,
    ConfigModule.forRoot({
      isGlobal: true, // Make the ConfigModule global
    }),

  ],
  providers: [AppService],
})
export class AppModule { }


// host: '40.127.190.1',
// user: 'survey',
// password: 'survey@123',
// database: 'survey',