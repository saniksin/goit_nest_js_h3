import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsMongoId,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  OBJECT_ID_EXAMPLE,
  OBJECT_ID_FORMAT,
  OBJECT_ID_PATTERN,
  objectIdMessage,
} from '../../common/object-id';

const MAX_LIMIT = 100;
// Межа номера сторінки: (page - 1) * limit має лишатися точним цілим для skip
const MAX_PAGE = Math.floor(Number.MAX_SAFE_INTEGER / MAX_LIMIT);

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export class FindShowingsQueryDto {
  @ApiPropertyOptional({
    example: OBJECT_ID_EXAMPLE,
    pattern: OBJECT_ID_PATTERN,
    description: `Залишає сеанси лише цього фільму. ${OBJECT_ID_FORMAT}`,
  })
  @IsOptional()
  @IsMongoId({ message: objectIdMessage('filmId') })
  filmId?: string;

  @ApiPropertyOptional({
    example: '2030-05-01',
    description:
      'Залишає сеанси, що починаються цієї доби в часовому поясі кінотеатру, формат YYYY-MM-DD',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date має бути у форматі YYYY-MM-DD',
  })
  @IsISO8601({ strict: true }, { message: 'date має бути коректною датою' })
  date?: string;

  @ApiPropertyOptional({
    description: 'Номер сторінки, ціле число від 1',
    maximum: MAX_PAGE,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Кількість записів на сторінці, ціле число від 1 до 100',
    default: 20,
    minimum: 1,
    maximum: MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number = 20;

  @ApiPropertyOptional({
    description:
      'Порядок за часом початку; сеанси з однаковим часом упорядковані за id',
    enum: SORT_ORDERS,
    default: 'asc',
  })
  @IsOptional()
  @IsIn(SORT_ORDERS, { message: 'sort має бути asc або desc' })
  sort: SortOrder = 'asc';
}
