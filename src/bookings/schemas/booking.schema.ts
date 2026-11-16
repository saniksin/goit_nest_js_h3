import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

// Місце в записі бронювання: копія того, що видно з масиву seats сеансу,
// щоб віддати бронювання без перебору всіх місць залу
@Schema({ _id: false })
export class BookedSeat {
  @Prop({ required: true, min: 1 })
  row: number;

  @Prop({ required: true, min: 1 })
  seat: number;
}

export const BookedSeatSchema = SchemaFactory.createForClass(BookedSeat);

// Бронювання — вкладений документ у масиві bookings сеансу, окремої колекції немає.
// _id генерується в коді до запису, бо той самий id проставляється й у місця сеансу
@Schema({ versionKey: false })
export class Booking {
  @Prop({ type: [BookedSeatSchema], required: true })
  seats: BookedSeat[];

  @Prop({ required: true, min: 1 })
  totalPrice: number;

  @Prop({ required: true })
  createdAt: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

export type BookingRecord = Booking & { _id: Types.ObjectId };
