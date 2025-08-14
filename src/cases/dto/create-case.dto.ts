// src/cases/dto/create-case.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsEmail, IsArray } from 'class-validator';

export class CreateCaseDto {
  @IsString()
  @IsNotEmpty()
  caseName: string;

  @IsString()
  @IsOptional()
  caseNumber?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  // Client fields for inline creation
  @IsString()
  @IsOptional()
  clientName?: string;

  @IsEmail()
  @IsOptional()
  clientEmail?: string;

  @IsString()
  @IsOptional()
  clientPhone?: string;

  @IsString()
  @IsOptional()
  clientAddress?: string;

  @IsString()
  @IsOptional()
  clientPassword?: string;

  @IsOptional()
  sendCredentialsEmail?: boolean;

  // Case assignment fields
  @IsArray()
  @IsOptional()
  assignedUserIds?: string[];
}