import { ApiProperty } from '@nestjs/swagger';
import { HallDto } from './hall.dto';
import { SeatDto } from './seat.dto';

export class HallWithSeatsDto extends HallDto {
  @ApiProperty({ type: [SeatDto], description: 'Усі місця залу' })
  seats: SeatDto[];
}
