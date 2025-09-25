import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
export interface Payment {
  id?: number;
  bookingId: number;
  paymentMode: string;
  amount: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private api = `${environment.apiBaseUrl}/payments`;
  constructor(private http: HttpClient) {}
  add(payment: Payment): Observable<any> { return this.http.post(this.api, payment); }
  getByBooking(bookingId: number): Observable<Payment[]> { return this.http.get<Payment[]>(`${this.api}/${bookingId}`); }
}
