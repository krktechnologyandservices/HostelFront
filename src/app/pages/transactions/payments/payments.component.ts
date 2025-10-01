import { Component, OnInit, NgZone } from '@angular/core';
import { NbToastrService } from '@nebular/theme';
import { PaymentService, PaymentView } from './payments.service';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-payment-list',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss']
})
export class PaymentListComponent implements OnInit {
  payments: PaymentView[] = [];
  loading = true;

  constructor(
    private paymentService: PaymentService,
    private toastr: NbToastrService,
    private zone: NgZone,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.paymentService.getAll().subscribe({
      next: res => { this.payments = res; this.loading = false; },
      error: () => { this.loading = false; this.toastr.danger('Failed to load payments'); }
    });
  }

  addPayment() {
    this.router.navigate(['pages/transactions/payments/new']); // navigate to payment form page
  }

  editPayment(payment: PaymentView) {
    this.router.navigate([`pages/transactions/payments/${payment.id}/edit`]); // navigate to payment form page with ID
  }

  deletePayment(payment: PaymentView) {
    if (!confirm('Delete payment?')) return;
    this.paymentService.delete(payment.id).subscribe({
      next: () => { this.toastr.success('Deleted'); this.load(); },
      error: () => this.toastr.danger('Delete failed')
    });
  }

  printReceipt(payment: any) {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Dale View Hostel', 105, y, { align: 'center' });

    y += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Receipt', 105, y, { align: 'center' });

    y += 12;
    doc.setFontSize(10);
    doc.text(`Receipt Date: ${new Date(payment.paymentDate).toLocaleDateString()}`, 20, y);
    doc.text(`Payment ID: ${payment.id}`, 150, y);

    y += 6;
    doc.text(`Student ID: ${payment.studentId}`, 20, y);
    doc.text(`Booking ID: ${payment.bookingId || '-'}`, 150, y);

    y += 6;
    doc.text(`Payment Mode: ${payment.paymentMode}`, 20, y);
    doc.text(`Reference: ${payment.referenceNumber || '-'}`, 150, y);

    y += 6;
    doc.text(`Cash Denomination: ${payment.denominations || '-'}`, 20, y);

    y += 6;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 4;

    if (payment.billAdjustments?.length) {
      autoTable(doc, {
        startY: y,
        head: [['Bill ID', 'Period', 'Adjusted Amount']],
        body: payment.billAdjustments.map((adj: any) => [
          adj.billId.toString(),
          adj.period || '-',
          adj.adjustedAmount.toFixed(2),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 10 },
        margin: { left: 20, right: 20 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (payment.additionalCharges?.length) {
      autoTable(doc, {
        startY: y,
        head: [['Expense Head', 'Amount', 'Remarks']],
        body: payment.additionalCharges.map((ch: any) => [
          ch.expenseHeadName || ch.expenseHeadId,
          ch.amount.toFixed(2),
          ch.remarks || '-',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 10 },
        margin: { left: 20, right: 20 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(0);
    doc.setLineWidth(0.8);
    doc.rect(20, y, 170, 10);
    doc.text(`Total Paid: ${payment.amount.toFixed(2)}`, 180, y + 7, { align: 'right' });

    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Thank you for your payment!', 105, y, { align: 'center' });

    doc.save(`Payment_${payment.id}.pdf`);
  }
}
