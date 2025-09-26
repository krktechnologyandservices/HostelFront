import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
export interface Bill {
  id: number;
  studentName: string;
  roomType: string;
  period: string;
  amount: number;
  status: string;
  dueDate: string;
  paymentMode?: string;
  receiptUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class BillingService {
  private baseUrl = `${environment.apiBaseUrl}/billing`; // .NET Core API

  constructor(private http: HttpClient) {}

  getBills(): Observable<Bill[]> {
    return this.http.get<Bill[]>(`${this.baseUrl}/list`);
  }

  payOnline(billId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/pay-online/${billId}`, {});
  }

  uploadOfflinePayment(billId: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/upload-offline/${billId}`, formData);
  }

  getOfflinePayments(): Observable<Bill[]> {
    return this.http.get<Bill[]>(`${this.baseUrl}/offline-pending`);
  }

  approvePayment(billId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/approve/${billId}`, {});
  }

  rejectPayment(billId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/reject/${billId}`, {});
    
  }

  softDeleteBill(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/soft-delete/${id}`, {});
  }

  
}
