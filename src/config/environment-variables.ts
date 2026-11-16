import {
  IsEnum,
  IsNumber,
  IsTimeZone,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';

enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment;

  // Рядок підключення до MongoDB, наприклад mongodb://user:pass@localhost:27017/cinema?authSource=admin
  @Matches(/^mongodb(\+srv)?:\/\/\S+$/, {
    message:
      'MONGODB_URI має бути рядком підключення, що починається з mongodb:// або mongodb+srv://',
  })
  MONGODB_URI: string;

  // Часовий пояс кінотеатру: у ньому рахується доба для фільтра date у GET /showings
  @IsTimeZone()
  CINEMA_TIMEZONE: string;
}

// Без коректного значення будь-якої змінної застосунок не стартує
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig);

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
