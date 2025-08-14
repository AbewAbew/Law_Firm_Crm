// src/appointments/appointments.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, UserRole, TimeEntryType, TimeEntryStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

interface AuthenticatedUser {
  userId: string;
  sub: string;
  role: UserRole;
}

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createAppointmentDto: CreateAppointmentDto,
    creator: AuthenticatedUser,
  ) {
    const { attendeeIds, ...appointmentData } = createAppointmentDto;

    // Ensure creator is also included as an attendee
    const creatorId = creator.userId || creator.sub;
    const allAttendeeIds = [...new Set([creatorId, ...attendeeIds])];

    // 1. Verify all attendee users actually exist
    const attendees = await this.prisma.user.findMany({
      where: {
        id: { in: allAttendeeIds },
      },
    });

    if (attendees.length !== allAttendeeIds.length) {
      throw new NotFoundException('One or more attendees not found.');
    }

    // 2. Create the appointment and link attendees in a single transaction
    const newAppointment = await this.prisma.appointment.create({
      data: {
        ...appointmentData,
        // Link the creator
        createdBy: {
          connect: { id: creatorId },
        },
        // Create the join table records for each attendee
        attendeeLinks: {
          create: allAttendeeIds.map((userId) => ({
            user: { connect: { id: userId } },
            // The creator's status is automatically 'accepted'
            status: userId === creatorId ? 'accepted' : 'tentative',
          })),
        },
      },
      include: {
        // Include attendees' details in the response
        attendeeLinks: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return newAppointment;
  }

  // Find all appointments for the currently logged-in user
  async findAllForUser(user: AuthenticatedUser) {
    const userId = user.userId || user.sub;
    return this.prisma.appointment.findMany({
      where: {
        attendeeLinks: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        attendeeLinks: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  // Find a single appointment by its ID
  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        attendeeLinks: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID "${id}" not found.`);
    }
    return appointment;
  }

  // Update an appointment's details
  async update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
    // Ensure the appointment exists first
    const existingAppointment = await this.findOne(id);

    const { attendeeIds, ...appointmentData } = updateAppointmentDto;

    // Use transaction to ensure data consistency
    return this.prisma.$transaction(async (prisma) => {
      // Update the appointment data first (excluding attendeeIds)
      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: appointmentData,
      });

      // If attendeeIds are provided, update the attendee links
      if (attendeeIds && attendeeIds.length > 0) {
        // Delete existing attendee links
        await prisma.appointmentAttendee.deleteMany({
          where: { appointmentId: id },
        });

        // Create new attendee links
        await prisma.appointmentAttendee.createMany({
          data: attendeeIds.map((userId) => ({
            appointmentId: id,
            userId,
            status: 'accepted',
          })),
        });
      }

      // Return the updated appointment with relations
      return prisma.appointment.findUnique({
        where: { id },
        include: {
          attendeeLinks: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
      });
    });
  }

  // Delete an appointment
  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.appointment.delete({ where: { id } });

    return { message: `Appointment with ID "${id}" was successfully deleted.` };
  }

  async convertToTimeEntry(appointmentId: string, userId: string, data?: {
    description?: string;
    rate?: number;
    type?: TimeEntryType;
  }) {
    const appointment = await this.findOne(appointmentId);
    
    // Check if user is an attendee
    const isAttendee = appointment.attendeeLinks.some(link => link.userId === userId);
    if (!isAttendee) {
      throw new BadRequestException('You are not an attendee of this appointment');
    }

    // Calculate duration in minutes
    const startTime = new Date(appointment.startTime);
    const endTime = new Date(appointment.endTime);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    // Create time entry
    const timeEntry = await this.prisma.timeEntry.create({
      data: {
        userId,
        caseId: appointment.caseId,
        description: data?.description || `Meeting: ${appointment.title}`,
        type: data?.type || TimeEntryType.MEETING,
        startTime,
        endTime,
        duration,
        rate: data?.rate,
        billable: true,
        status: TimeEntryStatus.DRAFT,
      },
      include: { case: true },
    });

    return timeEntry;
  }
}