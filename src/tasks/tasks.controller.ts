import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
    Patch,  // <-- Added
    Delete, // <-- Added
  } from '@nestjs/common';
  import { TasksService } from './tasks.service';
  import { CreateTaskDto } from './dto/create-task.dto';
  import { AuthGuard } from 'src/auth/guards/auth.guard';
  import { RolesGuard } from 'src/auth/guards/roles.guard';
  import { Roles } from 'src/auth/decorators/roles.decorator';
  import { UserRole } from '@prisma/client';
  import { UpdateTaskDto } from './dto/update-task.dto'; // <-- Added
  
  @UseGuards(AuthGuard, RolesGuard)
  @Controller('cases/:caseId/tasks')
  export class TasksController {
    constructor(private readonly tasksService: TasksService) {}
  
    @Post()
    @Roles(UserRole.PARTNER, UserRole.ASSOCIATE)
    create(
      @Param('caseId') caseId: string,
      @Body() createTaskDto: CreateTaskDto,
      @Request() req,
    ) {
      const dtoWithCorrectCaseId = { ...createTaskDto, caseId };
      return this.tasksService.create(dtoWithCorrectCaseId, req.user);
    }
  
    @Get()
    @Roles(UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL)
    findAllForCase(@Param('caseId') caseId: string) {
      return this.tasksService.findAllForCase(caseId);
    }
  
    @Patch(':taskId')
    @Roles(UserRole.PARTNER, UserRole.ASSOCIATE)
    update(
      @Param('taskId') taskId: string,
      @Body() updateTaskDto: UpdateTaskDto,
    ) {
      return this.tasksService.update(taskId, updateTaskDto);
    }
  
    @Delete(':taskId')
    @Roles(UserRole.PARTNER)
    remove(@Param('taskId') taskId: string) {
      return this.tasksService.remove(taskId);
    }
  }