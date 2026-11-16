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
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingViewDto } from './dto/booking-view.dto';
import { ApiObjectIdParam, ParseObjectIdPipe } from '../common/object-id';

// Маршрути бронювань. Бронювання зберігаються всередині документів сеансів
@ApiTags('bookings')
@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('bookings')
  @ApiOkResponse({
    type: [BookingViewDto],
    description: 'Усі бронювання, порожній масив якщо їх немає',
  })
  findAll(): Promise<BookingViewDto[]> {
    return this.bookingsService.findAll();
  }

  @Post('showings/:id/bookings')
  @ApiObjectIdParam('Ідентифікатор сеансу')
  @ApiCreatedResponse({
    type: BookingViewDto,
    description: 'Бронювання створено',
  })
  @ApiBadRequestResponse({
    description:
      'seats порожній, елемент без row і seat, місце повторюється, місця немає в залі або число не є цілим додатним',
  })
  @ApiNotFoundResponse({ description: 'Сеанс не знайдено' })
  @ApiConflictResponse({
    description:
      'Хоча б одне місце вже заброньоване; документ сеансу не змінюється, жодне місце не бронюється',
  })
  create(
    @Param('id', ParseObjectIdPipe) showingId: string,
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<BookingViewDto> {
    return this.bookingsService.create(showingId, createBookingDto);
  }

  @Get('showings/:id/bookings')
  @ApiObjectIdParam('Ідентифікатор сеансу')
  @ApiOkResponse({
    type: [BookingViewDto],
    description: 'Бронювання цього сеансу',
  })
  @ApiNotFoundResponse({ description: 'Сеанс не знайдено' })
  findByShowing(
    @Param('id', ParseObjectIdPipe) showingId: string,
  ): Promise<BookingViewDto[]> {
    return this.bookingsService.findByShowing(showingId);
  }

  @Delete('bookings/:id')
  @ApiObjectIdParam('Ідентифікатор бронювання')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Бронювання скасовано, місця вільні' })
  @ApiNotFoundResponse({
    description: 'Бронювання з таким id немає в жодному сеансі',
  })
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.bookingsService.remove(id);
  }
}
