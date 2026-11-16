import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HallsService } from './halls.service';
import { CreateHallDto } from './dto/create-hall.dto';
import { HallWithSeatsDto } from './dto/hall-with-seats.dto';
import { HallDto } from './dto/hall.dto';
import { ApiObjectIdParam, ParseObjectIdPipe } from '../common/object-id';

@ApiTags('halls')
@Controller('halls')
export class HallsController {
  constructor(private readonly hallsService: HallsService) {}

  @Post()
  @ApiCreatedResponse({ type: HallDto, description: 'Зал створено' })
  @ApiBadRequestResponse({
    description:
      'Поле відсутнє, має неправильний тип або число не є цілим додатним',
  })
  @ApiConflictResponse({ description: 'Зал з такою назвою вже існує' })
  create(@Body() createHallDto: CreateHallDto): Promise<HallDto> {
    return this.hallsService.create(createHallDto);
  }

  @Get()
  @ApiOkResponse({ type: [HallDto] })
  findAll(): Promise<HallDto[]> {
    return this.hallsService.findAll();
  }

  @Get(':id')
  @ApiObjectIdParam('Ідентифікатор залу')
  @ApiOkResponse({
    type: HallWithSeatsDto,
    description: 'Зал разом з переліком місць',
  })
  @ApiNotFoundResponse({ description: 'Зал не знайдено' })
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<HallWithSeatsDto> {
    return this.hallsService.findOneWithSeats(id);
  }

  @Delete(':id')
  @ApiObjectIdParam('Ідентифікатор залу')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Зал видалено' })
  @ApiNotFoundResponse({ description: 'Зал не знайдено' })
  @ApiConflictResponse({ description: 'На зал посилається хоча б один сеанс' })
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.hallsService.remove(id);
  }
}
