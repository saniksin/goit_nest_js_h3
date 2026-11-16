import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { CreateShowingDto } from './dto/create-showing.dto';
import { FindShowingsQueryDto } from './dto/find-showings-query.dto';
import { PaginatedShowingsDto } from './dto/paginated-showings.dto';
import { ShowingDto } from './dto/showing.dto';
import { PopulatedShowing, ShowingViewDto } from './dto/showing-view.dto';
import { SeatAvailabilityDto } from './dto/seat-availability.dto';
import { Showing } from './schemas/showing.schema';
import { ShowingSeat } from './schemas/showing-seat.schema';
import { FilmsService } from '../films/films.service';
import { HallsService } from '../halls/halls.service';
import { EnvironmentVariables } from '../config/environment-variables';
import { dayRange, parseDateTime } from '../common/time-zone';

// Поля сеансу для відповідей: масиви seats і bookings не вибираються з бази взагалі
const VIEW_FIELDS = 'film hall startsAt price';
const POPULATE_NAMES = [
  { path: 'film', select: 'title' },
  { path: 'hall', select: 'name' },
];

@Injectable()
export class ShowingsService {
  constructor(
    @InjectModel(Showing.name)
    private readonly showingModel: Model<Showing>,
    @Inject(forwardRef(() => FilmsService))
    private readonly filmsService: FilmsService,
    @Inject(forwardRef(() => HallsService))
    private readonly hallsService: HallsService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async create(createShowingDto: CreateShowingDto): Promise<ShowingDto> {
    const { filmId, hallId, startsAt, price } = createShowingDto;
    if (!(await this.filmsService.exists(filmId))) {
      throw new BadRequestException(`Фільм з id ${filmId} не знайдено`);
    }
    const hall = await this.hallsService.findById(hallId);
    if (hall === null) {
      throw new BadRequestException(`Зал з id ${hallId} не знайдено`);
    }
    const start = parseDateTime(
      startsAt,
      this.configService.get('CINEMA_TIMEZONE', { infer: true }),
    );
    if (start.getTime() <= Date.now()) {
      throw new BadRequestException('startsAt вказує на момент у минулому');
    }

    // Схема залу розгортається в масив місць сеансу, усі місця спочатку вільні
    const seats: ShowingSeat[] = this.hallsService
      .getSeats(hall)
      .map(({ row, seat }) => ({ row, seat, bookingId: null }));

    const showing = await this.showingModel.create({
      film: new Types.ObjectId(filmId),
      hall: new Types.ObjectId(hallId),
      startsAt: start,
      price,
      seats,
      bookings: [],
    });
    return ShowingDto.fromDocument(showing);
  }

  // Фільтрація, сортування й сторінка виконуються запитом до бази
  async findAll(query: FindShowingsQueryDto): Promise<PaginatedShowingsDto> {
    const { filmId, date, page, limit, sort } = query;

    const filter: QueryFilter<Showing> = {};
    if (filmId !== undefined) {
      filter.film = new Types.ObjectId(filmId);
    }
    if (date !== undefined) {
      // Межі доби в часовому поясі кінотеатру: [00:00 цієї дати; 00:00 наступної)
      const { from, to } = dayRange(
        date,
        this.configService.get('CINEMA_TIMEZONE', { infer: true }),
      );
      filter.startsAt = { $gte: from, $lt: to };
    }

    const [showings, total] = await Promise.all([
      this.showingModel
        .find(filter)
        .select(VIEW_FIELDS)
        .sort({ startsAt: sort === 'desc' ? -1 : 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(POPULATE_NAMES)
        .lean<PopulatedShowing[]>(),
      this.showingModel.countDocuments(filter),
    ]);

    return {
      items: showings.map((showing) => ShowingViewDto.fromDocument(showing)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<ShowingViewDto> {
    const showing = await this.showingModel
      .findById(id)
      .select(VIEW_FIELDS)
      .populate(POPULATE_NAMES)
      .lean<PopulatedShowing>();
    if (showing === null) {
      throw new NotFoundException(`Сеанс з id ${id} не знайдено`);
    }
    return ShowingViewDto.fromDocument(showing);
  }

  async getSeats(id: string): Promise<SeatAvailabilityDto[]> {
    const showing = await this.showingModel
      .findById(id)
      .select('seats')
      .lean<{ seats: ShowingSeat[] }>();
    if (showing === null) {
      throw new NotFoundException(`Сеанс з id ${id} не знайдено`);
    }
    return showing.seats.map((seat) => SeatAvailabilityDto.fromSeat(seat));
  }

  async existsForFilm(filmId: string): Promise<boolean> {
    return (await this.showingModel.exists({ film: filmId })) !== null;
  }

  async existsForHall(hallId: string): Promise<boolean> {
    return (await this.showingModel.exists({ hall: hallId })) !== null;
  }
}
