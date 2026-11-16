import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types, mongo } from 'mongoose';
import { HallsService } from './halls.service';
import { Hall } from './schemas/hall.schema';
import { ShowingsService } from '../showings/showings.service';

describe('HallsService', () => {
  let service: HallsService;
  const hallModel = {
    init: vi.fn(),
    create: vi.fn(),
    exists: vi.fn(),
    deleteOne: vi.fn(),
  };
  const showingsService = { existsForHall: vi.fn() };
  const hall = { rows: 3, seatsPerRow: 5 };
  const hallId = new Types.ObjectId().toString();

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HallsService,
        { provide: getModelToken(Hall.name), useValue: hallModel },
        { provide: ShowingsService, useValue: showingsService },
      ],
    }).compile();
    service = module.get(HallsService);
  });

  it('обчислює перелік місць із рядів і місць у ряду', () => {
    const seats = service.getSeats(hall);
    expect(seats).toHaveLength(15);
    expect(seats[0]).toEqual({ row: 1, seat: 1 });
    expect(seats[14]).toEqual({ row: 3, seat: 5 });
  });

  it('перевіряє межі залу', () => {
    expect(service.hasSeat(hall, { row: 3, seat: 5 })).toBe(true);
    expect(service.hasSeat(hall, { row: 4, seat: 1 })).toBe(false);
    expect(service.hasSeat(hall, { row: 1, seat: 6 })).toBe(false);
  });

  it('перетворює порушення унікального індексу назви на 409', async () => {
    hallModel.create.mockRejectedValue(
      new mongo.MongoServerError({
        code: 11000,
        errmsg: 'E11000 duplicate key',
      }),
    );
    await expect(
      service.create({ name: 'Зал 1', rows: 1, seatsPerRow: 1 }),
    ).rejects.toThrow(ConflictException);
  });

  it('не видаляє зал, на який посилається сеанс', async () => {
    hallModel.exists.mockResolvedValue({ _id: hallId });
    showingsService.existsForHall.mockResolvedValue(true);
    await expect(service.remove(hallId)).rejects.toThrow(ConflictException);
    expect(hallModel.deleteOne).not.toHaveBeenCalled();
  });

  it('404 при видаленні неіснуючого залу', async () => {
    hallModel.exists.mockResolvedValue(null);
    await expect(service.remove(hallId)).rejects.toThrow(NotFoundException);
  });
});
