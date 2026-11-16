import { ApiProperty } from '@nestjs/swagger';
import { SeatDto } from '../../halls/dto/seat.dto';
import { ShowingSeat } from '../schemas/showing-seat.schema';

export class SeatAvailabilityDto extends SeatDto {
  @ApiProperty({
    example: false,
    description: 'Чи зайняте місце на цьому сеансі',
  })
  isBooked: boolean;

  // isBooked обчислюється з bookingId: місце вільне, поки посилання на бронювання немає
  static fromSeat(seat: ShowingSeat): SeatAvailabilityDto {
    const dto = new SeatAvailabilityDto();
    dto.row = seat.row;
    dto.seat = seat.seat;
    dto.isBooked = seat.bookingId !== null;
    return dto;
  }
}
