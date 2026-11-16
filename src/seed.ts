import 'reflect-metadata';
import 'dotenv/config';
import mongoose, { Model, Types } from 'mongoose';
import { validate } from './config/environment-variables';
import { Film, FilmSchema } from './films/schemas/film.schema';
import { Hall, HallSchema } from './halls/schemas/hall.schema';
import { Showing, ShowingSchema } from './showings/schemas/showing.schema';
import { BookingRecord } from './bookings/schemas/booking.schema';
import { hallSeats } from './halls/hall-seats';

// Фіксовані ідентифікатори роблять засівання ідемпотентним: кожен документ вставляється
// через upsert з $setOnInsert, тож повторний запуск знаходить той самий _id і нічого не змінює
const id = (hex: string) => new Types.ObjectId(hex);

const FILMS = [
  {
    _id: id('665000000000000000000001'),
    title: 'Дюна: Частина друга',
    durationMinutes: 166,
    releaseYear: 2024,
  },
  {
    _id: id('665000000000000000000002'),
    title: 'Тіні забутих предків',
    durationMinutes: 97,
    releaseYear: 1965,
  },
];

const HALLS = [
  {
    _id: id('665000000000000000000011'),
    name: 'Червоний зал',
    rows: 5,
    seatsPerRow: 8,
  },
  {
    _id: id('665000000000000000000012'),
    name: 'Малий зал',
    rows: 3,
    seatsPerRow: 5,
  },
];

// Сеанси в різні дати, починаючи із завтрашнього дня, о 18:00 UTC
function daysFromNow(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(18, 0, 0, 0);
  return date;
}

const SHOWING_PLAN = [
  {
    _id: id('665000000000000000000021'),
    film: 0,
    hall: 0,
    days: 1,
    price: 18000,
  },
  {
    _id: id('665000000000000000000022'),
    film: 1,
    hall: 1,
    days: 2,
    price: 9000,
  },
  {
    _id: id('665000000000000000000023'),
    film: 0,
    hall: 1,
    days: 3,
    price: 15000,
  },
  {
    _id: id('665000000000000000000024'),
    film: 1,
    hall: 0,
    days: 4,
    price: 12500,
  },
];

// Одне бронювання двох місць на першому сеансі
const BOOKING: BookingRecord = {
  _id: id('665000000000000000000031'),
  seats: [
    { row: 3, seat: 4 },
    { row: 3, seat: 5 },
  ],
  totalPrice: SHOWING_PLAN[0].price * 2,
  createdAt: new Date(),
};

const SHOWINGS = SHOWING_PLAN.map((plan, index) => {
  const hall = HALLS[plan.hall];
  const bookings = index === 0 ? [BOOKING] : [];
  const isBooked = (row: number, seat: number) =>
    bookings.some((booking) =>
      booking.seats.some((s) => s.row === row && s.seat === seat),
    );
  return {
    _id: plan._id,
    film: FILMS[plan.film]._id,
    hall: hall._id,
    startsAt: daysFromNow(plan.days),
    price: plan.price,
    seats: hallSeats(hall.rows, hall.seatsPerRow).map(({ row, seat }) => ({
      row,
      seat,
      bookingId: isBooked(row, seat) ? BOOKING._id : null,
    })),
    bookings,
  };
});

async function insertMissing<T>(
  model: Model<T>,
  documents: { _id: Types.ObjectId }[],
): Promise<void> {
  await model.bulkWrite(
    documents.map((document) => ({
      updateOne: {
        filter: { _id: document._id },
        update: { $setOnInsert: document },
        upsert: true,
      },
    })),
  );
}

async function seed() {
  const env = validate(process.env);
  await mongoose.connect(env.MONGODB_URI);
  try {
    const FilmModel = mongoose.model(Film.name, FilmSchema);
    const HallModel = mongoose.model(Hall.name, HallSchema);
    const ShowingModel = mongoose.model(Showing.name, ShowingSchema);
    // Індекси схем (зокрема унікальна назва залу) створюються до запису даних
    await Promise.all([
      FilmModel.init(),
      HallModel.init(),
      ShowingModel.init(),
    ]);

    await insertMissing(FilmModel, FILMS);
    await insertMissing(HallModel, HALLS);
    await insertMissing(ShowingModel, SHOWINGS);

    const [films, halls, showings, bookings] = await Promise.all([
      FilmModel.countDocuments(),
      HallModel.countDocuments(),
      ShowingModel.countDocuments(),
      ShowingModel.aggregate<{ n: number }>([
        { $unwind: '$bookings' },
        { $count: 'n' },
      ]),
    ]);
    console.log(
      `Засівання завершено. У базі — фільмів: ${films}, залів: ${halls}, сеансів: ${showings}, бронювань: ${bookings[0]?.n ?? 0}`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error('Засівання не вдалося:', error);
  process.exitCode = 1;
});
