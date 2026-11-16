import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HallsController } from './halls.controller';
import { HallsService } from './halls.service';
import { Hall, HallSchema } from './schemas/hall.schema';
import { ShowingsModule } from '../showings/showings.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Hall.name, schema: HallSchema }]),
    // Сеанс перевіряє зал, а видалення залу перевіряє наявність сеансів
    forwardRef(() => ShowingsModule),
  ],
  controllers: [HallsController],
  providers: [HallsService],
  exports: [HallsService],
})
export class HallsModule {}
