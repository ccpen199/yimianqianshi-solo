import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { CostService } from './cost.service';

@Controller('api/cost')
export class CostController {
  constructor(private readonly costService: CostService) {}

  @Get('statistics')
  getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.costService.getStatistics(startDate, endDate);
  }

  @Get('token-consumption')
  getTokenConsumption(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('modelName') modelName?: string,
  ) {
    return this.costService.getTokenConsumption(
      parseInt(page),
      parseInt(pageSize),
      modelName,
    );
  }

  @Get('summary')
  getSummary() {
    return this.costService.getSummary();
  }

  @Get('daily')
  getDailyStatistics(@Query('days') days = '30') {
    return this.costService.getDailyStatistics(parseInt(days));
  }

  @Post('record')
  recordConsumption(
    @Body()
    body: {
      taskId: string;
      modelName: string;
      inputTokens: number;
      outputTokens: number;
    },
  ) {
    return this.costService.recordConsumption(
      body.taskId,
      body.modelName,
      body.inputTokens,
      body.outputTokens,
    );
  }
}
