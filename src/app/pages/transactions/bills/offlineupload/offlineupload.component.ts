import { Component, Input } from '@angular/core';
import { NbDialogRef } from '@nebular/theme';
import { BillingService, Bill } from '../billsservice.service';

@Component({
  selector: 'app-offline-upload',
  templateUrl: './offlineupload.component.html',
  styleUrls: ['./offlineupload.component.scss']
})
export class OfflineuploadComponent {
  @Input() bill!: Bill;
  file?: File;
  paymentMode: string = '';
  uploading = false;

  constructor(
    private billingService: BillingService,
    private ref: NbDialogRef<OfflineuploadComponent>
  ) {}

  onFileChange(event: any) {
    this.file = event.target.files[0];
  }

  submit() {
    if (!this.file || !this.paymentMode) return;
    const formData = new FormData();
    formData.append('file', this.file);
    formData.append('paymentMode', this.paymentMode);

    this.uploading = true;
    this.billingService.uploadOfflinePayment(this.bill.id, formData).subscribe({
      next: () => {
        alert('Offline payment uploaded!');
        this.ref.close(true);
      },
      error: () => (this.uploading = false)
    });
  }

  close() {
    this.ref.close();
  }
}
