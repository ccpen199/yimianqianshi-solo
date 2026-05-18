import { Module } from '@nestjs/common';
import { EvaluationSetsService } from './evaluation-sets.service';
import { EvaluationSetsController } from './evaluation-sets.controller';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [EvaluationSetsController],
  providers: [EvaluationSetsService],
  exports: [EvaluationSetsService],
})
export class EvaluationSetsModule {}
