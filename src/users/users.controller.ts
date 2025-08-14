import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.PARTNER)
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id')
  @Roles(UserRole.PARTNER)
  update(@Param('id') id: string, @Body() updateData: { name?: string; role?: UserRole }) {
    return this.usersService.update(id, updateData);
  }

  @Delete(':id')
  @Roles(UserRole.PARTNER)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}