import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ModelTasksService } from './model-tasks.service';
import { CreateModelTaskDto, UpdateModelTaskDto, RetrySampleDto } from './dto/model-task.dto';

@Controller('api/model-tasks')
export class ModelTasksController {
  constructor(private readonly modelTasksService: ModelTasksService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
  ) {
    return this.modelTasksService.findAll(parseInt(page), parseInt(pageSize), status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.modelTasksService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateModelTaskDto) {
    return this.modelTasksService.create(createDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateModelTaskDto) {
    return this.modelTasksService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.modelTasksService.remove(id);
  }

  @Post(':id/start')
  startTask(@Param('id') id: string) {
    return this.modelTasksService.startTask(id);
  }

  @Post(':id/pause')
  pauseTask(@Param('id') id: string) {
    return this.modelTasksService.pauseTask(id);
  }

  @Post(':id/resume')
  resumeTask(@Param('id') id: string) {
    return this.modelTasksService.resumeTask(id);
  }

  @Post(':id/retry-sample')
  retrySample(@Param('id') id: string, @Body() retryDto: RetrySampleDto) {
    return this.modelTasksService.retrySample(id, retryDto.sampleId);
  }

  @Post(':id/retry-all-failed')
  retryAllFailed(@Param('id') id: string) {
    return this.modelTasksService.retryAllFailed(id);
  }

  @Get('samples/:sampleId')
  getSampleDetail(@Param('sampleId') sampleId: string) {
    return this.modelTasksService.getSampleDetail(sampleId);
  }
}
