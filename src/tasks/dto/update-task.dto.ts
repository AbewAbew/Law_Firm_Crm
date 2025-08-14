// src/tasks/dto/update-task.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';

// We can't change the case a task belongs to, so we'll omit that.
// We will also omit who assigned the task, as that shouldn't change.
// We can update who it's assigned to.
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}