import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import * as bcrypt from 'bcrypt';

/**
 * Represents an authenticated user with role-based access
 */
interface AuthenticatedUser {
  /** Unique identifier for the user */
  userId: string;
  /** User's role determining access permissions */
  role: UserRole;
}

/**
 * Validates if a string matches CUID format
 */
function isCuid(value: string): boolean {
  const cuidRegex = /^c[a-z0-9]{24}$/;
  return cuidRegex.test(value);
}

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);
  
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async create(createCaseDto: CreateCaseDto, user?: AuthenticatedUser) {
    const { clientId, clientName, clientEmail, assignedUserIds, ...caseData } = createCaseDto;
    
    this.validateCreateInput(clientId, clientName, clientEmail);
    
    const { finalClientId, clientLoginInfo } = await this.handleClientCreation(createCaseDto, user);
    const caseNumber = await this.generateCaseNumber();

    const result = await this.prisma.$transaction(async (prisma) => {
      // Only include valid case fields
      const validCaseData = {
        caseName: caseData.caseName,
        description: caseData.description,
        caseNumber,
      };
      
      const newCase = await prisma.case.create({
        data: { 
          ...validCaseData,
          client: { connect: { id: finalClientId } } 
        },
        include: { client: { select: { id: true, name: true, email: true } } },
      });
      
      if (assignedUserIds?.length) {
        // Validate that all user IDs exist and are staff members
        const validUsers = await prisma.user.findMany({
          where: {
            id: { in: assignedUserIds },
            role: { in: [UserRole.ASSOCIATE, UserRole.PARALEGAL] }
          }
        });
        
        if (validUsers.length !== assignedUserIds.length) {
          throw new BadRequestException('Some user IDs are invalid or not staff members');
        }
        
        await prisma.caseAssignment.createMany({
          data: validUsers.map(user => ({
            caseId: newCase.id,
            userId: user.id,
            role: 'assigned'
          }))
        });
      }
      
      return newCase;
    });
    
    return {
      ...result,
      ...(clientLoginInfo ? { clientLoginInfo } : {}),
    };
  }

  private validateCreateInput(clientId?: string, clientName?: string, clientEmail?: string) {
    const hasClientData = clientName && clientEmail;
    
    if (!clientId && !hasClientData) {
      throw new BadRequestException('Either clientId or client information (name and email) must be provided');
    }
    
    if (clientId && hasClientData) {
      throw new BadRequestException('Cannot provide both clientId and client information');
    }
  }

  private async handleClientCreation(createCaseDto: CreateCaseDto, user?: AuthenticatedUser) {
    const { clientId, clientName, clientEmail, clientPhone, clientAddress, clientPassword, sendCredentialsEmail } = createCaseDto;
    const hasClientData = clientName && clientEmail;
    
    if (hasClientData) {
      return this.createNewClient(clientName, clientEmail, clientPhone, clientAddress, clientPassword, sendCredentialsEmail, createCaseDto.caseName);
    } else {
      const finalClientId = clientId || user?.userId;
      if (!finalClientId) {
        throw new BadRequestException('Client ID is required');
      }
      
      const client = await this.prisma.user.findUnique({ where: { id: finalClientId } });
      if (!client) {
        throw new NotFoundException(`Client with ID "${finalClientId}" not found.`);
      }
      
      return { finalClientId, clientLoginInfo: null };
    }
  }

  private async createNewClient(name: string, email: string, phone?: string, address?: string, password?: string, sendEmail?: boolean, caseName?: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException(`User with email "${email}" already exists`);
    }

    const clientPassword = password || Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(clientPassword, 10);

    const newClient = await this.prisma.user.create({
      data: {
        name,
        email,
        phone,
        address,
        passwordHash: hashedPassword,
        role: UserRole.CLIENT,
      },
    });
    
    let clientLoginInfo: { email: string; password: string } | null = null;
    clientLoginInfo = { email, password: clientPassword };
    
    if (sendEmail && password) {
      try {
        const sanitizedEmail = this.sanitizeInput(email);
        const sanitizedName = this.sanitizeInput(name);
        const sanitizedCaseName = this.sanitizeInput(caseName || '');
        await this.emailService.sendLoginCredentials(sanitizedEmail, sanitizedName, password, sanitizedCaseName);
      } catch (error) {
        this.logger.error('Failed to send login credentials email', error);
      }
    }
    
    return { finalClientId: newClient.id, clientLoginInfo };
  }

  private async generateCaseNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `CASE-${year}-${month}-`;
    
    // Get the highest existing case number for this month
    const lastCase = await this.prisma.case.findFirst({
      where: {
        caseNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        caseNumber: 'desc',
      },
      select: {
        caseNumber: true,
      },
    });
    
    let nextNumber = 1;
    if (lastCase?.caseNumber) {
      const lastNumber = parseInt(lastCase.caseNumber.split('-').pop() || '0') || 0;
      nextNumber = lastNumber + 1;
    }
    
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  async findAll(user: AuthenticatedUser) {
    if (user.role === UserRole.PARTNER) {
      // Partners can see all cases
      return this.prisma.case.findMany({
        include: { 
          client: { select: { id: true, name: true } },
          caseAssignments: {
            include: {
              user: { select: { id: true, name: true, role: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    
    if (user.role === UserRole.CLIENT) {
      return this.prisma.case.findMany({
        where: { clientId: user.userId },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    
    if (user.role === UserRole.ASSOCIATE || user.role === UserRole.PARALEGAL) {
      // Get cases where user is directly assigned OR has tasks assigned
      const casesWithAssignments = await this.prisma.case.findMany({
        where: {
          caseAssignments: {
            some: {
              userId: user.userId
            }
          }
        },
        include: { 
          client: { select: { id: true, name: true } },
          caseAssignments: {
            include: {
              user: { select: { id: true, name: true, role: true } }
            }
          }
        },
      });
      
      const casesWithTasks = await this.prisma.case.findMany({
        where: {
          tasks: {
            some: {
              assignedToId: user.userId
            }
          }
        },
        include: { 
          client: { select: { id: true, name: true } },
          caseAssignments: {
            include: {
              user: { select: { id: true, name: true, role: true } }
            }
          }
        },
      });
      
      // Combine and deduplicate cases
      const allCases = [...casesWithAssignments, ...casesWithTasks];
      const uniqueCases = allCases.filter((case1, index, self) => 
        index === self.findIndex(case2 => case2.id === case1.id)
      );
      
      return uniqueCases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    return [];
  }

  async findOne(id: string, user?: AuthenticatedUser) {
    if (typeof id !== 'string' || !isCuid(id)) {
      throw new BadRequestException('Invalid case ID format');
    }
    
    const caseRecord = await this.prisma.case.findUnique({
      where: { id },
      include: { 
        client: { select: { id: true, name: true, email: true } },
        caseAssignments: {
          include: {
            user: { select: { id: true, name: true, role: true } }
          }
        }
      },
    });
    
    if (!caseRecord) {
      throw new NotFoundException(`Case with ID "${id}" not found.`);
    }
    
    // Check access permissions if user is provided
    if (user) {
      try {
        await this.checkUserAccess(user, caseRecord, id);
      } catch (error) {
        this.logger.error(`Access check failed for user ${user.userId} on case ${id}`, error);
        throw error;
      }
    }
    
    return caseRecord;
  }

  async update(id: string, updateCaseDto: UpdateCaseDto) {
    if (typeof id !== 'string' || !isCuid(id)) {
      throw new BadRequestException('Invalid case ID format');
    }
    
    try {
      const updatedCase = await this.prisma.case.update({
        where: { id },
        data: updateCaseDto,
      });
      return updatedCase;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Case with ID "${id}" not found.`);
      }
      throw error;
    }
  }

  async assignUsers(caseId: string, userIds: string[]) {
    if (typeof caseId !== 'string' || !isCuid(caseId)) {
      throw new BadRequestException('Invalid case ID format');
    }
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new BadRequestException('User IDs array is required and cannot be empty');
    }
    
    // Validate all user IDs at once
    if (!userIds.every(userId => typeof userId === 'string' && isCuid(userId))) {
      throw new BadRequestException('Invalid user ID format detected');
    }
    
    // Verify case exists
    const caseExists = await this.prisma.case.findUnique({ where: { id: caseId } });
    
    if (!caseExists) {
      throw new NotFoundException(`Case with ID "${caseId}" not found.`);
    }
    
    // Validate that all user IDs exist and are staff members
    const validUsers = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        role: { in: [UserRole.ASSOCIATE, UserRole.PARALEGAL] }
      }
    });
    
    if (validUsers.length !== userIds.length) {
      throw new BadRequestException('Some user IDs are invalid or not staff members');
    }
    
    // Remove existing assignments and create new ones
    await this.prisma.$transaction(async (prisma) => {
      // Remove existing assignments
      await prisma.caseAssignment.deleteMany({
        where: { caseId }
      });
      
      // Create new assignments
      const validatedData = validUsers.map(user => ({
        caseId,
        userId: user.id,
        role: 'assigned' as const
      }));
      
      await prisma.caseAssignment.createMany({
        data: validatedData
      });
    });
    
    return { 
      message: 'Case assignments updated successfully',
      assignedUsers: validUsers.map(user => ({ id: user.id, name: user.name, role: user.role }))
    };
  }

  async remove(id: string) {
    if (typeof id !== 'string' || !isCuid(id)) {
      throw new BadRequestException('Invalid case ID format');
    }
    
    // Verify case exists before deletion
    const caseExists = await this.prisma.case.findUnique({ where: { id } });
    if (!caseExists) {
      throw new NotFoundException(`Case with ID "${id}" not found.`);
    }
    
    // Delete all related data in transaction
    await this.prisma.$transaction(async (prisma) => {
      // Delete related data in parallel for better performance
      await Promise.all([
        prisma.caseAssignment.deleteMany({ where: { caseId: id } }),
        prisma.task.deleteMany({ where: { caseId: id } }),
        prisma.timeEntry.deleteMany({ where: { caseId: id } }),
        prisma.document.deleteMany({ where: { caseId: id } }),
        prisma.appointment.deleteMany({ where: { caseId: id } }),
        prisma.payment.deleteMany({
          where: {
            invoice: {
              caseId: id
            }
          }
        }),
        prisma.invoice.deleteMany({ where: { caseId: id } })
      ]);
      
      // Finally delete the case
      await prisma.case.delete({ where: { id } });
    });
    
    return {
      message: `Case with ID "${id}" and all related data has been successfully deleted.`,
      deletedCaseId: id,
    };
  }

  private async checkUserAccess(user: AuthenticatedUser, caseRecord: any, caseId: string): Promise<void> {
    if (user.role === UserRole.PARTNER) {
      return;
    }
    
    if (user.role === UserRole.CLIENT) {
      if (caseRecord.clientId !== user.userId) {
        throw new NotFoundException(`Case with ID "${caseId}" not found.`);
      }
      return;
    }
    
    if (user.role === UserRole.ASSOCIATE || user.role === UserRole.PARALEGAL) {
      const hasAccess = await this.checkStaffAccess(user.userId, caseRecord, caseId);
      if (!hasAccess) {
        throw new NotFoundException(`Case with ID "${caseId}" not found.`);
      }
    }
  }

  private async checkStaffAccess(userId: string, caseRecord: any, caseId: string): Promise<boolean> {
    // Check if user is directly assigned to case
    const isDirectlyAssigned = caseRecord.caseAssignments.some(
      (assignment: any) => assignment.userId === userId
    );
    
    if (isDirectlyAssigned) {
      return true;
    }
    
    // Check if user has tasks in this case
    const taskCount = await this.prisma.task.count({
      where: {
        caseId,
        assignedToId: userId
      }
    });
    
    return taskCount > 0;
  }

  async getAssignments(caseId: string, user?: AuthenticatedUser) {
    if (typeof caseId !== 'string' || !isCuid(caseId)) {
      throw new BadRequestException('Invalid case ID format');
    }

    // First check if user has access to this case
    await this.findOne(caseId, user);

    // Get case assignments
    const assignments = await this.prisma.caseAssignment.findMany({
      where: { caseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return assignments.map(assignment => ({
      id: assignment.id,
      role: assignment.role,
      assignedAt: assignment.assignedAt,
      user: assignment.user
    }));
  }

  private sanitizeInput(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}