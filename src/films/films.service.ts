import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFilmDto } from './dto/create-film.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { FilmDto } from './dto/film.dto';
import { Film, FilmRecord } from './schemas/film.schema';
import { ShowingsService } from '../showings/showings.service';

@Injectable()
export class FilmsService {
  constructor(
    @InjectModel(Film.name)
    private readonly filmModel: Model<Film>,
    @Inject(forwardRef(() => ShowingsService))
    private readonly showingsService: ShowingsService,
  ) {}

  async findAll(): Promise<FilmDto[]> {
    const films = await this.filmModel
      .find()
      .sort({ title: 1, _id: 1 })
      .lean<FilmRecord[]>();
    return films.map((film) => FilmDto.fromDocument(film));
  }

  async exists(id: string): Promise<boolean> {
    return (await this.filmModel.exists({ _id: id })) !== null;
  }

  async findOne(id: string): Promise<FilmDto> {
    const film = await this.filmModel.findById(id).lean<FilmRecord>();
    if (film === null) {
      throw new NotFoundException(`Фільм з id ${id} не знайдено`);
    }
    return FilmDto.fromDocument(film);
  }

  async create(createFilmDto: CreateFilmDto): Promise<FilmDto> {
    const film = await this.filmModel.create({
      title: createFilmDto.title,
      durationMinutes: createFilmDto.durationMinutes,
      releaseYear: createFilmDto.releaseYear,
    });
    return FilmDto.fromDocument(film);
  }

  async update(id: string, updateFilmDto: UpdateFilmDto): Promise<FilmDto> {
    // Змінюємо лише ті поля, які прийшли в запиті
    const changes = Object.fromEntries(
      Object.entries(updateFilmDto).filter(([, value]) => value !== undefined),
    );
    const film = await this.filmModel
      .findByIdAndUpdate(
        id,
        { $set: changes },
        { returnDocument: 'after', runValidators: true },
      )
      .lean<FilmRecord>();
    if (film === null) {
      throw new NotFoundException(`Фільм з id ${id} не знайдено`);
    }
    return FilmDto.fromDocument(film);
  }

  async remove(id: string): Promise<void> {
    if (!(await this.exists(id))) {
      throw new NotFoundException(`Фільм з id ${id} не знайдено`);
    }
    // Зовнішніх ключів у MongoDB немає, тому залежні сеанси шукаємо запитом
    if (await this.showingsService.existsForFilm(id)) {
      throw new ConflictException(
        `Фільм з id ${id} не можна видалити: на нього посилається хоча б один сеанс`,
      );
    }
    await this.filmModel.deleteOne({ _id: id });
  }
}
