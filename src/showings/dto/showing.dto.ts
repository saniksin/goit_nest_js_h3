import { ApiProperty } from '@nestjs/swagger';
import { OBJECT_ID_EXAMPLE, OBJECT_ID_FORMAT } from '../../common/object-id';
import { ShowingRecord } from '../schemas/showing.schema';

// Створений сеанс у відповіді POST /showings. Масиви seats і bookings не віддаються
export class ShowingDto {
  @ApiProperty({ example: OBJECT_ID_EXAMPLE, description: OBJECT_ID_FORMAT })
  id: string;

  @ApiProperty({ example: '6650f1a2b3c4d5e6f7a8b9c1' })
  filmId: string;

  @ApiProperty({ example: '6650f1a2b3c4d5e6f7a8b9c2' })
  hallId: string;

  @ApiProperty({ example: '2030-05-01T15:30:00.000Z' })
  startsAt: Date;

  @ApiProperty({ example: 12500, description: 'Ціна одного квитка в копійках' })
  price: number;

  static fromDocument(
    showing: Pick<
      ShowingRecord,
      '_id' | 'film' | 'hall' | 'startsAt' | 'price'
    >,
  ): ShowingDto {
    const dto = new ShowingDto();
    dto.id = showing._id.toString();
    dto.filmId = showing.film.toString();
    dto.hallId = showing.hall.toString();
    dto.startsAt = showing.startsAt;
    dto.price = showing.price;
    return dto;
  }
}
