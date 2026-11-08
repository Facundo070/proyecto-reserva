import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateResourceDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  statusId: number;

  @IsInt()
  categoryId: number;
}