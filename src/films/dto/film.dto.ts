import { ApiProperty } from '@nestjs/swagger';
import { OBJECT_ID_EXAMPLE, OBJECT_ID_FORMAT } from '../../common/object-id';
import { FilmRecord } from '../schemas/film.schema';

// Фільм у відповідях: _id віддається рядковим id, службові поля документа не потрапляють
export class FilmDto {
  @ApiProperty({ example: OBJECT_ID_EXAMPLE, description: OBJECT_ID_FORMAT })
  id: string;

  @ApiProperty({ example: 'Дюна' })
  title: string;

  @ApiProperty({ example: 155, description: 'Тривалість у хвилинах' })
  durationMinutes: number;

  @ApiProperty({ example: 2021 })
  releaseYear: number;

  static fromDocument(film: FilmRecord): FilmDto {
    const dto = new FilmDto();
    dto.id = film._id.toString();
    dto.title = film.title;
    dto.durationMinutes = film.durationMinutes;
    dto.releaseYear = film.releaseYear;
    return dto;
  }
}
