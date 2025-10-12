// bookings.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BookingService, Booking } from '../booking/booking.service';
import { StudentService, Student } from '../../layout/students/students.service';
import { RoomService, Room } from '../../layout/rooms/rooms.service';

@Component({
  selector: 'app-booking-list',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.scss']
})
export class BookingComponent implements OnInit {
  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  students: Student[] = [];
  rooms: Room[] = [];
  searchQuery = '';

  // Vocation
  selectedBooking: Booking | null = null;
  showVocationModal = false;
  vocationDate: string = '';

  constructor(
    private bookingService: BookingService,
    private studentService: StudentService,
    private roomService: RoomService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.studentService.getAll().subscribe(s => (this.students = s));
    this.roomService.getAll().subscribe(r => (this.rooms = r));
    this.bookingService.getAll().subscribe(b => {
      this.bookings = b;
      this.filteredBookings = b;
    });
  }

  getStudentName(id: number) {
    return this.students.find(s => s.studentId === id)?.fullName || '';
  }

  getRoomNumber(id: number) {
    return this.rooms.find(r => r.id === id)?.roomNumber || '';
  }

  search() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredBookings = this.bookings;
    } else {
      this.filteredBookings = this.bookings.filter(
        b =>
          this.getStudentName(b.studentId).toLowerCase().includes(q) ||
          this.getRoomNumber(b.roomId).toLowerCase().includes(q) ||
          b.tariffPeriod.toLowerCase().includes(q) ||
          (b.status || '').toLowerCase().includes(q)
      );
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.search();
  }

  addBooking() {
    this.router.navigate(['pages/transactions/bookings/add']);
  }

  editBooking(b: Booking) {
    this.router.navigate(['pages/transactions/bookings/edit', b.id]);
  }

  deleteBooking(b: Booking) {
    if (b.status === 'Billed') {
      alert('Booking cannot be deleted because bills are generated.');
      return;
    }
    if (confirm(`Delete booking for student ${this.getStudentName(b.studentId)}?`)) {
      this.bookingService.delete(b.id!).subscribe(() => this.loadData());
    }
  }

  // ------------------ VOCATION ------------------

  openVocationModal(b: Booking) {
    this.selectedBooking = b;
    this.vocationDate = b.vocationDate ? new Date(b.vocationDate).toISOString().substring(0,10) : '';
    this.showVocationModal = true;
  }

  saveVocation() {
    if (!this.selectedBooking) return;

    this.bookingService.updateVocation(this.selectedBooking.id!, {
      vocationDate: this.vocationDate,
      status: 'Vocate'
    }).subscribe(() => {
      this.loadData();
      this.showVocationModal = false;
      this.selectedBooking = null;
    });
  }
}