import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

// Місце в залі визначає пара чисел row і seat, перелік обчислюється з розмірів залу.
// Клас описує і вхідні дані бронювання, і місця у відповідях
export class SeatDto {
  @ApiProperty({ example: 2, description: 'Номер ряду, ціле додатне число' })
  @IsInt()
  @IsPositive()
  row: number;

  @ApiProperty({
    example: 5,
    description: 'Номер місця в ряду, ціле додатне число',
  })
  @IsInt()
  @IsPositive()
  seat: number;
}
