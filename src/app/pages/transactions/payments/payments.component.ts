import { Component, OnInit } from '@angular/core';
import { PaymentService, Payment } from '../payments/payments.service';
import { BookingService, Booking } from '../booking/booking.service';
import { StudentService, Student } from '../../layout/students/students.service';
import { RoomService, Room } from '../../layout/rooms/rooms.service';

@Component({
  selector: 'app-payment-list',
  templateUrl: './payments.component.html'
})
export class PaymentsComponent implements OnInit {
  payments: Payment[] = [];
  bookings: Booking[] = [];
  students: Student[] = [];
  rooms: Room[] = [];

  constructor(
    private paymentService: PaymentService,
    private bookingService: BookingService,
    private studentService: StudentService,
    private roomService: RoomService
  ) {}

  ngOnInit(): void {
    this.studentService.getAll().subscribe(s => this.students = s);
    this.roomService.getAll().subscribe(r => this.rooms = r);
    this.bookingService.getAll().subscribe(b => {
      this.bookings = b;
      this.loadPayments();
    });
  }

  loadPayments() {
    this.payments = [];
    this.bookings.forEach(b => {
      this.paymentService.getByBooking(b.id!).subscribe(p => {
        this.payments.push(...p);
      });
    });
  }

  getStudentName(id: number) {
    return this.students.find(s => s.studentId === id)?.fullName || '';
  }

  getRoomNumber(id: number) {
    return this.rooms.find(r => r.id === id)?.roomNumber || '';
  }

  getBooking(bookingId: number) {
    return this.bookings.find(b => b.id === bookingId);
  }
}
