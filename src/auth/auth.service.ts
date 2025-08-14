// src/auth/auth.service.ts
import {
    ConflictException,
    Injectable,
    UnauthorizedException, // <-- Import this
  } from '@nestjs/common';
  import { PrismaService } from 'src/prisma/prisma.service';
  import { RegisterDto } from './dto/register.dto';
  import * as bcrypt from 'bcrypt';
  import { JwtService } from '@nestjs/jwt'; // <-- Import this
  import { LoginDto } from './dto/login.dto'; // <-- Import this
  
  @Injectable()
  export class AuthService {
    // Inject both Prisma and JwtService
    constructor(
      private prisma: PrismaService,
      private jwtService: JwtService, // <-- Inject here
    ) {}
  
    // The register method remains the same...
    async register(registerDto: RegisterDto) {
      // ... (code from before)
      const { email, password, name, role } = registerDto;
  
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });
  
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
  
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name,
          role: role || 'CLIENT',
        },
      });
  
      const { passwordHash, ...result } = user;
      return result;
    }
  
    // Our new login method
    async login(loginDto: LoginDto) {
      const { email, password } = loginDto;
  
      // 1. Find the user by email
      const user = await this.prisma.user.findUnique({
        where: { email },
      });
  
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
  
      // 2. Compare the provided password with the stored hash
      const isPasswordMatching = await bcrypt.compare(password, user.passwordHash);
  
      if (!isPasswordMatching) {
        throw new UnauthorizedException('Invalid credentials');
      }
  
      // 3. If credentials are correct, generate the JWT
      const payload = { sub: user.id, userId: user.id, role: user.role };
      const accessToken = await this.jwtService.signAsync(payload);
  
      // 4. Return the token
      return {
        access_token: accessToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      };
    }
  }