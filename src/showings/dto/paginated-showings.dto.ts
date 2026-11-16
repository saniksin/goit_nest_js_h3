import { ApiProperty } from '@nestjs/swagger';
import { ShowingViewDto } from './showing-view.dto';

export class PaginatedShowingsDto {
  @ApiProperty({
    type: [ShowingViewDto],
    description: 'Сеанси поточної сторінки',
  })
  items: ShowingViewDto[];

  @ApiProperty({
    example: 42,
    description: 'Загальна кількість сеансів, що відповідають фільтрам',
  })
  total: number;

  @ApiProperty({ example: 1, description: 'Номер поточної сторінки' })
  page: number;

  @ApiProperty({ example: 20, description: 'Розмір сторінки' })
  limit: number;

  @ApiProperty({ example: 3, description: 'Загальна кількість сторінок' })
  totalPages: number;
}
