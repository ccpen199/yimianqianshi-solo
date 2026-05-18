import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateReportDto, CreateConclusionDto } from './dto/reports.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, pageSize = 20, isPublished?: boolean) {
    const skip = (page - 1) * pageSize;
    const where = isPublished !== undefined ? { isPublished } : {};

    const [items, total] = await Promise.all([
      this.prisma.evaluationReport.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          task: { select: { id: true, name: true, modelName: true } },
          _count: { select: { conclusions: true } },
        },
      }),
      this.prisma.evaluationReport.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const report = await this.prisma.evaluationReport.findUnique({
      where: { id },
      include: {
        task: true,
        conclusions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!report) {
      throw new NotFoundException('报告不存在');
    }
    return report;
  }

  async create(createDto: CreateReportDto) {
    const task = await this.prisma.modelTask.findUnique({
      where: { id: createDto.taskId },
    });
    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    return this.prisma.evaluationReport.create({
      data: createDto,
    });
  }

  async publish(id: string, publishedBy: string) {
    const report = await this.findOne(id);
    if (report.isPublished) {
      throw new BadRequestException('报告已经发布');
    }

    return this.prisma.evaluationReport.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        publishedBy,
      },
    });
  }

  async createConclusion(createDto: CreateConclusionDto) {
    const report = await this.findOne(createDto.reportId);
    if (!report.isPublished) {
      throw new BadRequestException('只能为已发布的报告添加结论');
    }

    return this.prisma.reportConclusion.create({
      data: createDto,
    });
  }

  async getConclusions(reportId: string) {
    return this.prisma.reportConclusion.findMany({
      where: { reportId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async freezeConclusion(id: string) {
    const conclusion = await this.prisma.reportConclusion.findUnique({
      where: { id },
    });
    if (!conclusion) {
      throw new NotFoundException('结论不存在');
    }

    return this.prisma.reportConclusion.update({
      where: { id },
      data: { isFrozen: true, frozenAt: new Date() },
    });
  }

  async compareReports(reportIds: string[]) {
    return this.prisma.evaluationReport.findMany({
      where: { id: { in: reportIds } },
      include: {
        task: { select: { id: true, name: true, modelName: true, modelVersion: true } },
      },
    });
  }

  async getLowScoreSamples(reportId: string, threshold = 60) {
    const report = await this.findOne(reportId);

    const samples = await this.prisma.taskSample.findMany({
      where: {
        taskId: report.taskId,
        scores: {
          some: {
            score: { lte: threshold },
          },
        },
      },
      include: {
        question: true,
        scores: true,
      },
    });

    return samples;
  }
}
