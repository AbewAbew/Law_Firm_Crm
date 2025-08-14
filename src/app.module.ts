// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CasesModule } from './cases/cases.module';
import { TasksModule } from './tasks/tasks.module';
import { DocumentsModule } from './documents/documents.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { UsersModule } from './users/users.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { BillingModule } from './billing/billing.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CommunicationsModule } from './communications/communications.module';

@Module({
  imports: [
    AuthModule, 
    PrismaModule, 
    CasesModule, 
    TasksModule, 
    DocumentsModule, 
    AppointmentsModule,
    UsersModule,
    TimeTrackingModule,
    BillingModule,
    AnalyticsModule,
    CommunicationsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}