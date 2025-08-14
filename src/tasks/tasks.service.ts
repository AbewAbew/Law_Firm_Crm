import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, TaskStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

interface AuthenticatedUser {
  userId: string;
  sub: string;
  role: UserRole;
}

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(createTaskDto: CreateTaskDto, assigner: AuthenticatedUser) {
    const { caseId, assignedToId, status, ...taskData } = createTaskDto;
    const caseExists = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseExists) {
      throw new NotFoundException(`Case with ID "${caseId}" not found.`);
    }
    const assignedToUser = await this.prisma.user.findUnique({ where: { id: assignedToId } });
    if (!assignedToUser) {
      throw new NotFoundException(`User with ID "${assignedToId}" not found.`);
    }
    const newTask = await this.prisma.task.create({
      data: {
        ...taskData,
        status: (status as TaskStatus) || TaskStatus.TODO,
        case: { connect: { id: caseId } },
        assignedBy: { connect: { id: assigner.userId || assigner.sub } },
        assignedTo: { connect: { id: assignedToId } },
      },
    });
    return newTask;
  }

  async findAllForCase(caseId: string) {
    const caseExists = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseExists) {
      throw new NotFoundException(`Case with ID "${caseId}" not found.`);
    }
    return this.prisma.task.findMany({
      where: { caseId },
      include: {
        assignedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }

  async update(taskId: string, updateTaskDto: UpdateTaskDto, user?: AuthenticatedUser) {
    const existingTask = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      throw new NotFoundException(`Task with ID "${taskId}" not found.`);
    }

    // If updating status, only assigned user can do it
    if (updateTaskDto.status && user) {
      const userId = user.userId || user.sub;
      if (existingTask.assignedToId !== userId) {
        throw new NotFoundException('You can only update status of tasks assigned to you');
      }
    }

    if (updateTaskDto.assignedToId) {
      const userExists = await this.prisma.user.findUnique({ where: { id: updateTaskDto.assignedToId } });
      if (!userExists) {
        throw new NotFoundException(`User with ID "${updateTaskDto.assignedToId}" not found to assign task to.`);
      }
    }
    const { caseId, assignedToId, status, ...updateData } = updateTaskDto;
    
    // Map string status to Prisma TaskStatus enum
    let prismaStatus: TaskStatus | undefined;
    if (status) {
      switch (status) {
        case 'TODO':
          prismaStatus = TaskStatus.TODO;
          break;
        case 'WORKING':
          prismaStatus = TaskStatus.IN_PROGRESS;
          break;
        case 'DONE':
          prismaStatus = TaskStatus.DONE;
          break;
      }
    }
    
    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...updateData,
        ...(prismaStatus && { status: prismaStatus }),
        ...(assignedToId && { assignedTo: { connect: { id: assignedToId } } }),
      },
    });
    return updatedTask;
  }

  async findAll(user: AuthenticatedUser) {
    const userId = user.userId || user.sub;
    
    if (user.role === UserRole.PARTNER) {
      return this.prisma.task.findMany({
        include: {
          case: { select: { id: true, caseName: true } },
          assignedTo: { select: { id: true, name: true } },
          assignedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    
    return this.prisma.task.findMany({
      where: {
        OR: [
          { assignedToId: userId },
          { assignedById: userId },
        ],
      },
      include: {
        case: { select: { id: true, caseName: true } },
        assignedTo: { select: { id: true, name: true } },
        assignedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(taskId: string) {
    const existingTask = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      throw new NotFoundException(`Task with ID "${taskId}" not found.`);
    }
    await this.prisma.task.delete({
      where: { id: taskId },
    });
    return {
      message: `Task with ID "${taskId}" was successfully deleted.`,
      deletedTaskId: taskId,
    };
  }
}