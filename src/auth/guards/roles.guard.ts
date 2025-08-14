// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Get the required roles from the @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. If no roles are required, allow access (for public routes or routes only needing login)
    if (!requiredRoles) {
      return true;
    }

    // 3. Get the user object from the request (attached by AuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // 4. Check if the user's role is included in the required roles
    return requiredRoles.some((role) => user.role?.includes(role));
  }
}