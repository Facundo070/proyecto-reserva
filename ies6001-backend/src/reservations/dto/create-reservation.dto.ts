import { ArrayMinSize, IsArray, IsDate, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReservationDto {
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  resourceIds: number[];
}