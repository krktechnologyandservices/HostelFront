import { Component, OnInit } from '@angular/core';
import { Bill, BillingService } from './billsservice.service';
import { NbDialogService } from '@nebular/theme';
import { NbToastrService, NbGlobalPhysicalPosition, NbGlobalPosition } from '@nebular/theme'
import { OfflinePaymentModalComponent } from './offlinepaymentmodal/offlinepaymentmodal.component';
@Component({
  selector: 'app-bills',
  templateUrl: './bills.component.html',
  styleUrls: ['./bills.component.scss']
})
export class BillsComponent implements OnInit {

  bills: Bill[] = [];
  loading: boolean = false;

  constructor(private billingService: BillingService, 
    private dialogService: NbDialogService,
    private toastrService: NbToastrService
    ) {}

  ngOnInit(): void {
    this.loadBills();
  }

  loadBills() {
    this.loading = true;
    this.billingService.getBills().subscribe({
      next: (res: Bill[]) => {
        // normalize status
        this.bills = res.map(b => ({
          ...b,
          status: b.status.charAt(0).toUpperCase() + b.status.slice(1).toLowerCase()
        }));
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  isPending(bill: Bill) {
    return bill.status.toLowerCase() === 'pending' ||  bill.status.toLowerCase() === 'modified';
  }

  payOnline(bill: Bill) {
    this.billingService.payOnline(bill.id).subscribe({
      next: () => this.loadBills(),
      error: (err) => console.error('Online payment failed', err)
    });
  }


  uploadOffline(bill: any) {
    const dialogRef = this.dialogService.open(OfflinePaymentModalComponent, {
      closeOnBackdropClick: false,
      closeOnEsc: true,
    });
  
    // Pass the billId after dialog creation
    dialogRef.componentRef.instance.billId = bill.id;
    dialogRef.componentRef.instance.amount = bill.amount;

    dialogRef.onClose.subscribe(result => {
      if (result) {
        this.loadBills(); // refresh bills after successful offline payment
      }
    });
  }


  approvePayment(bill: Bill) {
    this.billingService.approvePayment(bill.id).subscribe({
      next: () => this.loadBills(),
      error: (err) => console.error('Approval failed', err)
    });
  }

  rejectPayment(bill: Bill) {
    this.billingService.rejectPayment(bill.id).subscribe({
      next: () => this.loadBills(),
      error: (err) => console.error('Rejection failed', err)
    });
  }

  getBadgeStatus(status: string) {
    switch (status.toLowerCase()) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'approved': return 'primary';
      case 'rejected': return 'danger';
      case 'modified': return 'info';
      case 'cancelled': return 'danger';
      default: return 'basic';
    }
  }
  deleteBill(bill: any) {
    if (confirm(`Are you sure you want to cancel Bill #${bill.id}?`)) {
      this.billingService.softDeleteBill(bill.id).subscribe({
        next: () => {
          bill.status = 'Cancelled'; // update UI immediately
        },
        error: (err) => {
          console.error('Cancellation failed', err);
          alert('cancellation failed, please try again.');
        }
      });
    }
  }
}
