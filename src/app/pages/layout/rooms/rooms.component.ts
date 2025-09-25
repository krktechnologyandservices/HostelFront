import { Component, OnInit } from '@angular/core';
import { RoomService, Room } from './rooms.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-room-list',
  templateUrl: './rooms.component.html'
})
export class RoomComponent implements OnInit {
  rooms: Room[] = [];
  filteredRooms: Room[] = [];
  searchQuery = '';

  constructor(private roomService: RoomService, public router: Router) {}

  ngOnInit(): void {
    this.loadRooms();
  }

  loadRooms() {
    this.roomService.getAll().subscribe(res => {
      this.rooms = res;
      this.filteredRooms = res; // initially show all
    });
  }

  search() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredRooms = this.rooms; // reset
    } else {
      this.filteredRooms = this.rooms.filter(room =>
        room.roomNumber.toLowerCase().includes(q) ||
        room.tariffs.some(t => t.period.toLowerCase().includes(q) || t.rate.toString().includes(q))
      );
    }
  }

  edit(id: number) { this.router.navigate(['pages/master/rooms/edit', id]); }
  delete(id: number) {
    if(confirm('Are you sure to delete?')) {
      this.roomService.delete(id).subscribe(() => this.loadRooms());
    }
  }
}
