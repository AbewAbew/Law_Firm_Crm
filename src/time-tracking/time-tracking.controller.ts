import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { TimeTrackingService } from './time-tracking.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { StartTimerDto } from './dto/start-timer.dto';
import { StopTimerDto } from './dto/stop-timer.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { TimeEntryStatus, InvoiceEntryStatus } from '@prisma/client';

@Controller('time-tracking')
@UseGuards(AuthGuard)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Post()
  create(@Request() req, @Body() createTimeEntryDto: CreateTimeEntryDto) {
    return this.timeTrackingService.create(req.user.sub, createTimeEntryDto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('caseId') caseId?: string,
    @Query('status') status?: TimeEntryStatus,
  ) {
    return this.timeTrackingService.findAll(req.user.sub, { caseId, status });
  }

  @Get('all-staff')
  findAllStaff(
    @Request() req,
    @Query('caseId') caseId?: string,
    @Query('status') status?: TimeEntryStatus,
  ) {
    return this.timeTrackingService.findAllStaff(req.user.sub, { caseId, status });
  }

  @Get('report')
  getTimeReport(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.timeTrackingService.getTimeReport(req.user.sub, startDate, endDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.timeTrackingService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() updateTimeEntryDto: UpdateTimeEntryDto) {
    return this.timeTrackingService.update(id, req.user.sub, updateTimeEntryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.timeTrackingService.remove(id, req.user.sub);
  }

  // Timer endpoints
  @Post('timer/start')
  startTimer(@Request() req, @Body() startTimerDto: StartTimerDto) {
    return this.timeTrackingService.startTimer(req.user.sub, startTimerDto);
  }

  @Post('timer/stop')
  stopTimer(@Request() req, @Body() stopTimerDto: StopTimerDto) {
    return this.timeTrackingService.stopTimer(req.user.sub, stopTimerDto);
  }

  @Get('timer/active')
  getActiveTimer(@Request() req) {
    return this.timeTrackingService.getActiveTimer(req.user.sub);
  }

  @Delete('timer/cancel')
  cancelTimer(@Request() req) {
    return this.timeTrackingService.cancelTimer(req.user.sub);
  }

  // Billing Integration endpoints
  @Get('unbilled')
  getUnbilledTimeEntries(
    @Query('clientId') clientId?: string,
    @Query('caseId') caseId?: string,
  ) {
    return this.timeTrackingService.getUnbilledTimeEntries({ clientId, caseId });
  }

  @Get('billing-summary')
  getBillingSummary(
    @Request() req,
    @Query('caseId') caseId?: string,
  ) {
    return this.timeTrackingService.getBillingSummary(req.user.sub, caseId);
  }

  @Get('billing-summary/all-staff')
  getAllStaffBillingSummary(
    @Request() req,
    @Query('caseId') caseId?: string,
  ) {
    return this.timeTrackingService.getAllStaffBillingSummary(req.user.sub, caseId);
  }

  @Get('test')
  test() {
    return { message: 'Backend is working', timestamp: new Date() };
  }

  @Get('health')
  health() {
    return { status: 'OK', port: 5000, timestamp: new Date() };
  }



  @Patch('invoice-status')
  updateInvoiceStatus(
    @Body() data: { timeEntryIds: string[]; status: InvoiceEntryStatus; invoiceId?: string },
  ) {
    return this.timeTrackingService.updateInvoiceStatus(data.timeEntryIds, data.status, data.invoiceId);
  }
}