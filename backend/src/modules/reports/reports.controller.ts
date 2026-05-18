import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto, PublishReportDto, CreateConclusionDto } from './dto/reports.dto';

@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('isPublished') isPublished?: string,
  ) {
    return this.reportsService.findAll(
      parseInt(page),
      parseInt(pageSize),
      isPublished === 'true',
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @Post()
  create(@Body() createDto: CreateReportDto) {
    return this.reportsService.create(createDto);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @Body() publishDto: PublishReportDto) {
    return this.reportsService.publish(id, publishDto.publishedBy);
  }

  @Post('conclusions')
  createConclusion(@Body() createDto: CreateConclusionDto) {
    return this.reportsService.createConclusion(createDto);
  }

  @Get(':id/conclusions')
  getConclusions(@Param('id') id: string) {
    return this.reportsService.getConclusions(id);
  }

  @Post('conclusions/:id/freeze')
  freezeConclusion(@Param('id') id: string) {
    return this.reportsService.freezeConclusion(id);
  }

  @Post('compare')
  compareReports(@Body() body: { reportIds: string[] }) {
    return this.reportsService.compareReports(body.reportIds);
  }

  @Get(':id/low-score-samples')
  getLowScoreSamples(
    @Param('id') id: string,
    @Query('threshold') threshold = '60',
  ) {
    return this.reportsService.getLowScoreSamples(id, parseFloat(threshold));
  }
}
