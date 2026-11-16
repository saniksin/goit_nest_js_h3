import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString, Max } from 'class-validator';
import { Trim } from '../../common/trim';
import { MAX_INTEGER } from '../../common/limits';

export class CreateFilmDto {
  @ApiProperty({ example: 'Дюна', description: 'Назва фільму' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 155,
    description: 'Тривалість у хвилинах, ціле додатне число',
  })
  @IsInt()
  @IsPositive()
  @Max(MAX_INTEGER)
  durationMinutes: number;

  @ApiProperty({
    example: 2021,
    description: 'Рік випуску, ціле додатне число',
  })
  @IsInt()
  @IsPositive()
  @Max(MAX_INTEGER)
  releaseYear: number;
}
