import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { SeatDto } from '../../halls/dto/seat.dto';

export class CreateBookingDto {
  @ApiProperty({
    type: [SeatDto],
    description: 'Непорожній масив місць без повторів',
    example: [
      { row: 2, seat: 5 },
      { row: 2, seat: 6 },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((seat: SeatDto) => `${seat?.row}:${seat?.seat}`, {
    message: 'seats не має містити те саме місце двічі',
  })
  @ValidateNested({ each: true })
  @Type(() => SeatDto)
  seats: SeatDto[];
}
