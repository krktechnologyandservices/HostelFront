import { Component, OnInit } from '@angular/core';
import { StudentService, Student } from './students.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-student-list',
  templateUrl: './students.component.html'
})
export class StudentsComponent implements OnInit {
  students: Student[] = [];
  filteredStudents: Student[] = [];
  searchQuery = '';

  constructor(private studentService: StudentService, public router: Router) {}

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.studentService.getAll().subscribe({
      next: (res) => {
        this.students = res;
        this.filteredStudents = res; // initially show all
      },
      error: (err) => console.error(err)
    });
  }

  search(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredStudents = this.students;
    } else {
      this.filteredStudents = this.students.filter(s =>
        (s.fullName?.toLowerCase().includes(q)) ||
        (s.email?.toLowerCase().includes(q)) ||
        (s.phone?.toLowerCase().includes(q))
      );
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filteredStudents = this.students;
  }

  edit(student: Student): void {
    if (!student || student.studentId == null) {
      console.error('studentId is missing', student);
      return;
    }
    this.router.navigate(['pages/master/students/edit', student.studentId]);
  }

  delete(student: Student): void {
    if (!student || student.studentId == null) return;

    if (confirm('Are you sure to delete?')) {
      this.studentService.delete(student.studentId).subscribe({
        next: () => this.loadStudents(),
        error: (err) => console.error(err)
      });
    }
  }
}