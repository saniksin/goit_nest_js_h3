import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validationPipeOptions } from './validation';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { EnvironmentVariables } from './config/environment-variables';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Cinema API')
    .setDescription('Фільми, зали, сеанси та бронювання квитків')
    .setVersion('3.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  const configService =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  await app.listen(configService.get('PORT', { infer: true }));
}
void bootstrap();
