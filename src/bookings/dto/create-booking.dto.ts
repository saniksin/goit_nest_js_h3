import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { SeatDto } from '../../halls/dto/seat.dto';
import { MAX_SEATS_PER_BOOKING } from '../../common/limits';

export class CreateBookingDto {
  @ApiProperty({
    type: [SeatDto],
    description: `Непорожній масив місць без повторів, не більше ${MAX_SEATS_PER_BOOKING}`,
    example: [
      { row: 2, seat: 5 },
      { row: 2, seat: 6 },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_SEATS_PER_BOOKING, {
    message: `seats може містити не більше ${MAX_SEATS_PER_BOOKING} місць`,
  })
  @ArrayUnique((seat: SeatDto) => `${seat?.row}:${seat?.seat}`, {
    message: 'seats не має містити те саме місце двічі',
  })
  @ValidateNested({ each: true })
  @Type(() => SeatDto)
  seats: SeatDto[];
}
