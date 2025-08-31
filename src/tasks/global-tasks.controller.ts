import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
  Delete,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(AuthGuard, RolesGuard)
@Controller('tasks')
export class GlobalTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Roles(UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL)
  findAll(@Request() req) {
    return this.tasksService.findAll(req.user);
  }

  @Post()
  @Roles(UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL)
  create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    return this.tasksService.create(createTaskDto, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL)
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto, @Request() req) {
    return this.tasksService.update(id, updateTaskDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.PARTNER)
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}