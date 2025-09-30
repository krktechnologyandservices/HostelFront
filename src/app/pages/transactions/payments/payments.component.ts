import { Component, OnInit,NgZone  } from '@angular/core';
import { NbDialogService, NbToastrService } from '@nebular/theme';
import { PaymentService, PaymentView } from './payments.service';
import { PaymentFormComponent } from './paymentsforms/paymentsforms.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
interface BillAdjustmentView {
  billId: number;
  period?: string;
  adjustedAmount: number;
  remarks?: string;
}

interface AdditionalChargeView {
  expenseHeadId: number;
  expenseHeadName?: string;
  amount: number;
  remarks?: string;
}

interface PaymentReceiptView extends PaymentView {
  denominations?: string;
  billAdjustments?: BillAdjustmentView[];
  additionalCharges?: AdditionalChargeView[];
}

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
    private dialog: NbDialogService,
    private toastr: NbToastrService,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.paymentService.getAll().subscribe({
      next: res => { this.payments = res; this.loading = false; },
      error: () => { this.loading = false; this.toastr.danger('Failed load'); }
    });
  }
  openPaymentDialog(payment?: any) {
    setTimeout(() => {  // ensures <nb-layout> exists
      this.dialog.open(PaymentFormComponent, { context: { payment } });
    }, 0);
  }
  
  edit(payment: PaymentView) {
    this.dialog.open(PaymentFormComponent, { context: { payment } }).onClose.subscribe(saved => {
      if (saved) this.load();
    });
  }

  delete(payment: PaymentView) {
    if (!confirm('Delete payment?')) return;
    this.paymentService.delete(payment.id).subscribe({
      next: () => { this.toastr.success('Deleted'); this.load(); },
      error: () => this.toastr.danger('Delete failed')
    });
  }
  printReceipt(payment: any) {
    const doc = new jsPDF();
    let y = 20;
  
    // Institute heading
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DaleView Hostel Management', 105, y, { align: 'center' });
  
    y += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Voucher', 105, y, { align: 'center' });
  
    y += 12;
    // Payment details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
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
  
    // Separator line
    y += 6;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 4;
  
    // Bill Adjustments Table
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
  
    // Additional Charges Table
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
  
    // Total Amount box
    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(0);
    doc.setLineWidth(0.8);
    doc.rect(20, y, 170, 10); // rectangle for total
    doc.text(`Total Paid: ${payment.amount.toFixed(2)}`, 180, y + 7, { align: 'right' });
  
    // Footer
    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Thank you for your payment!', 105, y, { align: 'center' });
  
    doc.save(`Payment_${payment.id}.pdf`);
  }
  
  
}
