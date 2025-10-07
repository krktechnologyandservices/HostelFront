import { Component, OnInit } from '@angular/core';
import { DashboardService } from './dashboard.service';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { from } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';
@Component({
  selector: 'app-dashboard',
  templateUrl: './datshboard.component.html',
  styleUrls: ['./datshboard.component.scss']
})
export class DashboardComponent implements OnInit {
  rooms: any[] = [];
  selectedRoom: any = null;
  occupants: any[] = [];
  totalActiveBookings: number = 0;
  totalVacated: number = 0;
  showPendingOnly: boolean = false;


  students: any[] = [];
  courses: string[] = [];
  currentMonthAdmissions: number = 0;
  maleCount: number = 0;
  femaleCount: number = 0;
  courseWiseCount: any = {};
  inactiveStudents: any[] = [];

  showExportModal: boolean = false;



  payments: any[] = [];
filteredPayments: any[] = [];
paymentFilters: any = {};

todayPaymentsCount = 0;
monthPaymentsCount = 0;
pendingPaymentsCount = 0;
totalDueAmount = 0;


paymentColumns = [
  { field: 'StudentName', header: 'Student Name' },
  { field: 'PaymentDate', header: 'Payment Date' },
  { field: 'PaymentMode', header: 'Payment Mode' },
  { field: 'TotalAmount', header: 'Paid (₹)' },
  { field: 'DueAmount', header: 'Due (₹)' },
  { field: 'Status', header: 'Status' }
];

  constructor(private dashboardService: DashboardService,private router:Router) {}

  ngOnInit() {

    forkJoin([this.dashboardService.getStudents(), this.dashboardService.getCourses()]).subscribe(([students, courses]) => {
      this.students = students;
      this.courses = courses;

      this.calculateMetrics();
    });



    this.dashboardService.getRooms().subscribe(rooms => {
      this.rooms = rooms;
  
      // Total active bookings
      this.totalActiveBookings = this.rooms.reduce(
        (total, room) => total + room.occupiedCount, 
        0
      );
  
      // Instead of calling all 50 APIs at once, limit to 5 concurrent calls
      from(rooms)
        .pipe(
          mergeMap(
            room => this.dashboardService.getRoomOccupants(room.roomId),
            5 // 🔹 concurrency limit (you can adjust to 3–10)
          ),
          toArray()
        )
        .subscribe(allOccupants => {
          this.totalVacated = allOccupants.reduce((total, roomOccupants) => {
            return total + roomOccupants.filter(s => s.isTemporary).length;
          }, 0);
        });
    });
  }

  currentMonthAddmission()
  {     const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    this.inactiveStudents = this.students.filter(s => { const date = new Date(s.admissionDate);
      
      return date.getMonth() === month && date.getFullYear() === year });
  }

  GetStudentbygender(gender:string)
  {
    

    this.inactiveStudents = this.students.filter(s => 
        s.gender===gender );
  }
  

  GetStudentBycourse(courseName:string)
  {
    

    this.inactiveStudents = this.students.filter(s => 
        s.course===courseName );
  }


  getRoomColor(room: any) {
    const occupied = room.occupiedCount ;
    if (occupied === room.capacity) return '#f44336'; // full
    if (occupied >= room.capacity / 2) return '#ff9800'; // partial
    return '#4caf50'; // mostly vacant
  }

  selectRoom(room: any) {
    if (this.selectedRoom?.Id === room.roomId) {
      this.selectedRoom = null;
      this.occupants = [];
      return;
    }

    this.selectedRoom = room;
    this.dashboardService.getRoomOccupants(room.roomId)
      .subscribe(res => {
        this.occupants = this.showPendingOnly ? res.filter(s => s.paymentPending) : res;
      });
  }





  calculateMetrics() {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

   ;


    this.currentMonthAdmissions = this.students.filter(s => {
     const date = new Date(s.admissionDate);
      
      return date.getMonth() === month && date.getFullYear() === year
  }).length;

    // Male / Female counts
    this.maleCount = this.students.filter(s => s.gender === 'Male').length;
    this.femaleCount = this.students.filter(s => s.gender === 'Female').length;

    // Course wise count
    this.courseWiseCount = {};
    this.courses.forEach(course => {
      this.courseWiseCount[course] = this.students.filter(s => s.course === course).length;
    });

    // Inactive students
    this.inactiveStudents = this.students.filter(s => !s.isActive || !s.roomNo);
  }

  openExportModal() {
    this.showExportModal = true;
  }

  closeExportModal() {
    this.showExportModal = false;
  }

  exportStudents(filters: any) {
    console.log('Export with filters:', filters);
    this.showExportModal = false;
    // Mock: Implement Excel export later
  }

  viewStudent(student: any) {
    if (!student?.studentId) return;
    this.router.navigate(['pages/master/students/edit', student.studentId]);
  }




  loadPayments(criteria: string) {
    this.dashboardService.getPayments(criteria).subscribe((res: any[]) => {
      this.payments = res;
      this.filteredPayments = [...this.payments];
      this.paymentFilters = {};
  
      this.todayPaymentsCount = res.filter(p => p.paymentDate === '2025-10-06').length;
      this.monthPaymentsCount = res.filter(p => p.paymentDate?.startsWith('2025-10')).length;
      this.pendingPaymentsCount = res.filter(p => p.Status === 'Pending').length;
      this.totalDueAmount = res.reduce((sum, p) => sum + (p.dueAmount || 0), 0);
    });
  }
  
  applyPaymentFilters() {
    this.filteredPayments = this.payments.filter(payment => {
      return this.paymentColumns.every(col => {
        const value = payment[col.field]?.toString().toLowerCase() || '';
        const filterVal = (this.paymentFilters[col.field] || '').toLowerCase();
        return value.includes(filterVal);
      });
    });
  }
  
  viewPayment(payment: any) {
    console.log('Viewing Payment:', payment);
  }


  collapsedSections: any = {
    rooms: false,
    students: false,
    payments: false
  };
  
  toggleSection(section: string) {
    this.collapsedSections[section] = !this.collapsedSections[section];
  }
  
}
