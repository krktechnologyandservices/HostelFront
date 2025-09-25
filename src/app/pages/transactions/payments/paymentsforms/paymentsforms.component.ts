import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaymentService, Payment } from '../payments.service';
import { BookingService, Booking } from '../../booking/booking.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment-form',
  templateUrl: './paymentsforms.component.html'
})
export class PaymentFormComponent implements OnInit {
  @Input() booking!: Booking;
  paymentForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private bookingService: BookingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.paymentForm = this.fb.group({
      paymentMode: ['UPI', Validators.required],
      amount: [this.booking.amount, [Validators.required, Validators.min(1)]]
    });
  }

  pay() {
    const payment: Payment = {
      ...this.paymentForm.value,
      bookingId: this.booking.id!
    };
    this.paymentService.add(payment).subscribe(() => {
      alert('Payment Successful');
      this.router.navigate(['pages/transactions/bookings']);
    });
  }

  cancel() {
    this.router.navigate(['pages/transactions/bookings']);
  }
}
