import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Film } from '../../films/schemas/film.schema';
import { Hall } from '../../halls/schemas/hall.schema';
import { ShowingSeat, ShowingSeatSchema } from './showing-seat.schema';
import {
  Booking,
  BookingRecord,
  BookingSchema,
} from '../../bookings/schemas/booking.schema';

export type ShowingDocument = HydratedDocument<Showing>;

// Документ сеансу з lean-запиту: вкладені бронювання теж мають свій _id
export type ShowingRecord = Omit<Showing, 'bookings'> & {
  _id: Types.ObjectId;
  bookings: BookingRecord[];
};

// Сеанс зберігає свої місця й бронювання всередині документа: зайняти місця й записати
// бронювання можна одним атомарним оновленням одного документа, без транзакції
@Schema({ collection: 'showings', versionKey: false })
export class Showing {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Film.name,
    required: true,
  })
  film: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Hall.name,
    required: true,
  })
  hall: Types.ObjectId;

  @Prop({ required: true })
  startsAt: Date;

  @Prop({ required: true, min: 1 })
  price: number;

  @Prop({ type: [ShowingSeatSchema], required: true })
  seats: ShowingSeat[];

  @Prop({ type: [BookingSchema], default: [] })
  bookings: Booking[];
}

export const ShowingSchema = SchemaFactory.createForClass(Showing);

// Розклад сортується за startsAt, а за однакового часу — за _id
ShowingSchema.index({ startsAt: 1, _id: 1 });
// Фільтр розкладу за фільмом і перевірка залежних сеансів перед видаленням фільму чи залу
ShowingSchema.index({ film: 1, startsAt: 1 });
ShowingSchema.index({ hall: 1 });
// Скасування шукає сеанс за вкладеним бронюванням
ShowingSchema.index({ 'bookings._id': 1 });
