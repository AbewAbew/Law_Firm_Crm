// src/appointments/dto/update-appointment.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateAppointmentDto } from './create-appointment.dto';

// For updates, we don't want to allow changing the attendees directly
// through this DTO, so we will omit that field.
export class UpdateAppointmentDto extends PartialType(
  // Omit allows us to exclude properties from the base DTO
  CreateAppointmentDto,
) {}