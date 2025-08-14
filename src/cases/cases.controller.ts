import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';

@Controller('cases')
@UseGuards(AuthGuard, RolesGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post()
  @Roles(UserRole.PARTNER)
  create(@Body() createCaseDto: CreateCaseDto, @Request() req) {
    return this.casesService.create(createCaseDto, req.user);
  }

  @Get()
  findAll(@Request() req) {
    return this.casesService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.casesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.PARTNER, UserRole.ASSOCIATE)
  update(@Param('id') id: string, @Body() updateCaseDto: UpdateCaseDto) {
    return this.casesService.update(id, updateCaseDto);
  }

  @Post(':id/assign')
  @Roles(UserRole.PARTNER)
  assignUsers(@Param('id') id: string, @Body() body: { userIds: string[] }) {
    return this.casesService.assignUsers(id, body.userIds);
  }

  @Get(':id/assignments')
  getAssignments(@Param('id') id: string, @Request() req) {
    return this.casesService.getAssignments(id, req.user);
  }

  @Patch(':id/close')
  closeCase(@Param('id') id: string, @Request() req) {
    return this.casesService.closeCase(id, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.PARTNER)
  remove(@Param('id') id: string) {
    return this.casesService.remove(id);
  }
}