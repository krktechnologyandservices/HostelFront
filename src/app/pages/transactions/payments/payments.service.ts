import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PendingBill {
  billId: number;
  period?: string;
  billAmount: number;
  paidAmount: number;
  balance: number;
  dueDate?: string;
}

export interface BillAdjustmentDto {
  billId: number;
  adjustedAmount: number;
  remarks?: string;
}

export interface AdditionalChargeDto {
  expenseHeadId: number;
  amount: number;
  remarks?: string;
}

export interface PaymentCreateDto {
  studentId: number;
  bookingId?: number | null;
  paymentDate: string;
  paymentMode: string;
  totalAmount: number;
  referenceNumber?: string;
  remarks?: string;
  paymentType: 'BILL' | 'ADVANCE' | 'OLD';
  billAdjustments?: BillAdjustmentDto[];
  additionalCharges?: AdditionalChargeDto[];
}

export interface PaymentView {
  id: number;
  bookingId: number;
  studentId: number;
  paymentDate: string;
  paymentMode: string;
  amount: number;
  referenceNumber?: string;
  remarks?: string;
  paymentType: string;
}

export interface ExpenseHead {
  id: number;
  name: string;
}


export interface BillAdjustmentView {
  billId: number;
  period?: string;
  adjustedAmount: number;
  remarks?: string;
}

export interface AdditionalChargeView {
  expenseHeadId: number;
  expenseHeadName?: string; // optional if you want to display the head name
  amount: number;
  remarks?: string;
}

export interface PaymentReceiptView extends PaymentView {
  denominations?: string; // for cash breakdown
  billAdjustments?: BillAdjustmentView[];
  additionalCharges?: AdditionalChargeView[];
}





@Injectable({ providedIn: 'root' })
export class PaymentService {
  private api = `${environment.apiBaseUrl}/payments`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<PaymentView[]> { return this.http.get<PaymentView[]>(this.api); }

  getById(id: number) { return this.http.get<PaymentView>(`${this.api}/${id}`); }

  getPendingBills(studentId: number) { return this.http.get<PendingBill[]>(`${this.api}/pending-bills/${studentId}`); }

  getExpenseHeads() { return this.http.get<ExpenseHead[]>(`${this.api}/expense-heads`); }

  create(dto: PaymentCreateDto) { return this.http.post(this.api, dto); }

  delete(id: number) { return this.http.delete(`${this.api}/${id}`); }
}

