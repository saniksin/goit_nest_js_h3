import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsPositive,
  IsMongoId,
  Matches,
  Max,
} from 'class-validator';
import { MAX_INTEGER } from '../../common/limits';
import {
  OBJECT_ID_EXAMPLE,
  OBJECT_ID_FORMAT,
  OBJECT_ID_PATTERN,
  objectIdMessage,
} from '../../common/object-id';

export class CreateShowingDto {
  @ApiProperty({
    example: OBJECT_ID_EXAMPLE,
    pattern: OBJECT_ID_PATTERN,
    description: `Ідентифікатор фільму. ${OBJECT_ID_FORMAT}`,
  })
  @IsMongoId({ message: objectIdMessage('filmId') })
  filmId: string;

  @ApiProperty({
    example: '6650f1a2b3c4d5e6f7a8b9c1',
    pattern: OBJECT_ID_PATTERN,
    description: `Ідентифікатор залу. ${OBJECT_ID_FORMAT}`,
  })
  @IsMongoId({ message: objectIdMessage('hallId') })
  hallId: string;

  @ApiProperty({
    example: '2030-05-01T18:30:00+03:00',
    description:
      'Дата й час початку в розширеному форматі ISO 8601, не в минулому',
  })
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/,
    {
      message:
        'startsAt має містити дату й час ISO 8601, наприклад 2030-05-01T18:30:00Z',
    },
  )
  @IsISO8601(
    { strict: true },
    { message: 'startsAt має бути коректною датою ISO 8601' },
  )
  startsAt: string;

  @ApiProperty({
    example: 12500,
    description: 'Ціна одного квитка в копійках, ціле додатне число',
  })
  @IsInt()
  @IsPositive()
  @Max(MAX_INTEGER)
  price: number;
}
