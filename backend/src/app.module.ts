import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { EvaluationSetsModule } from './modules/evaluation-sets/evaluation-sets.module';
import { ModelTasksModule } from './modules/model-tasks/model-tasks.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CostModule } from './modules/cost/cost.module';

@Module({
  imports: [
    CommonModule,
    EvaluationSetsModule,
    ModelTasksModule,
    ScoringModule,
    ReportsModule,
    CostModule,
  ],
})
export class AppModule {}
