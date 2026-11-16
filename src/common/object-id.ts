import {
  BadRequestException,
  Injectable,
  PipeTransform,
  applyDecorators,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiParam } from '@nestjs/swagger';
import { isMongoId } from 'class-validator';

// ObjectId у рядковому вигляді — рівно 24 шістнадцяткові символи
export const OBJECT_ID_PATTERN = '^[0-9a-fA-F]{24}$';
export const OBJECT_ID_EXAMPLE = '6650f1a2b3c4d5e6f7a8b9c0';
export const OBJECT_ID_FORMAT =
  'ObjectId: рядок із 24 шістнадцяткових символів (0-9, a-f)';

export const objectIdMessage = (field: string) =>
  `${field} має бути ObjectId: рядок із 24 шістнадцяткових символів (0-9, a-f)`;

// Перевіряє параметр маршруту до звернення до бази: некоректний формат дає 400,
// а коректний, але неіснуючий ідентифікатор далі дасть 404 у сервісі
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string' || !isMongoId(value)) {
      throw new BadRequestException(objectIdMessage('id'));
    }
    return value;
  }
}

// Опис параметра :id у Swagger: формат ObjectId і відповідь 400 на некоректний формат
export function ApiObjectIdParam(description: string) {
  return applyDecorators(
    ApiParam({
      name: 'id',
      description: `${description}. ${OBJECT_ID_FORMAT}`,
      schema: { type: 'string', pattern: OBJECT_ID_PATTERN },
      example: OBJECT_ID_EXAMPLE,
    }),
    ApiBadRequestResponse({
      description: `Некоректний формат id: очікується ${OBJECT_ID_FORMAT}`,
    }),
  );
}
