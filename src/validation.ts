import type { ValidationPipeOptions } from '@nestjs/common';

// whitelist прибирає з тіла поля, яких немає в DTO, тож до сервісів вони не потрапляють
export const validationPipeOptions: ValidationPipeOptions = {
  whitelist: true,
  transform: true,
};
