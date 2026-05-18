import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateEvaluationSetDto, UpdateEvaluationSetDto, FreezeEvaluationSetDto, CreateQuestionDto, CreateDimensionDto } from './dto/evaluation-set.dto';

@Injectable()
export class EvaluationSetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.evaluationSet.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { questions: true, tasks: true },
          },
        },
      }),
      this.prisma.evaluationSet.count(),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const evaluationSet = await this.prisma.evaluationSet.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        dimensions: { orderBy: { orderIndex: 'asc' } },
        versions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!evaluationSet) {
      throw new NotFoundException('评测集不存在');
    }
    return evaluationSet;
  }

  async create(createDto: CreateEvaluationSetDto) {
    const { questions = [], dimensions = [], ...rest } = createDto;

    return this.prisma.transaction(async (prisma) => {
      const evaluationSet = await prisma.evaluationSet.create({
        data: rest,
      });

      if (questions.length > 0) {
        await prisma.evaluationQuestion.createMany({
          data: questions.map((q, idx) => ({
            ...q,
            evaluationSetId: evaluationSet.id,
            orderIndex: q.orderIndex ?? idx,
          })),
        });
      }

      if (dimensions.length > 0) {
        await prisma.evaluationDimension.createMany({
          data: dimensions.map((d, idx) => ({
            ...d,
            evaluationSetId: evaluationSet.id,
            orderIndex: d.orderIndex ?? idx,
          })),
        });
      }

      return this.findOne(evaluationSet.id);
    });
  }

  async update(id: string, updateDto: UpdateEvaluationSetDto) {
    const evaluationSet = await this.findOne(id);
    if (evaluationSet.isFrozen) {
      throw new BadRequestException('已冻结的评测集不能修改');
    }

    return this.prisma.evaluationSet.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string) {
    const evaluationSet = await this.findOne(id);
    if (evaluationSet.isFrozen) {
      throw new BadRequestException('已冻结的评测集不能删除');
    }

    await this.prisma.evaluationSet.delete({ where: { id } });
    return { success: true };
  }

  async freeze(id: string, freezeDto: FreezeEvaluationSetDto) {
    const evaluationSet = await this.findOne(id);
    if (evaluationSet.isFrozen) {
      throw new BadRequestException('评测集已经是冻结状态');
    }

    const version = freezeDto.version || `v${Date.now()}`;
    const snapshot = JSON.stringify({
      evaluationSet,
      questions: evaluationSet.questions,
      dimensions: evaluationSet.dimensions,
    });

    return this.prisma.transaction(async (prisma) => {
      await prisma.evaluationSetVersion.create({
        data: {
          evaluationSetId: id,
          version,
          description: freezeDto.description,
          snapshot,
        },
      });

      return prisma.evaluationSet.update({
        where: { id },
        data: { isFrozen: true, frozenAt: new Date() },
      });
    });
  }

  async unfreeze(id: string) {
    return this.prisma.evaluationSet.update({
      where: { id },
      data: { isFrozen: false, frozenAt: null },
    });
  }

  async addQuestion(evaluationSetId: string, questionDto: CreateQuestionDto) {
    const evaluationSet = await this.findOne(evaluationSetId);
    if (evaluationSet.isFrozen) {
      throw new BadRequestException('已冻结的评测集不能添加题目');
    }

    const maxOrder = await this.prisma.evaluationQuestion.aggregate({
      where: { evaluationSetId },
      _max: { orderIndex: true },
    });

    return this.prisma.evaluationQuestion.create({
      data: {
        ...questionDto,
        evaluationSetId,
        orderIndex: questionDto.orderIndex ?? (maxOrder._max.orderIndex ?? -1) + 1,
      },
    });
  }

  async updateQuestion(id: string, questionDto: Partial<CreateQuestionDto>) {
    const question = await this.prisma.evaluationQuestion.findUnique({ where: { id } });
    if (!question) {
      throw new NotFoundException('题目不存在');
    }

    const evaluationSet = await this.findOne(question.evaluationSetId);
    if (evaluationSet.isFrozen) {
      throw new BadRequestException('已冻结的评测集不能修改题目');
    }

    return this.prisma.evaluationQuestion.update({
      where: { id },
      data: questionDto,
    });
  }

  async removeQuestion(id: string) {
    const question = await this.prisma.evaluationQuestion.findUnique({ where: { id } });
    if (!question) {
      throw new NotFoundException('题目不存在');
    }

    const evaluationSet = await this.findOne(question.evaluationSetId);
    if (evaluationSet.isFrozen) {
      throw new BadRequestException('已冻结的评测集不能删除题目');
    }

    await this.prisma.evaluationQuestion.delete({ where: { id } });
    return { success: true };
  }

  async addDimension(evaluationSetId: string, dimensionDto: CreateDimensionDto) {
    const evaluationSet = await this.findOne(evaluationSetId);
    if (evaluationSet.isFrozen) {
      throw new BadRequestException('已冻结的评测集不能添加评分维度');
    }

    const maxOrder = await this.prisma.evaluationDimension.aggregate({
      where: { evaluationSetId },
      _max: { orderIndex: true },
    });

    return this.prisma.evaluationDimension.create({
      data: {
        ...dimensionDto,
        evaluationSetId,
        orderIndex: dimensionDto.orderIndex ?? (maxOrder._max.orderIndex ?? -1) + 1,
      },
    });
  }

  async updateDimension(id: string, dimensionDto: Partial<CreateDimensionDto>) {
    const dimension = await this.prisma.evaluationDimension.findUnique({ where: { id } });
    if (!dimension) {
      throw new NotFoundException('评分维度不存在');
    }

    const evaluationSet = await this.findOne(dimension.evaluationSetId);
    if (evaluationSet.isFrozen) {
      throw new BadRequestException('已冻结的评测集不能修改评分维度');
    }

    return this.prisma.evaluationDimension.update({
      where: { id },
      data: dimensionDto,
    });
  }

  async removeDimension(id: string) {
    const dimension = await this.prisma.evaluationDimension.findUnique({ where: { id } });
    if (!dimension) {
      throw new NotFoundException('评分维度不存在');
    }

    const evaluationSet = await this.findOne(dimension.evaluationSetId);
    if (evaluationSet.isFrozen) {
      throw new BadRequestException('已冻结的评测集不能删除评分维度');
    }

    await this.prisma.evaluationDimension.delete({ where: { id } });
    return { success: true };
  }
}
