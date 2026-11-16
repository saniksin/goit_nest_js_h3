import { ApiProperty } from '@nestjs/swagger';
import { OBJECT_ID_EXAMPLE, OBJECT_ID_FORMAT } from '../../common/object-id';
import { HallRecord } from '../schemas/hall.schema';

// Зал у відповідях: _id віддається рядковим id
export class HallDto {
  @ApiProperty({ example: OBJECT_ID_EXAMPLE, description: OBJECT_ID_FORMAT })
  id: string;

  @ApiProperty({ example: 'Зал 1' })
  name: string;

  @ApiProperty({ example: 3 })
  rows: number;

  @ApiProperty({ example: 5 })
  seatsPerRow: number;

  static fromDocument(hall: HallRecord): HallDto {
    const dto = new HallDto();
    dto.id = hall._id.toString();
    dto.name = hall.name;
    dto.rows = hall.rows;
    dto.seatsPerRow = hall.seatsPerRow;
    return dto;
  }
}
