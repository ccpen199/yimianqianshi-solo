import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { CreateScoreDto, CreateReviewDto } from './dto/scoring.dto';

@Controller('api/scoring')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Post('scores')
  createScore(@Body() createDto: CreateScoreDto) {
    return this.scoringService.createScore(createDto);
  }

  @Get('samples/:sampleId/scores')
  getSampleScores(@Param('sampleId') sampleId: string) {
    return this.scoringService.getSampleScores(sampleId);
  }

  @Post('reviews')
  createReview(@Body() createDto: CreateReviewDto) {
    return this.scoringService.createReview(createDto);
  }

  @Get('reviews/pending')
  getPendingReviews(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.scoringService.getPendingReviews(parseInt(page), parseInt(pageSize));
  }

  @Put('reviews/:id/status')
  updateReviewStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.scoringService.updateReviewStatus(id, body.status);
  }

  @Get('rules')
  getScoringRules() {
    return this.scoringService.getScoringRules();
  }

  @Post('rules')
  createScoringRule(@Body() body: { name: string; description: string; ruleConfig: string }) {
    return this.scoringService.createScoringRule(body.name, body.description, body.ruleConfig);
  }
}
