import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BookingsService } from './bookings.service';
import { Showing } from '../showings/schemas/showing.schema';
import { HallsService } from '../halls/halls.service';

describe('BookingsService', () => {
  let service: BookingsService;
  const showingId = new Types.ObjectId();
  const showing = {
    _id: showingId,
    price: 12500,
    hall: { _id: new Types.ObjectId(), name: 'Зал 1', rows: 3, seatsPerRow: 5 },
  };
  // Ланцюжок findById().select().populate().lean() повертає підготовлений сеанс
  const query = {
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    lean: vi.fn(),
  };
  const showingModel = {
    findById: vi.fn(() => query),
    updateOne: vi.fn(),
    aggregate: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    query.lean.mockResolvedValue(showing);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        HallsService,
        { provide: getModelToken(Showing.name), useValue: showingModel },
      ],
    })
      .overrideProvider(HallsService)
      .useValue({
        hasSeat: (
          hall: { rows: number; seatsPerRow: number },
          seat: { row: number; seat: number },
        ) => seat.row <= hall.rows && seat.seat <= hall.seatsPerRow,
      })
      .compile();
    service = module.get(BookingsService);
  });

  const seats = [
    { row: 1, seat: 1 },
    { row: 1, seat: 2 },
  ];

  it('займає місця й записує бронювання одним updateOne з умовою вільних місць', async () => {
    showingModel.updateOne.mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
    });
    const booking = await service.create(showingId.toString(), { seats });

    expect(showingModel.updateOne).toHaveBeenCalledTimes(1);
    const [filter, update, options] = showingModel.updateOne.mock.calls[0];
    expect(filter).toEqual({
      _id: showingId,
      $and: seats.map(({ row, seat }) => ({
        seats: { $elemMatch: { row, seat, bookingId: null } },
      })),
    });
    const bookingId = update.$set['seats.$[target].bookingId'];
    expect(bookingId).toBeInstanceOf(Types.ObjectId);
    expect(update.$push.bookings).toMatchObject({
      _id: bookingId,
      seats,
      totalPrice: 25000,
    });
    expect(options.arrayFilters).toEqual([
      {
        $or: seats.map(({ row, seat }) => ({
          'target.row': row,
          'target.seat': seat,
        })),
      },
    ]);
    expect(booking).toMatchObject({
      id: bookingId.toString(),
      showingId: showingId.toString(),
      totalPrice: 25000,
    });
  });

  it('matchedCount = 0 означає зайняте місце: 409', async () => {
    showingModel.updateOne.mockResolvedValue({
      matchedCount: 0,
      modifiedCount: 0,
    });
    await expect(
      service.create(showingId.toString(), { seats }),
    ).rejects.toThrow(ConflictException);
  });

  it('місце поза схемою залу дає 400 ще до оновлення', async () => {
    await expect(
      service.create(showingId.toString(), { seats: [{ row: 4, seat: 1 }] }),
    ).rejects.toThrow(BadRequestException);
    expect(showingModel.updateOne).not.toHaveBeenCalled();
  });

  it('404, якщо сеансу немає', async () => {
    query.lean.mockResolvedValue(null);
    await expect(
      service.create(showingId.toString(), { seats }),
    ).rejects.toThrow(NotFoundException);
    expect(showingModel.updateOne).not.toHaveBeenCalled();
  });

  it('скасування звільняє місця й видаляє запис одним оновленням', async () => {
    const bookingId = new Types.ObjectId();
    showingModel.updateOne.mockResolvedValue({ matchedCount: 1 });
    await service.remove(bookingId.toString());
    expect(showingModel.updateOne).toHaveBeenCalledWith(
      { 'bookings._id': bookingId },
      {
        $set: { 'seats.$[target].bookingId': null },
        $pull: { bookings: { _id: bookingId } },
      },
      { arrayFilters: [{ 'target.bookingId': bookingId }] },
    );

    showingModel.updateOne.mockResolvedValue({ matchedCount: 0 });
    await expect(service.remove(bookingId.toString())).rejects.toThrow(
      NotFoundException,
    );
  });
});
