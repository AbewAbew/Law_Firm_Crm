import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('cases')
  getCaseAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getCaseAnalytics(query);
  }

  @Get('productivity')
  getProductivityAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getProductivityAnalytics(query);
  }

  @Get('financial')
  getFinancialAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getFinancialAnalytics(query);
  }

  @Get('dashboard')
  getDashboardMetrics() {
    return this.analyticsService.getDashboardMetrics();
  }
}