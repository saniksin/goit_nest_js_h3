import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FilmsService } from './films.service';
import { CreateFilmDto } from './dto/create-film.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { FilmDto } from './dto/film.dto';
import { ApiObjectIdParam, ParseObjectIdPipe } from '../common/object-id';

@ApiTags('films')
@Controller('films')
export class FilmsController {
  constructor(private readonly filmsService: FilmsService) {}

  @Post()
  @ApiCreatedResponse({ type: FilmDto, description: 'Фільм створено' })
  @ApiBadRequestResponse({
    description: 'Поле відсутнє або має неправильний тип',
  })
  create(@Body() createFilmDto: CreateFilmDto): Promise<FilmDto> {
    return this.filmsService.create(createFilmDto);
  }

  @Get()
  @ApiOkResponse({
    type: [FilmDto],
    description: 'Усі фільми, порожній масив якщо їх немає',
  })
  findAll(): Promise<FilmDto[]> {
    return this.filmsService.findAll();
  }

  @Get(':id')
  @ApiObjectIdParam('Ідентифікатор фільму')
  @ApiOkResponse({ type: FilmDto })
  @ApiNotFoundResponse({ description: 'Фільм не знайдено' })
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<FilmDto> {
    return this.filmsService.findOne(id);
  }

  @Patch(':id')
  @ApiObjectIdParam('Ідентифікатор фільму')
  @ApiOkResponse({ type: FilmDto, description: 'Оновлений фільм' })
  @ApiBadRequestResponse({ description: 'Неправильний тип поля' })
  @ApiNotFoundResponse({ description: 'Фільм не знайдено' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateFilmDto: UpdateFilmDto,
  ): Promise<FilmDto> {
    return this.filmsService.update(id, updateFilmDto);
  }

  @Delete(':id')
  @ApiObjectIdParam('Ідентифікатор фільму')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Фільм видалено' })
  @ApiNotFoundResponse({ description: 'Фільм не знайдено' })
  @ApiConflictResponse({
    description: 'На фільм посилається хоча б один сеанс',
  })
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.filmsService.remove(id);
  }
}
