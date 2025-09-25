import { Component, NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BookingComponent } from './booking/booking.component';
import { BookingFormComponent } from './booking/bookingforms/bookingforms.component';
import { PaymentFormComponent } from './payments/paymentsforms/paymentsforms.component';
import { BillsComponent } from './bills/bills.component';
const routes: Routes = [
    
  { path: 'bookings', component: BookingComponent },
  { path: 'bookings/add', component: BookingFormComponent },
  { path: 'bookings/edit/:id', component:BookingFormComponent },
  { path: 'bookings/payment/:id', component: PaymentFormComponent },
  { path: 'bills', component: BillsComponent },
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TransactionRoutingModule {
}
