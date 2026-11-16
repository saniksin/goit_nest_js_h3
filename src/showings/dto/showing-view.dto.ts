import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { OBJECT_ID_EXAMPLE, OBJECT_ID_FORMAT } from '../../common/object-id';

// Сеанс після populate: на місці film і hall — документи з назвами
export interface PopulatedShowing {
  _id: Types.ObjectId;
  film: { _id: Types.ObjectId; title: string };
  hall: { _id: Types.ObjectId; name: string };
  startsAt: Date;
  price: number;
}

// Сеанс у відповідях на читання: назви фільму й залу замість ідентифікаторів,
// без масивів seats і bookings
export class ShowingViewDto {
  @ApiProperty({ example: OBJECT_ID_EXAMPLE, description: OBJECT_ID_FORMAT })
  id: string;

  @ApiProperty({ example: 'Дюна', description: 'Назва фільму' })
  filmTitle: string;

  @ApiProperty({ example: 'Зал 1', description: 'Назва залу' })
  hallName: string;

  @ApiProperty({ example: '2030-05-01T15:30:00.000Z' })
  startsAt: Date;

  @ApiProperty({ example: 12500, description: 'Ціна одного квитка в копійках' })
  price: number;

  static fromDocument(showing: PopulatedShowing): ShowingViewDto {
    const dto = new ShowingViewDto();
    dto.id = showing._id.toString();
    dto.filmTitle = showing.film.title;
    dto.hallName = showing.hall.name;
    dto.startsAt = showing.startsAt;
    dto.price = showing.price;
    return dto;
  }
}
