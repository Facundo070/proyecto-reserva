import { IsIn } from 'class-validator';

export class UpdateStatusDto {
  @IsIn(['Aprobada', 'Finalizada'])
  status: 'Aprobada' | 'Finalizada';
}