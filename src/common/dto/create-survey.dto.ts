// src/survey/dto/create-survey.dto.ts
import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateSurveyDto {
  @IsString()
  readonly name: string;  // Name of the survey

  @IsString()
  readonly description: string;  // Description of the survey

  @IsArray()
  @IsOptional()  // Optional: you can have an array of questions as part of survey creation
  readonly questions: string[];
}
