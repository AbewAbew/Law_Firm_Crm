// src/appointments/dto/create-appointment.dto.ts
import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: Date;

  @IsDateString()
  @IsNotEmpty()
  endTime: Date;

  @IsArray()
  @IsString({ each: true }) // Validates that each item in the array is a string
  @IsOptional()
  attendeeIds: string[];
}