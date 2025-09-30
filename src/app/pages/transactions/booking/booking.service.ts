import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Booking {
  id?: number;
  studentId: number;
  roomId: number;
  tariffPeriod: string;
  startDate: string;
  endDate: string;
  status?: string;
  amount?: number;
  vocationDate?:Date;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private api = `${environment.apiBaseUrl}/bookings`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Booking[]> {
    return this.http.get<Booking[]>(this.api);
  }

  getById(id: number): Observable<Booking> {
    return this.http.get<Booking>(`${this.api}/${id}`);
  }

  add(booking: Booking): Observable<any> {
    return this.http.post(this.api, booking);
  }

  update(id: number, booking: Booking): Observable<any> {
    return this.http.put(`${this.api}/${id}`, booking);
  }

  updateStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.api}/${id}/status?status=${status}`, {});
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.api}/${id}`);
  }
  updateVocation(id: number, data: { vocationDate?: string; status: string }) {
    return this.http.put(`${this.api}/${id}/vocation`, data);
  }
}
