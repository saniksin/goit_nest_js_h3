import { SeatDto } from './dto/seat.dto';

// Перелік місць обчислюється з розмірів залу: ряди 1..rows, місця 1..seatsPerRow.
// Зал на 3 ряди по 5 місць дає 15 місць
export function hallSeats(rows: number, seatsPerRow: number): SeatDto[] {
  const seats: SeatDto[] = [];
  for (let row = 1; row <= rows; row++) {
    for (let seat = 1; seat <= seatsPerRow; seat++) {
      seats.push({ row, seat });
    }
  }
  return seats;
}
