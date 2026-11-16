import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';

// Місце залу на конкретному сеансі. Масив таких місць заповнюється при створенні сеансу
// і є джерелом істини про зайнятість: місце вільне, поки bookingId дорівнює null
@Schema({ _id: false })
export class ShowingSeat {
  @Prop({ required: true, min: 1 })
  row: number;

  @Prop({ required: true, min: 1 })
  seat: number;

  // Посилання на елемент масиву bookings цього ж сеансу
  @Prop({ type: mongoose.Schema.Types.ObjectId, default: null })
  bookingId: Types.ObjectId | null;
}

export const ShowingSeatSchema = SchemaFactory.createForClass(ShowingSeat);
