import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { ShowingsModule } from '../showings/showings.module';
import { HallsModule } from '../halls/halls.module';

// Окремої колекції бронювань немає: модуль працює з моделлю сеансів,
// яку експортує ShowingsModule
@Module({
  imports: [ShowingsModule, HallsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
