// src/appointments/appointments.controller.ts

import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
  } from '@nestjs/common';
  import { AppointmentsService } from './appointments.service';
  import { CreateAppointmentDto } from './dto/create-appointment.dto';
  import { UpdateAppointmentDto } from './dto/update-appointment.dto';
  import { AuthGuard } from 'src/auth/guards/auth.guard';
  import { RolesGuard } from 'src/auth/guards/roles.guard';
  import { Roles } from 'src/auth/decorators/roles.decorator';
  import { UserRole, TimeEntryType } from '@prisma/client';
  
  @UseGuards(AuthGuard, RolesGuard)
  @Controller('appointments')
  export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService) {}
  
    // --- Endpoint to CREATE a new appointment ---
    @Post()
    // Only staff members can create appointments
    @Roles(UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL)
    create(
      @Body() createAppointmentDto: CreateAppointmentDto,
      @Request() req, // Get the creator from the JWT
    ) {
      return this.appointmentsService.create(createAppointmentDto, req.user);
    }
  
    // --- Endpoint to GET all appointments for the logged-in user ---
    @Get()
    // Any authenticated user can see their own appointments
    findAllForUser(@Request() req) {
      return this.appointmentsService.findAllForUser(req.user);
    }
  
    // --- Endpoint to GET a single appointment by its ID ---
    @Get(':id')
    // For now, any authenticated user can look up an appointment by ID
    // We could add more specific logic later to ensure they are an attendee
    findOne(@Param('id') id: string) {
      return this.appointmentsService.findOne(id);
    }
  
    // --- Endpoint to UPDATE an appointment ---
    @Patch(':id')
    // Only staff can update appointment details
    @Roles(UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL)
    update(
      @Param('id') id: string,
      @Body() updateAppointmentDto: UpdateAppointmentDto,
    ) {
      return this.appointmentsService.update(id, updateAppointmentDto);
    }
  
    // --- Endpoint to DELETE an appointment ---
    @Delete(':id')
    // Only staff can delete/cancel appointments
    @Roles(UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL)
    remove(@Param('id') id: string) {
      return this.appointmentsService.remove(id);
    }

    @Post(':id/convert-to-time-entry')
    @Roles(UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL)
    convertToTimeEntry(
      @Param('id') id: string,
      @Request() req,
      @Body() data?: {
        description?: string;
        rate?: number;
        type?: TimeEntryType;
      },
    ) {
      return this.appointmentsService.convertToTimeEntry(id, req.user.sub, data);
    }
  }