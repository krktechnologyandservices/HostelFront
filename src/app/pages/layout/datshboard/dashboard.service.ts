import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private baseUrl = `${environment.apiBaseUrl}/dashboard`;
  constructor(private http: HttpClient) {}

  getOccupancy(): Observable<any> { return this.http.get(`${this.baseUrl}/occupancy`); }
  getRevenue(): Observable<any> { return this.http.get(`${this.baseUrl}/revenue`); }
  getPendingDues(): Observable<any> { return this.http.get(`${this.baseUrl}/pending-dues`); }
  getUpcomingBills(): Observable<any> { return this.http.get(`${this.baseUrl}/upcoming-bills`); }
  getLateFees(): Observable<any> { return this.http.get(`${this.baseUrl}/late-fees`); }
  getRoomUtilization(): Observable<any> { return this.http.get(`${this.baseUrl}/room-utilization`); }
  getStudentStats(): Observable<any> { return this.http.get(`${this.baseUrl}/student-stats`); }
}
