import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateModelTaskDto, UpdateModelTaskDto } from './dto/model-task.dto';

@Injectable()
export class ModelTasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, pageSize = 20, status?: string) {
    const skip = (page - 1) * pageSize;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.prisma.modelTask.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          evaluationSet: { select: { id: true, name: true } },
          _count: { select: { samples: true } },
        },
      }),
      this.prisma.modelTask.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const task = await this.prisma.modelTask.findUnique({
      where: { id },
      include: {
        evaluationSet: true,
        samples: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!task) {
      throw new NotFoundException('任务不存在');
    }
    return task;
  }

  async create(createDto: CreateModelTaskDto) {
    const evaluationSet = await this.prisma.evaluationSet.findUnique({
      where: { id: createDto.evaluationSetId },
      include: { questions: true },
    });

    if (!evaluationSet) {
      throw new NotFoundException('评测集不存在');
    }

    if (evaluationSet.questions.length === 0) {
      throw new BadRequestException('评测集中没有题目');
    }

    return this.prisma.transaction(async (prisma) => {
      const task = await prisma.modelTask.create({
        data: {
          ...createDto,
          totalSamples: evaluationSet.questions.length,
        },
      });

      await prisma.taskSample.createMany({
        data: evaluationSet.questions.map((q) => ({
          taskId: task.id,
          questionId: q.id,
        })),
      });

      return this.findOne(task.id);
    });
  }

  async update(id: string, updateDto: UpdateModelTaskDto) {
    return this.prisma.modelTask.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string) {
    await this.prisma.modelTask.delete({ where: { id } });
    return { success: true };
  }

  async startTask(id: string) {
    const task = await this.findOne(id);
    if (task.status !== 'pending') {
      throw new BadRequestException('任务不是待执行状态');
    }

    return this.prisma.modelTask.update({
      where: { id },
      data: { status: 'running', startedAt: new Date() },
    });
  }

  async pauseTask(id: string) {
    const task = await this.findOne(id);
    if (task.status !== 'running') {
      throw new BadRequestException('任务不是运行中状态');
    }

    return this.prisma.modelTask.update({
      where: { id },
      data: { status: 'paused' },
    });
  }

  async resumeTask(id: string) {
    const task = await this.findOne(id);
    if (task.status !== 'paused') {
      throw new BadRequestException('任务不是暂停状态');
    }

    return this.prisma.modelTask.update({
      where: { id },
      data: { status: 'running' },
    });
  }

  async retrySample(id: string, sampleId: string) {
    const sample = await this.prisma.taskSample.findUnique({
      where: { id: sampleId, taskId: id },
    });

    if (!sample) {
      throw new NotFoundException('样本不存在');
    }

    return this.prisma.taskSample.update({
      where: { id: sampleId },
      data: {
        status: 'pending',
        failedReason: null,
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
      },
    });
  }

  async retryAllFailed(id: string) {
    await this.prisma.taskSample.updateMany({
      where: { taskId: id, status: 'failed' },
      data: {
        status: 'pending',
        failedReason: null,
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
      },
    });

    return { success: true };
  }

  async getSampleDetail(sampleId: string) {
    const sample = await this.prisma.taskSample.findUnique({
      where: { id: sampleId },
      include: {
        question: true,
        scores: true,
        reviews: true,
      },
    });

    if (!sample) {
      throw new NotFoundException('样本不存在');
    }

    return sample;
  }
}
