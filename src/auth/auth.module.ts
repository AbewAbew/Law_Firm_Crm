// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt'; // <-- Import

@Module({
  imports: [
    JwtModule.register({ // <-- Add this import
      global: true, // Makes the JwtService available app-wide
      secret: process.env.JWT_SECRET, // Use our secret from .env
      signOptions: { expiresIn: '1d' }, // Tokens will expire in 1 day
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}