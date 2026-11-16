import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { SeatDto } from '../../halls/dto/seat.dto';
import { OBJECT_ID_EXAMPLE, OBJECT_ID_FORMAT } from '../../common/object-id';
import { BookingRecord } from '../schemas/booking.schema';

// Бронювання у відповідях: вкладений документ сеансу разом з id сеансу
export class BookingViewDto {
  @ApiProperty({ example: OBJECT_ID_EXAMPLE, description: OBJECT_ID_FORMAT })
  id: string;

  @ApiProperty({ example: '6650f1a2b3c4d5e6f7a8b9c3' })
  showingId: string;

  @ApiProperty({ type: [SeatDto], description: 'Заброньовані місця' })
  seats: SeatDto[];

  @ApiProperty({
    example: 25000,
    description: 'Ціна сеансу, помножена на кількість місць, у копійках',
  })
  totalPrice: number;

  @ApiProperty({ example: '2030-04-20T10:15:00.000Z' })
  createdAt: Date;

  static fromDocument(
    showingId: Types.ObjectId,
    booking: BookingRecord,
  ): BookingViewDto {
    const dto = new BookingViewDto();
    dto.id = booking._id.toString();
    dto.showingId = showingId.toString();
    dto.seats = booking.seats.map(({ row, seat }) => ({ row, seat }));
    dto.totalPrice = booking.totalPrice;
    dto.createdAt = booking.createdAt;
    return dto;
  }
}
