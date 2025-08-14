// src/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { GlobalTasksController } from './global-tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController, GlobalTasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}