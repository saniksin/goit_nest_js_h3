import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShowingsController } from './showings.controller';
import { ShowingsService } from './showings.service';
import { Showing, ShowingSchema } from './schemas/showing.schema';
import { FilmsModule } from '../films/films.module';
import { HallsModule } from '../halls/halls.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Showing.name, schema: ShowingSchema }]),
    forwardRef(() => FilmsModule),
    forwardRef(() => HallsModule),
  ],
  controllers: [ShowingsController],
  providers: [ShowingsService],
  // Модель сеансів потрібна модулю бронювань: бронювання лежать усередині документа сеансу
  exports: [ShowingsService, MongooseModule],
})
export class ShowingsModule {}
