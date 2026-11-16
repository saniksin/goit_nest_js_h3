import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FilmDocument = HydratedDocument<Film>;

// Документ фільму в тому вигляді, у якому його повертає lean-запит
export type FilmRecord = Film & { _id: Types.ObjectId };

@Schema({ collection: 'films', versionKey: false })
export class Film {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, min: 1 })
  durationMinutes: number;

  @Prop({ required: true, min: 1 })
  releaseYear: number;
}

export const FilmSchema = SchemaFactory.createForClass(Film);
