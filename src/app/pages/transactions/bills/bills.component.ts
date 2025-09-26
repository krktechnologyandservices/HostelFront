import { Component, OnInit } from '@angular/core';
import { Bill, BillingService } from './billsservice.service';

@Component({
  selector: 'app-bills',
  templateUrl: './bills.component.html',
  styleUrls: ['./bills.component.scss']
})
export class BillsComponent implements OnInit {

  bills: Bill[] = [];
  loading: boolean = false;

  constructor(private billingService: BillingService) {}

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
    return bill.status.toLowerCase() === 'pending';
  }

  payOnline(bill: Bill) {
    this.billingService.payOnline(bill.id).subscribe({
      next: () => this.loadBills(),
      error: (err) => console.error('Online payment failed', err)
    });
  }

  uploadOffline(bill: Bill) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      this.billingService.uploadOfflinePayment(bill.id, formData).subscribe({
        next: () => this.loadBills(),
        error: (err) => console.error('Offline upload failed', err)
      });
    };
    input.click();
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
      case 'deleted': return 'danger';
      default: return 'basic';
    }
  }
  deleteBill(bill: any) {
    if (confirm(`Are you sure you want to delete Bill #${bill.id}?`)) {
      this.billingService.softDeleteBill(bill.id).subscribe({
        next: () => {
          bill.status = 'Deleted'; // update UI immediately
        },
        error: (err) => {
          console.error('Delete failed', err);
          alert('Delete failed, please try again.');
        }
      });
    }
  }
}
