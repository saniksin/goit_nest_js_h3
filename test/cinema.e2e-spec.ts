import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { INestApplication } from '@nestjs/common';
import { configureApp } from './../src/app.setup';
import { Film } from './../src/films/schemas/film.schema';
import { Hall } from './../src/halls/schemas/hall.schema';
import {
  Showing,
  ShowingRecord,
} from './../src/showings/schemas/showing.schema';

// Коректний за формою ObjectId, якого немає в базі
const missingId = '665fffffffffffffffffffff';
const invalidId = 'not-an-object-id';

describe('Cinema API (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let filmModel: Model<Film>;
  let showingModel: Model<Showing>;
  let hallModel: Model<Hall>;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    connection = app.get(getConnectionToken());
    showingModel = app.get(getModelToken(Showing.name));
    hallModel = app.get(getModelToken(Hall.name));
    filmModel = app.get(getModelToken(Film.name));
    http = request(app.getHttpServer());
  });

  // Колекції очищуються, а не видаляються: унікальний індекс на назві залу лишається
  beforeEach(async () => {
    await Promise.all([
      filmModel.deleteMany({}),
      hallModel.deleteMany({}),
      showingModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await app.close();
  });

  const rawShowing = async (id: string) =>
    showingModel.findById(id).lean<ShowingRecord>().orFail();
  const countBookings = async () =>
    (
      await showingModel.aggregate<{ n: number }>([
        { $unwind: '$bookings' },
        { $count: 'n' },
      ])
    )[0]?.n ?? 0;
  const countBookedSeats = async () =>
    (
      await showingModel.aggregate<{ n: number }>([
        { $unwind: '$seats' },
        { $match: { 'seats.bookingId': { $ne: null } } },
        { $count: 'n' },
      ])
    )[0]?.n ?? 0;

  const createFilm = async (title = 'Дюна') =>
    (
      await http
        .post('/films')
        .send({ title, durationMinutes: 155, releaseYear: 2021 })
        .expect(201)
    ).body;
  const createHall = async (name = 'Зал 1', rows = 3, seatsPerRow = 5) =>
    (await http.post('/halls').send({ name, rows, seatsPerRow }).expect(201))
      .body;
  const inDays = (days: number, hour = 12) => {
    const date = new Date(Date.now() + days * 86_400_000);
    date.setUTCHours(hour, 0, 0, 0);
    return date.toISOString();
  };
  const createShowing = async (
    filmId: string,
    hallId: string,
    startsAt = inDays(5),
    price = 12500,
  ) =>
    (
      await http
        .post('/showings')
        .send({ filmId, hallId, startsAt, price })
        .expect(201)
    ).body;
  const ids = (items: { id: string }[]) => items.map((item) => item.id);

  describe('помилки', () => {
    it('мають єдину структуру: statusCode, timestamp, path, message', async () => {
      const res = await http.get(`/films/${missingId}`).expect(404);
      expect(res.body).toEqual({
        statusCode: 404,
        timestamp: expect.any(String),
        path: `/films/${missingId}`,
        message: `Фільм з id ${missingId} не знайдено`,
      });
      const invalid = await http.post('/films').send({}).expect(400);
      expect(invalid.body).toMatchObject({ statusCode: 400, path: '/films' });
      expect(invalid.body.message).toEqual(expect.any(Array));
    });
  });

  describe('ідентифікатори', () => {
    it('некоректний формат ObjectId дає 400 до звернення до бази', async () => {
      const routes: [string, string][] = [
        ['get', `/films/${invalidId}`],
        ['patch', `/films/${invalidId}`],
        ['delete', `/films/${invalidId}`],
        ['get', `/halls/${invalidId}`],
        ['delete', `/halls/${invalidId}`],
        ['get', `/showings/${invalidId}`],
        ['get', `/showings/${invalidId}/seats`],
        ['get', `/showings/${invalidId}/bookings`],
        ['post', `/showings/${invalidId}/bookings`],
        ['delete', `/bookings/${invalidId}`],
        ['get', `/showings?filmId=${invalidId}`],
        // 12 символів: mongoose.isValidObjectId прийняв би такий рядок, а API — ні
        ['get', '/films/aaaaaaaaaaaa'],
      ];
      for (const [method, url] of routes) {
        const res = await http[method as 'get'](url)
          .send({ seats: [{ row: 1, seat: 1 }] })
          .expect(400);
        expect(JSON.stringify(res.body.message)).toContain('ObjectId');
      }
    });

    it('у відповідях id — рядок, внутрішнього _id немає', async () => {
      const film = await createFilm();
      expect(film.id).toMatch(/^[0-9a-f]{24}$/);
      expect(film).not.toHaveProperty('_id');
      const hall = await createHall();
      expect(hall).not.toHaveProperty('_id');
      const showing = await createShowing(film.id, hall.id);
      const views = [
        (await http.get(`/showings/${showing.id}`).expect(200)).body,
        (await http.get('/showings').expect(200)).body.items[0],
      ];
      for (const view of views) {
        expect(Object.keys(view).sort()).toEqual(
          ['filmTitle', 'hallName', 'id', 'price', 'startsAt'].sort(),
        );
      }
    });
  });

  describe('films', () => {
    it('створює, читає, оновлює й видаляє фільм', async () => {
      await http.get('/films').expect(200, []);
      const film = await createFilm();
      expect(film).toEqual({
        id: expect.any(String),
        title: 'Дюна',
        durationMinutes: 155,
        releaseYear: 2021,
      });
      await http.get(`/films/${film.id}`).expect(200, film);
      await http.get('/films').expect(200, [film]);
      const updated = await http
        .patch(`/films/${film.id}`)
        .send({ title: 'Дюна 2' })
        .expect(200);
      expect(updated.body).toEqual({ ...film, title: 'Дюна 2' });
      await http.delete(`/films/${film.id}`).expect(204).expect('');
      await http.get(`/films/${film.id}`).expect(404);
    });

    it('400 на відсутнє поле, неправильний тип і null у PATCH', async () => {
      await http.post('/films').send({ title: 'X' }).expect(400);
      await http
        .post('/films')
        .send({ title: 'X', durationMinutes: '100', releaseYear: 2020 })
        .expect(400);
      await http
        .post('/films')
        .send({ title: 'X', durationMinutes: 90, releaseYear: -5 })
        .expect(400);
      // Більше за верхню межу цілих полів — 400
      await http
        .post('/films')
        .send({ title: 'X', durationMinutes: 3_000_000_000, releaseYear: 2000 })
        .expect(400);
      const film = await createFilm();
      await http
        .patch(`/films/${film.id}`)
        .send({ releaseYear: 'давно' })
        .expect(400);
      await http.patch(`/films/${film.id}`).send({ title: null }).expect(400);
      // Назва з самих пробілів — 400, а не помилка валідації схеми
      await http.patch(`/films/${film.id}`).send({ title: '   ' }).expect(400);
      await http
        .post('/films')
        .send({ title: '  ', durationMinutes: 90, releaseYear: 2000 })
        .expect(400);
      await http.get(`/films/${film.id}`).expect(200, film);
    });

    it('не пропускає зайві поля до сервісу', async () => {
      const res = await http
        .post('/films')
        .send({
          title: 'X',
          durationMinutes: 90,
          releaseYear: 2000,
          id: missingId,
        })
        .expect(201);
      expect(res.body.id).not.toBe(missingId);
    });

    it('404 для невідомого id', async () => {
      await http.get(`/films/${missingId}`).expect(404);
      await http.patch(`/films/${missingId}`).send({}).expect(404);
      await http.delete(`/films/${missingId}`).expect(404);
    });

    it('409 при видаленні фільму з сеансом, фільм лишається', async () => {
      const film = await createFilm();
      const hall = await createHall();
      await createShowing(film.id, hall.id);
      const res = await http.delete(`/films/${film.id}`).expect(409);
      expect(res.body.message).toContain('сеанс');
      await http.get(`/films/${film.id}`).expect(200);
    });
  });

  describe('halls', () => {
    it('повертає зал із переліком місць потрібної довжини', async () => {
      const hall = await createHall();
      const res = await http.get(`/halls/${hall.id}`).expect(200);
      expect(res.body.seats).toHaveLength(15);
      expect(res.body.seats[0]).toEqual({ row: 1, seat: 1 });
      expect(res.body.seats[14]).toEqual({ row: 3, seat: 5 });
      await http.get('/halls').expect(200, [hall]);
      await http.delete(`/halls/${hall.id}`).expect(204);
      await http.get(`/halls/${hall.id}`).expect(404);
    });

    it('400 на невалідні дані, 409 на дубль назви', async () => {
      await http.post('/halls').send({ name: 'A', rows: 3 }).expect(400);
      await http
        .post('/halls')
        .send({ name: 'A', rows: '3', seatsPerRow: 5 })
        .expect(400);
      await http
        .post('/halls')
        .send({ name: 'A', rows: 0, seatsPerRow: 5 })
        .expect(400);
      await http
        .post('/halls')
        .send({ name: 'A', rows: 3_000_000_000, seatsPerRow: 5 })
        .expect(400);
      await http
        .post('/halls')
        .send({ name: 'A', rows: 3, seatsPerRow: 101 })
        .expect(400);
      await http
        .post('/halls')
        .send({ name: '   ', rows: 3, seatsPerRow: 5 })
        .expect(400);
      await createHall('A');
      // Назва обрізається до перевірки унікальності
      await http
        .post('/halls')
        .send({ name: '  A  ', rows: 1, seatsPerRow: 1 })
        .expect(409);
      await http
        .post('/halls')
        .send({ name: 'A', rows: 1, seatsPerRow: 1 })
        .expect(409);
      expect(await hallModel.countDocuments()).toBe(1);
    });

    it('404 для невідомого залу, 409 при видаленні залу з сеансом', async () => {
      await http.get(`/halls/${missingId}`).expect(404);
      await http.delete(`/halls/${missingId}`).expect(404);
      const film = await createFilm();
      const hall = await createHall();
      await createShowing(film.id, hall.id);
      await http.delete(`/halls/${hall.id}`).expect(409);
    });
  });

  describe('showings', () => {
    it('створює сеанс і віддає його з назвами фільму й залу', async () => {
      const film = await createFilm();
      const hall = await createHall();
      const startsAt = inDays(5);
      const showing = await createShowing(film.id, hall.id, startsAt);
      expect(showing).toEqual({
        id: expect.any(String),
        filmId: film.id,
        hallId: hall.id,
        startsAt,
        price: 12500,
      });
      await http.get(`/showings/${showing.id}`).expect(200, {
        id: showing.id,
        filmTitle: 'Дюна',
        hallName: 'Зал 1',
        startsAt,
        price: 12500,
      });
      await http.get(`/showings/${missingId}`).expect(404);

      // Документ сеансу містить місця залу (усі вільні) і порожній масив бронювань
      const raw = await rawShowing(showing.id);
      expect(raw.seats).toHaveLength(15);
      expect(raw.seats[0]).toEqual({ row: 1, seat: 1, bookingId: null });
      expect(raw.seats[14]).toEqual({ row: 3, seat: 5, bookingId: null });
      expect(raw.bookings).toEqual([]);
      expect(raw.film).toBeInstanceOf(Types.ObjectId);
    });

    it('400 з причиною на невалідні дані', async () => {
      const film = await createFilm();
      const hall = await createHall();
      const base = {
        filmId: film.id,
        hallId: hall.id,
        startsAt: inDays(3),
        price: 100,
      };

      const noFilm = await http
        .post('/showings')
        .send({ ...base, filmId: missingId })
        .expect(400);
      expect(noFilm.body.message).toContain('Фільм');
      const noHall = await http
        .post('/showings')
        .send({ ...base, hallId: missingId })
        .expect(400);
      expect(noHall.body.message).toContain('Зал');
      const past = await http
        .post('/showings')
        .send({ ...base, startsAt: '2000-01-01T10:00:00Z' })
        .expect(400);
      expect(past.body.message).toContain('минулому');

      for (const startsAt of [
        'завтра',
        '2030-02-30T10:00:00Z',
        '20990501T120000Z',
        '2099-05-01',
      ]) {
        await http
          .post('/showings')
          .send({ ...base, startsAt })
          .expect(400);
      }
      for (const price of [0, 99.5, '100', 3_000_000_000]) {
        await http
          .post('/showings')
          .send({ ...base, price })
          .expect(400);
      }
      for (const filmId of [invalidId, 123]) {
        const res = await http
          .post('/showings')
          .send({ ...base, filmId })
          .expect(400);
        expect(JSON.stringify(res.body.message)).toContain('filmId');
      }
      await http
        .post('/showings')
        .send({ ...base, hallId: invalidId })
        .expect(400);
      expect(await showingModel.countDocuments()).toBe(0);
    });

    it('сторінка містить items, total, page, limit; фільтри й сортування рахує база', async () => {
      const film1 = await createFilm('Фільм 1');
      const film2 = await createFilm('Фільм 2');
      const hall = await createHall();
      const s1 = await createShowing(film1.id, hall.id, inDays(5, 8));
      const s2 = await createShowing(film1.id, hall.id, inDays(5, 14));
      const s3 = await createShowing(film2.id, hall.id, inDays(6, 10));
      const tieA = await createShowing(film2.id, hall.id, inDays(7, 12));
      const tieB = await createShowing(film2.id, hall.id, inDays(7, 12));
      const tie = [tieA.id, tieB.id].sort();

      const all = await http.get('/showings').expect(200);
      expect(all.body).toMatchObject({ total: 5, page: 1, limit: 20 });
      expect(ids(all.body.items)).toEqual([s1.id, s2.id, s3.id, ...tie]);
      expect(all.body.items[0]).toEqual({
        id: s1.id,
        filmTitle: 'Фільм 1',
        hallName: 'Зал 1',
        startsAt: s1.startsAt,
        price: 12500,
      });

      const desc = await http.get('/showings?sort=desc').expect(200);
      expect(ids(desc.body.items)).toEqual([...tie, s3.id, s2.id, s1.id]);

      const page2 = await http.get('/showings?page=2&limit=2').expect(200);
      expect(page2.body).toMatchObject({ total: 5, page: 2, limit: 2 });
      expect(ids(page2.body.items)).toEqual([s3.id, tie[0]]);
      const far = await http
        .get('/showings?page=99999999999&limit=100')
        .expect(200);
      expect(far.body).toMatchObject({ items: [], total: 5 });
      const beyond = await http.get('/showings?page=4&limit=2').expect(200);
      expect(beyond.body).toMatchObject({ items: [], total: 5 });

      const byFilm = await http.get(`/showings?filmId=${film1.id}`).expect(200);
      expect(byFilm.body.total).toBe(2);
      expect(ids(byFilm.body.items)).toEqual([s1.id, s2.id]);

      const day = inDays(6).slice(0, 10);
      const byDate = await http.get(`/showings?date=${day}`).expect(200);
      expect(ids(byDate.body.items)).toEqual([s3.id]);

      const both = await http
        .get(`/showings?filmId=${film1.id}&date=${day}&limit=1`)
        .expect(200);
      expect(both.body).toMatchObject({ items: [], total: 0, limit: 1 });
    });

    it('date рахує добу в часовому поясі кінотеатру (Europe/Kyiv)', async () => {
      const film = await createFilm();
      const hall = await createHall();
      const late = await createShowing(
        film.id,
        hall.id,
        '2099-05-01T23:30:00+03:00',
      );
      const night = await createShowing(
        film.id,
        hall.id,
        '2099-05-02T01:00:00+03:00',
      );
      const first = await http.get('/showings?date=2099-05-01').expect(200);
      expect(ids(first.body.items)).toEqual([late.id]);
      const second = await http.get('/showings?date=2099-05-02').expect(200);
      expect(ids(second.body.items)).toEqual([night.id]);
    });

    it('startsAt без зсуву читається в часовому поясі кінотеатру', async () => {
      const film = await createFilm();
      const hall = await createHall();
      const showing = await createShowing(film.id, hall.id, '2099-05-01T18:30');
      expect(showing.startsAt).toBe('2099-05-01T15:30:00.000Z');
    });

    it('400 на невалідні page, limit, date і sort', async () => {
      for (const query of [
        'page=0',
        'page=-1',
        'page=1.5',
        'page=abc',
        'page=100000000000000000000',
        'limit=0',
        'limit=101',
        'limit=x',
        'date=01.05.2030',
        'date=2030-13-45',
        'sort=up',
        'sort=ASC',
      ]) {
        await http.get(`/showings?${query}`).expect(400);
      }
    });
  });

  describe('bookings', () => {
    let showingId: string;

    beforeEach(async () => {
      const film = await createFilm();
      const hall = await createHall();
      showingId = (await createShowing(film.id, hall.id, inDays(5), 12500)).id;
    });

    const book = (seats: unknown) =>
      http.post(`/showings/${showingId}/bookings`).send({ seats });

    it('створює бронювання з підсумковою ціною', async () => {
      await http.get('/bookings').expect(200, []);
      const res = await book([
        { row: 1, seat: 1 },
        { row: 1, seat: 2 },
        { row: 3, seat: 5 },
      ]).expect(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        showingId,
        seats: [
          { row: 1, seat: 1 },
          { row: 1, seat: 2 },
          { row: 3, seat: 5 },
        ],
        totalPrice: 37500,
        createdAt: expect.any(String),
      });
      await http.get('/bookings').expect(200, [res.body]);
      await http.get(`/showings/${showingId}/bookings`).expect(200, [res.body]);

      // Одне оновлення проставило bookingId у місця й додало запис у bookings
      const raw = await rawShowing(showingId);
      expect(raw.bookings).toHaveLength(1);
      expect(raw.bookings[0]._id.toString()).toBe(res.body.id);
      const booked = raw.seats.filter((seat) => seat.bookingId !== null);
      expect(booked.map(({ row, seat }) => ({ row, seat }))).toEqual([
        { row: 1, seat: 1 },
        { row: 1, seat: 2 },
        { row: 3, seat: 5 },
      ]);
      expect(
        booked.every((seat) => seat.bookingId?.toString() === res.body.id),
      ).toBe(true);
    });

    it('показує зайнятість місць на сеансі', async () => {
      const before = await http.get(`/showings/${showingId}/seats`).expect(200);
      expect(before.body).toHaveLength(15);
      expect(before.body.every((s: { isBooked: boolean }) => !s.isBooked)).toBe(
        true,
      );
      await book([{ row: 2, seat: 3 }]).expect(201);
      const after = await http.get(`/showings/${showingId}/seats`).expect(200);
      expect(
        after.body.filter((s: { isBooked: boolean }) => s.isBooked),
      ).toEqual([{ row: 2, seat: 3, isBooked: true }]);
      await http.get(`/showings/${missingId}/seats`).expect(404);
    });

    it('404 для невідомого сеансу', async () => {
      await http
        .post(`/showings/${missingId}/bookings`)
        .send({ seats: [{ row: 1, seat: 1 }] })
        .expect(404);
      await http.get(`/showings/${missingId}/bookings`).expect(404);
    });

    it('400 на невалідний масив місць', async () => {
      const invalid = [
        [],
        undefined,
        [null],
        [{ row: 1 }],
        [{ row: 1, seat: 'a' }],
        [{ row: 0, seat: 1 }],
        [{ row: 1.5, seat: 1 }],
        [
          { row: 1, seat: 1 },
          { row: 1, seat: 1 },
        ],
        [{ row: 4, seat: 1 }],
        [{ row: 1, seat: 6 }],
        'x',
        // Більше за межу місць в одному бронюванні
        Array.from({ length: 101 }, (_, i) => ({ row: 1, seat: i + 1 })),
      ];
      for (const seats of invalid) {
        await book(seats).expect(400);
      }
      expect(await countBookings()).toBe(0);
      expect(await countBookedSeats()).toBe(0);
    });

    it('409 при зайнятому місці, документ сеансу не змінюється', async () => {
      await book([{ row: 2, seat: 2 }]).expect(201);
      const res = await book([
        { row: 1, seat: 1 },
        { row: 2, seat: 2 },
      ]).expect(409);
      expect(res.body.message).toBe(
        'Одне або кілька місць уже заброньовані на цьому сеансі',
      );
      expect(await countBookings()).toBe(1);
      expect(await countBookedSeats()).toBe(1);
      const seats = await http.get(`/showings/${showingId}/seats`).expect(200);
      expect(
        seats.body.filter((s: { isBooked: boolean }) => s.isBooked),
      ).toHaveLength(1);
    });

    it('одночасні запити на те саме місце: одне бронювання, друге 409', async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, () => book([{ row: 3, seat: 3 }])),
      );
      const statuses = results.map((res) => res.status).sort();
      expect(statuses).toEqual([201, 409, 409, 409, 409]);
      expect(await countBookings()).toBe(1);
      expect(await countBookedSeats()).toBe(1);
    });

    it('бронює 100 місць у найбільшому залі 100 × 100 одним запитом', async () => {
      const film = await createFilm('Великий');
      const hall = await createHall('Великий зал', 100, 100);
      const big = await createShowing(film.id, hall.id);
      const seats = Array.from({ length: 100 }, (_, i) => ({
        row: 100,
        seat: i + 1,
      }));
      const res = await http
        .post(`/showings/${big.id}/bookings`)
        .send({ seats })
        .expect(201);
      expect(res.body.totalPrice).toBe(12500 * 100);
      const after = await http.get(`/showings/${big.id}/seats`).expect(200);
      expect(after.body).toHaveLength(10_000);
      expect(
        after.body.filter((s: { isBooked: boolean }) => s.isBooked),
      ).toHaveLength(100);
    });

    it('одночасні бронювання різних місць проходять усі', async () => {
      const results = await Promise.all(
        [1, 2, 3, 4, 5].map((seat) => book([{ row: 2, seat }])),
      );
      expect(results.map((res) => res.status)).toEqual([
        201, 201, 201, 201, 201,
      ]);
      expect(await countBookings()).toBe(5);
      expect(await countBookedSeats()).toBe(5);
    });

    it('одночасні бронювання, що перетинаються одним місцем: проходить лише одне', async () => {
      const results = await Promise.all([
        book([
          { row: 1, seat: 1 },
          { row: 1, seat: 2 },
        ]),
        book([
          { row: 1, seat: 2 },
          { row: 1, seat: 3 },
        ]),
      ]);
      expect(results.map((res) => res.status).sort()).toEqual([201, 409]);
      expect(await countBookings()).toBe(1);
      expect(await countBookedSeats()).toBe(2);
    });

    it('скасування звільняє місця й видаляє запис з bookings', async () => {
      const first = await book([
        { row: 1, seat: 1 },
        { row: 1, seat: 2 },
      ]).expect(201);
      await book([{ row: 1, seat: 1 }]).expect(409);
      await http.delete(`/bookings/${first.body.id}`).expect(204).expect('');
      const raw = await rawShowing(showingId);
      expect(raw.bookings).toEqual([]);
      expect(raw.seats.every((seat) => seat.bookingId === null)).toBe(true);
      await book([{ row: 1, seat: 1 }]).expect(201);
      await http.delete(`/bookings/${missingId}`).expect(404);
      await http.delete(`/bookings/${first.body.id}`).expect(404);
    });
  });
});
