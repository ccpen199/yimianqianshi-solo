import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateScoreDto, CreateReviewDto } from './dto/scoring.dto';

@Injectable()
export class ScoringService {
  constructor(private prisma: PrismaService) {}

  async createScore(createDto: CreateScoreDto) {
    const sample = await this.prisma.taskSample.findUnique({
      where: { id: createDto.sampleId },
    });
    if (!sample) {
      throw new NotFoundException('样本不存在');
    }

    return this.prisma.sampleScore.create({
      data: createDto as any,
    });
  }

  async getSampleScores(sampleId: string) {
    return this.prisma.sampleScore.findMany({
      where: { sampleId },
      include: { dimension: true, reviews: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReview(createDto: CreateReviewDto) {
    const sample = await this.prisma.taskSample.findUnique({
      where: { id: createDto.sampleId },
    });
    if (!sample) {
      throw new NotFoundException('样本不存在');
    }

    return this.prisma.manualReview.create({
      data: createDto,
    });
  }

  async getPendingReviews(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.manualReview.findMany({
        where: { status: 'pending' },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { sample: { include: { question: true } } },
      }),
      this.prisma.manualReview.count({ where: { status: 'pending' } }),
    ]);
    return { items, total, page, pageSize };
  }

  async updateReviewStatus(id: string, status: string) {
    return this.prisma.manualReview.update({
      where: { id },
      data: { status },
    });
  }

  async getScoringRules() {
    return this.prisma.scoringRule.findMany({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });
  }

  async createScoringRule(name: string, description: string, ruleConfig: string) {
    const latestRule = await this.prisma.scoringRule.findFirst({
      orderBy: { version: 'desc' },
    });

    return this.prisma.scoringRule.create({
      data: {
        name,
        description,
        ruleConfig,
        version: (latestRule?.version || 0) + 1,
      },
    });
  }
}
