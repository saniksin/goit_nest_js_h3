import { Transform } from 'class-transformer';

// Обрізає пробіли на краях рядка до валідації: назва з самих пробілів не пройде IsNotEmpty
// і дасть 400, а схема Mongoose (trim: true) збереже те саме значення, що перевірив DTO
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
