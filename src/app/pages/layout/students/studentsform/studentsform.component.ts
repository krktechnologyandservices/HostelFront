import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StudentService, Student } from '../students.service';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomService } from '../../rooms/rooms.service';

@Component({
  selector: 'app-students-form',
  templateUrl: './studentsform.component.html',
  styleUrls: ['./studentsform.component.scss']
})
export class StudentsFormComponent implements OnInit {
  studentForm: FormGroup;
  isEdit = false;
  rooms: any[] = [];

  // Relationship options
  relationships: string[] = [
    'Father',
    'Mother',
    'Husband',
    'Wife',
    'Brother',
    'Sister',
    'Uncle',
    'Aunt',
    'Guardian'
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private studentsService: StudentService,
    private roomsService: RoomService
  ) {}

  ngOnInit(): void {
    // Initialize form
    this.studentForm = this.fb.group({
      studentId: [null],
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      guardianAlternativeMobile: [''],
      dob: [''],
      gender: [''],
      address: [''],
      guardianName: [''],
      guardianPhone: [''],
      relationship: [''],  // 👈 Added relationship
      admissionDate: [''],
      bloodGroup: [''],
      courseName: [''],
      idProof: [''],
      roomId: [null],
      billingMode: [''],
    });

    // Load room list for dropdown
    this.loadRooms();

    // Load student if edit mode
    this.loadStudentIfEdit();
  }

  // Load available rooms
  private loadRooms(): void {
    this.roomsService.getRooms().subscribe({
      next: (data) => (this.rooms = data),
      error: (err) => console.error('Error loading rooms', err)
    });
  }

  // Load student data when editing
  private loadStudentIfEdit(): void {
    const studentId = this.route.snapshot.params['id'];
    if (studentId) {
      this.isEdit = true;
      this.studentsService.getStudentById(studentId).subscribe({
        next: (data: Student) => {
          this.studentForm.patchValue({
            studentId: data.studentId,
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            dob: this.formatDateForInput(data.dob),
            gender: data.gender,
            address: data.address,
            guardianName: data.guardianName,
            guardianPhone: data.guardianPhone,
            relationship: data.relationship,   // 👈 Added relationship
            admissionDate: this.formatDateForInput(data.admissionDate),
            bloodGroup: data.bloodGroup,
            courseName: data.courseName  || '',
            idProof: data.idProof,
            roomId: data.roomId,
            guardianAlternativeMobile:data.guardianAlternativeMobile
          });
        },
        error: (err) => console.error('Error loading student', err)
      });
    }
  }

  private formatDateForInput(date: string | Date): string | null {
    if (!date) return null;
    const d = new Date(date);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${d.getFullYear()}-${month}-${day}`;
  }
  
  // Save or update student
  save(): void {
    if (this.studentForm.invalid) return;

    const student: Student = this.studentForm.value;

    if (this.isEdit && student.studentId) {
      this.studentsService.update(student.studentId, student).subscribe({
        next: () => this.router.navigate(['pages/master/students']),
        error: (err) => console.error('Error updating student', err)
      });
    } else {
      this.studentsService.add(student).subscribe({
        next: () => this.router.navigate(['pages/master/students']),
        error: (err) => console.error('Error adding student', err)
      });
    }
  }

  // Cancel and navigate back
  cancel(): void {
    this.router.navigate(['pages/master/students']);
  }
}
