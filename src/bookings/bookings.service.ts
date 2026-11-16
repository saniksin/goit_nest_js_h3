import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingViewDto } from './dto/booking-view.dto';
import { Booking, BookingRecord } from './schemas/booking.schema';
import { Showing } from '../showings/schemas/showing.schema';
import { HallRecord } from '../halls/schemas/hall.schema';
import { HallsService } from '../halls/halls.service';

// Бронювання з усіх сеансів у порядку створення
const ALL_BOOKINGS_PIPELINE: PipelineStage[] = [
  { $unwind: '$bookings' },
  { $sort: { 'bookings.createdAt': 1, 'bookings._id': 1 } },
  { $project: { _id: 0, showingId: '$_id', booking: '$bookings' } },
];

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Showing.name)
    private readonly showingModel: Model<Showing>,
    private readonly hallsService: HallsService,
  ) {}

  // Бронювання лежать усередині документів сеансів, тож вибірка збирає їх з усіх сеансів
  async findAll(): Promise<BookingViewDto[]> {
    const rows = await this.showingModel.aggregate<{
      showingId: Types.ObjectId;
      booking: BookingRecord;
    }>(ALL_BOOKINGS_PIPELINE);
    return rows.map(({ showingId, booking }) =>
      BookingViewDto.fromDocument(showingId, booking),
    );
  }

  async findByShowing(showingId: string): Promise<BookingViewDto[]> {
    const showing = await this.showingModel
      .findById(showingId)
      .select('bookings')
      .lean<{ _id: Types.ObjectId; bookings: BookingRecord[] }>();
    if (showing === null) {
      throw new NotFoundException(`Сеанс з id ${showingId} не знайдено`);
    }
    return showing.bookings.map((booking) =>
      BookingViewDto.fromDocument(showing._id, booking),
    );
  }

  async create(
    showingId: string,
    createBookingDto: CreateBookingDto,
  ): Promise<BookingViewDto> {
    // Читаємо лише ціну й зал сеансу: зайнятість місць тут не перевіряється,
    // її перевіряє умова самого оновлення нижче
    const showing = await this.showingModel
      .findById(showingId)
      .select('price hall')
      .populate<{ hall: HallRecord }>('hall', 'name rows seatsPerRow')
      .lean<{ _id: Types.ObjectId; price: number; hall: HallRecord }>();
    if (showing === null) {
      throw new NotFoundException(`Сеанс з id ${showingId} не знайдено`);
    }

    // Межі залу перевіряються до оновлення: фільтр оновлення не відрізняє
    // неіснуюче місце від зайнятого й дав би 409 замість 400.
    // Унікальність місць у запиті вже перевірив CreateBookingDto
    const seats = createBookingDto.seats.map(({ row, seat }) => ({
      row,
      seat,
    }));
    const outside = seats.find(
      (seat) => !this.hallsService.hasSeat(showing.hall, seat),
    );
    if (outside) {
      throw new BadRequestException(
        `Місця ряд ${outside.row}, місце ${outside.seat} немає в залі "${showing.hall.name}"`,
      );
    }

    // id бронювання потрібен і в $set, і в $push, тому створюється до запису
    const booking: BookingRecord = {
      _id: new Types.ObjectId(),
      seats,
      totalPrice: showing.price * seats.length,
      createdAt: new Date(),
    };

    // Одне атомарне оновлення документа сеансу: фільтр пропускає документ лише тоді,
    // коли кожне потрібне місце вільне, а оновлення займає місця й додає бронювання
    const result = await this.showingModel.updateOne(
      {
        _id: showing._id,
        $and: seats.map(({ row, seat }) => ({
          seats: { $elemMatch: { row, seat, bookingId: null } },
        })),
      },
      {
        $set: { 'seats.$[target].bookingId': booking._id },
        $push: { bookings: booking satisfies Booking },
      },
      {
        arrayFilters: [
          {
            $or: seats.map(({ row, seat }) => ({
              'target.row': row,
              'target.seat': seat,
            })),
          },
        ],
      },
    );

    // Сеанс існує, межі й унікальність перевірені, тож 0 означає лише одне:
    // хоча б одне місце вже зайняте. Документ при цьому не змінився
    if (result.matchedCount === 0) {
      throw new ConflictException(
        'Одне або кілька місць уже заброньовані на цьому сеансі',
      );
    }

    return BookingViewDto.fromDocument(showing._id, booking);
  }

  async remove(id: string): Promise<void> {
    const bookingId = new Types.ObjectId(id);
    // Сеанс шукається за вкладеним бронюванням; звільнення місць і видалення запису
    // виконуються одним оновленням
    const result = await this.showingModel.updateOne(
      { 'bookings._id': bookingId },
      {
        $set: { 'seats.$[target].bookingId': null },
        $pull: { bookings: { _id: bookingId } },
      },
      { arrayFilters: [{ 'target.bookingId': bookingId }] },
    );
    if (result.matchedCount === 0) {
      throw new NotFoundException(`Бронювання з id ${id} не знайдено`);
    }
  }
}
