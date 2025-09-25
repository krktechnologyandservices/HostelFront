import { Component, OnInit } from '@angular/core';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './datshboard.component.html',
  styleUrls: ['./datshboard.component.scss']
})
export class DashboardComponent implements OnInit {
  pendingDues: any = [];
  upcomingBills: any = [];
  lateFees: any;
  roomUtilization: any = [];
  studentStats: any;

  constructor(private service: DashboardService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard() {
    this.service.getPendingDues().subscribe(res => this.pendingDues = res);
    this.service.getUpcomingBills().subscribe(res => this.upcomingBills = res);
    this.service.getLateFees().subscribe(res => this.lateFees = res);
    this.service.getRoomUtilization().subscribe(res => this.roomUtilization = res);
    this.service.getStudentStats().subscribe(res => this.studentStats = res);
  }
}
