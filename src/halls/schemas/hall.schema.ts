import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type HallDocument = HydratedDocument<Hall>;

export type HallRecord = Hall & { _id: Types.ObjectId };

// Перелік місць у документі залу не зберігається: його обчислює сервіс із rows і seatsPerRow
@Schema({ collection: 'halls', versionKey: false })
export class Hall {
  // unique: true створює унікальний індекс на назві залу
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, min: 1 })
  rows: number;

  @Prop({ required: true, min: 1 })
  seatsPerRow: number;
}

export const HallSchema = SchemaFactory.createForClass(Hall);
