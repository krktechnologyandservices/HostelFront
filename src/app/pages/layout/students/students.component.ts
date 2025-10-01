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
  selectedPhotos: { [studentId: number]: File } = {};
  viewingStudent?: Student;
  enlargedPhotoUrl?: string;
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

  
  /** Lazy load photo when view is clicked */
  viewStudent(student: Student) {
    this.viewingStudent = student;
  
    if (student.studentId) {
      this.studentService.getPhoto(student.studentId).subscribe(blob => {
        const url = URL.createObjectURL(blob);
        student.photoUrl = url; // Bind this to your <img [src]="student.photoUrl">
      });
    }
  }
  /** File selection */
  onPhotoSelected(event: any, student: Student) {
    const file: File = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size should be less than 2MB');
      return;
    }

    this.selectedPhotos[student.studentId!] = file;

    // Preview
    const reader = new FileReader();
    reader.onload = (e: any) => student.photoUrl = e.target.result;
    reader.readAsDataURL(file);
  }

  /** Upload selected photo */
  uploadPhoto(student: Student) {
    const file = this.selectedPhotos[student.studentId!];
    if (!file) { alert('No photo selected'); return; }

    const formData = new FormData();
    formData.append('photo', file);

    this.studentService.uploadPhoto(student.studentId!, formData).subscribe({
      next: (res) => {
        student.photoUrl = res.photoUrl;
        delete this.selectedPhotos[student.studentId!];
        alert('Photo uploaded successfully');
      },
      error: (err) => console.error(err)
    });
  }

  /** Remove photo */
  removePhoto(student: Student) {
    if (!student.studentId) return;
    if (!confirm('Are you sure to remove this photo?')) return;

    this.studentService.deletePhoto(student.studentId!).subscribe({
      next: () => {
        student.photoUrl = '';
        delete this.selectedPhotos[student.studentId!];
        alert('Photo removed');
      },
      error: (err) => console.error(err)
    });
  }
  enlargePhoto(url: string | undefined) {
    if (url) {
      this.enlargedPhotoUrl = url;
    }
  }


}