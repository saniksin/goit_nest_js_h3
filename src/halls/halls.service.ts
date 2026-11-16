import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateHallDto } from './dto/create-hall.dto';
import { HallDto } from './dto/hall.dto';
import { HallWithSeatsDto } from './dto/hall-with-seats.dto';
import { SeatDto } from './dto/seat.dto';
import { hallSeats } from './hall-seats';
import { Hall, HallRecord } from './schemas/hall.schema';
import { ShowingsService } from '../showings/showings.service';
import { isDuplicateKeyError } from '../common/mongo-errors';

type HallLayout = Pick<Hall, 'rows' | 'seatsPerRow'>;

@Injectable()
export class HallsService implements OnModuleInit {
  constructor(
    @InjectModel(Hall.name)
    private readonly hallModel: Model<Hall>,
    @Inject(forwardRef(() => ShowingsService))
    private readonly showingsService: ShowingsService,
  ) {}

  // Унікальний індекс на назві має існувати до першого запиту, інакше дубль пройде
  async onModuleInit(): Promise<void> {
    await this.hallModel.init();
  }

  async findAll(): Promise<HallDto[]> {
    const halls = await this.hallModel
      .find()
      .sort({ name: 1 })
      .lean<HallRecord[]>();
    return halls.map((hall) => HallDto.fromDocument(hall));
  }

  // Повертає null, якщо залу немає: сервіс сеансів сам вирішує, який статус віддати
  async findById(id: string): Promise<HallDto | null> {
    const hall = await this.hallModel.findById(id).lean<HallRecord>();
    return hall === null ? null : HallDto.fromDocument(hall);
  }

  async findOneWithSeats(id: string): Promise<HallWithSeatsDto> {
    const hall = await this.findById(id);
    if (hall === null) {
      throw new NotFoundException(`Зал з id ${id} не знайдено`);
    }
    return { ...hall, seats: this.getSeats(hall) };
  }

  getSeats(hall: HallLayout): SeatDto[] {
    return hallSeats(hall.rows, hall.seatsPerRow);
  }

  hasSeat(hall: HallLayout, { row, seat }: SeatDto): boolean {
    return row <= hall.rows && seat <= hall.seatsPerRow;
  }

  async create(createHallDto: CreateHallDto): Promise<HallDto> {
    try {
      const hall = await this.hallModel.create({
        name: createHallDto.name,
        rows: createHallDto.rows,
        seatsPerRow: createHallDto.seatsPerRow,
      });
      return HallDto.fromDocument(hall);
    } catch (error) {
      // Унікальність назви тримає унікальний індекс halls.name
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          `Зал з назвою "${createHallDto.name}" вже існує`,
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    if ((await this.hallModel.exists({ _id: id })) === null) {
      throw new NotFoundException(`Зал з id ${id} не знайдено`);
    }
    // Зовнішніх ключів у MongoDB немає, тому залежні сеанси шукаємо запитом
    if (await this.showingsService.existsForHall(id)) {
      throw new ConflictException(
        `Зал з id ${id} не можна видалити: на нього посилається хоча б один сеанс`,
      );
    }
    await this.hallModel.deleteOne({ _id: id });
  }
}
