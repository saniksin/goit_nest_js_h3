import { INestApplication, ValidationPipe } from '@nestjs/common';
import { validationPipeOptions } from './validation';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Спільне налаштування для main.ts і e2e-тестів: тести перевіряють ту саму конфігурацію
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
  app.useGlobalFilters(new HttpExceptionFilter());
}
