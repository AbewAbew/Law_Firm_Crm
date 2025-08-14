import { Module } from '@nestjs/common';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { EmailService } from 'src/email/email.service';

@Module({
  controllers: [CasesController],
  providers: [CasesService, EmailService]
})
export class CasesModule {}
