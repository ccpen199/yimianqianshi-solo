import { Module } from '@nestjs/common';
import { ModelTasksService } from './model-tasks.service';
import { ModelTasksController } from './model-tasks.controller';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [ModelTasksController],
  providers: [ModelTasksService],
  exports: [ModelTasksService],
})
export class ModelTasksModule {}
