import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DayBookService } from './daybook.service';

@Component({
  selector: 'app-daybook',
  templateUrl: './daybook.component.html',
  styleUrls: ['./daybook.component.scss']
})
export class DayBookComponent implements OnInit {
  filterForm: FormGroup;
  daybookEntries: any[] = [];

  roomList = [];      // Load from API
  studentList = [];   // Load from API

  constructor(private fb: FormBuilder, private service: DayBookService) {}

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      rooms: [[]],
      students: [[]],
      genders: [[]],
      fromDate: [null],
      toDate: [null]
    });

    this.loadFilters();
    this.loadDayBook();
  }

  loadFilters() {
    this.service.getRooms().subscribe(res => this.roomList = res);
    this.service.getStudents().subscribe(res => this.studentList = res);
  }

  loadDayBook() {
    const filters = this.filterForm.value;
    this.service.getDayBook(filters).subscribe(res => this.daybookEntries = res);
  }

  submitFilter() {
    this.loadDayBook();
  }

  viewEntry(entry: any) {
    // Navigate or open dialog based on entry.ReferenceType
    console.log('Navigate to', entry.ReferenceType, entry.ReferenceId);
  }
}
