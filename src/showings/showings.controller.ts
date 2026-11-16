import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ShowingsService } from './showings.service';
import { CreateShowingDto } from './dto/create-showing.dto';
import { FindShowingsQueryDto } from './dto/find-showings-query.dto';
import { PaginatedShowingsDto } from './dto/paginated-showings.dto';
import { ShowingDto } from './dto/showing.dto';
import { ShowingViewDto } from './dto/showing-view.dto';
import { SeatAvailabilityDto } from './dto/seat-availability.dto';
import { ApiObjectIdParam, ParseObjectIdPipe } from '../common/object-id';

@ApiTags('showings')
@Controller('showings')
export class ShowingsController {
  constructor(private readonly showingsService: ShowingsService) {}

  @Post()
  @ApiCreatedResponse({
    type: ShowingDto,
    description: 'Сеанс створено; масиви seats і bookings не повертаються',
  })
  @ApiBadRequestResponse({
    description:
      'Фільму або залу немає, filmId чи hallId не є ObjectId, startsAt не є датою ISO 8601 або вказує на минуле, price не є цілим додатним числом',
  })
  create(@Body() createShowingDto: CreateShowingDto): Promise<ShowingDto> {
    return this.showingsService.create(createShowingDto);
  }

  @Get()
  @ApiOkResponse({
    type: PaginatedShowingsDto,
    description:
      'Сторінка сеансів, відсортованих за часом початку, за однакового часу — за id',
  })
  @ApiBadRequestResponse({
    description:
      'page або limit не є цілим числом чи виходить за межі, date не у форматі YYYY-MM-DD, sort не asc і не desc, filmId не є ObjectId',
  })
  findAll(@Query() query: FindShowingsQueryDto): Promise<PaginatedShowingsDto> {
    return this.showingsService.findAll(query);
  }

  @Get(':id')
  @ApiObjectIdParam('Ідентифікатор сеансу')
  @ApiOkResponse({ type: ShowingViewDto })
  @ApiNotFoundResponse({ description: 'Сеанс не знайдено' })
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<ShowingViewDto> {
    return this.showingsService.findOne(id);
  }

  @Get(':id/seats')
  @ApiObjectIdParam('Ідентифікатор сеансу')
  @ApiOkResponse({
    type: [SeatAvailabilityDto],
    description: 'Місця залу з ознакою зайнятості на цьому сеансі',
  })
  @ApiNotFoundResponse({ description: 'Сеанс не знайдено' })
  getSeats(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<SeatAvailabilityDto[]> {
    return this.showingsService.getSeats(id);
  }
}
