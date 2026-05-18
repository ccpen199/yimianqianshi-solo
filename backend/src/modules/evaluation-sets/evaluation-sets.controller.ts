import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { EvaluationSetsService } from './evaluation-sets.service';
import { CreateEvaluationSetDto, UpdateEvaluationSetDto, FreezeEvaluationSetDto, CreateQuestionDto, CreateDimensionDto } from './dto/evaluation-set.dto';

@Controller('api/evaluation-sets')
export class EvaluationSetsController {
  constructor(private readonly evaluationSetsService: EvaluationSetsService) {}

  @Get()
  findAll(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.evaluationSetsService.findAll(parseInt(page), parseInt(pageSize));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evaluationSetsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateEvaluationSetDto) {
    return this.evaluationSetsService.create(createDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateEvaluationSetDto) {
    return this.evaluationSetsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.evaluationSetsService.remove(id);
  }

  @Post(':id/freeze')
  freeze(@Param('id') id: string, @Body() freezeDto: FreezeEvaluationSetDto) {
    return this.evaluationSetsService.freeze(id, freezeDto);
  }

  @Post(':id/unfreeze')
  unfreeze(@Param('id') id: string) {
    return this.evaluationSetsService.unfreeze(id);
  }

  @Post(':id/questions')
  addQuestion(@Param('id') id: string, @Body() questionDto: CreateQuestionDto) {
    return this.evaluationSetsService.addQuestion(id, questionDto);
  }

  @Put('questions/:id')
  updateQuestion(@Param('id') id: string, @Body() questionDto: Partial<CreateQuestionDto>) {
    return this.evaluationSetsService.updateQuestion(id, questionDto);
  }

  @Delete('questions/:id')
  removeQuestion(@Param('id') id: string) {
    return this.evaluationSetsService.removeQuestion(id);
  }

  @Post(':id/dimensions')
  addDimension(@Param('id') id: string, @Body() dimensionDto: CreateDimensionDto) {
    return this.evaluationSetsService.addDimension(id, dimensionDto);
  }

  @Put('dimensions/:id')
  updateDimension(@Param('id') id: string, @Body() dimensionDto: Partial<CreateDimensionDto>) {
    return this.evaluationSetsService.updateDimension(id, dimensionDto);
  }

  @Delete('dimensions/:id')
  removeDimension(@Param('id') id: string) {
    return this.evaluationSetsService.removeDimension(id);
  }
}
