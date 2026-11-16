import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString, Max } from 'class-validator';
import { MAX_HALL_ROWS, MAX_SEATS_PER_ROW } from '../../common/limits';

export class CreateHallDto {
  @ApiProperty({
    example: 'Зал 1',
    description: 'Назва залу, унікальна серед усіх залів',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 3,
    description: `Кількість рядів, ціле число від 1 до ${MAX_HALL_ROWS}`,
    maximum: MAX_HALL_ROWS,
  })
  @IsInt()
  @IsPositive()
  @Max(MAX_HALL_ROWS)
  rows: number;

  @ApiProperty({
    example: 5,
    description: `Кількість місць у ряду, ціле число від 1 до ${MAX_SEATS_PER_ROW}`,
    maximum: MAX_SEATS_PER_ROW,
  })
  @IsInt()
  @IsPositive()
  @Max(MAX_SEATS_PER_ROW)
  seatsPerRow: number;
}
