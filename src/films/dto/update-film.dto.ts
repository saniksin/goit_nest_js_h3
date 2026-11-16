import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  Max,
  IsString,
  ValidateIf,
} from 'class-validator';
import { MAX_INTEGER } from '../../common/limits';

// Поле можна не передавати, але передане значення (зокрема null) має пройти перевірку:
// IsOptional пропускав би null, і він потрапив би в базу
const isProvided = (_: unknown, value: unknown) => value !== undefined;

export class UpdateFilmDto {
  @ApiPropertyOptional({ example: 'Дюна', description: 'Назва фільму' })
  @ValidateIf(isProvided)
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({
    example: 155,
    description: 'Тривалість у хвилинах, ціле додатне число',
  })
  @ValidateIf(isProvided)
  @IsInt()
  @IsPositive()
  @Max(MAX_INTEGER)
  durationMinutes?: number;

  @ApiPropertyOptional({
    example: 2021,
    description: 'Рік випуску, ціле додатне число',
  })
  @ValidateIf(isProvided)
  @IsInt()
  @IsPositive()
  @Max(MAX_INTEGER)
  releaseYear?: number;
}
