import { PartialType } from '@nestjs/mapped-types';
import { CreateCaseDto } from './create-case.dto';

// PartialType makes all properties of CreateCaseDto optional.
// This is perfect for update operations.
export class UpdateCaseDto extends PartialType(CreateCaseDto) {}