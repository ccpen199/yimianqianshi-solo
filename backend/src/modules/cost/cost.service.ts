import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';

@Injectable()
export class CostService {
  constructor(private prisma: PrismaService) {}

  async getStatistics(startDate?: string, endDate?: string) {
    const where = {};
    if (startDate || endDate) {
      where['date'] = {};
      if (startDate) where['date'].gte = new Date(startDate);
      if (endDate) where['date'].lte = new Date(endDate);
    }

    return this.prisma.costStatistics.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async getTokenConsumption(page = 1, pageSize = 20, modelName?: string) {
    const skip = (page - 1) * pageSize;
    const where = modelName ? { modelName } : {};

    const [items, total] = await Promise.all([
      this.prisma.tokenConsumption.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { consumedAt: 'desc' },
        include: { task: { select: { name: true } } },
      }),
      this.prisma.tokenConsumption.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getSummary() {
    const totalInputTokens = await this.prisma.tokenConsumption.aggregate({
      _sum: { inputTokens: true },
    });

    const totalOutputTokens = await this.prisma.tokenConsumption.aggregate({
      _sum: { outputTokens: true },
    });

    const totalCost = await this.prisma.tokenConsumption.aggregate({
      _sum: { cost: true },
    });

    const modelBreakdown = await this.prisma.$queryRaw`
      SELECT
        modelName,
        SUM(inputTokens) as totalInputTokens,
        SUM(outputTokens) as totalOutputTokens,
        SUM(cost) as totalCost,
        COUNT(*) as taskCount
      FROM TokenConsumption
      GROUP BY modelName
      ORDER BY totalCost DESC
    `;

    return {
      totalInputTokens: totalInputTokens._sum.inputTokens || 0,
      totalOutputTokens: totalOutputTokens._sum.outputTokens || 0,
      totalCost: totalCost._sum.cost || 0,
      modelBreakdown,
    };
  }

  async recordConsumption(
    taskId: string, modelName: string, inputTokens: number, outputTokens: number) {
    const tokenPricePerK = 0.015;
    const cost = (inputTokens + outputTokens) / 1000 * tokenPricePerK;

    return this.prisma.tokenConsumption.create({
      data: {
        taskId,
        modelName,
        inputTokens,
        outputTokens,
        cost,
        tokenPricePerK,
      },
    });
  }

  async getDailyStatistics(days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.prisma.$queryRaw`
      SELECT
        DATE(consumedAt) as date,
        SUM(inputTokens) as totalInputTokens,
        SUM(outputTokens) as totalOutputTokens,
        SUM(cost) as totalCost
      FROM TokenConsumption
      WHERE consumedAt >= ${startDate}
      GROUP BY DATE(consumedAt)
      ORDER BY date DESC
    `;

    return result;
  }
}
