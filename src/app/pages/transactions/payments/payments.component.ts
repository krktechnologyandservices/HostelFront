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

  UpdateVerficaition(paymentId: number)
  {
    if (!confirm('is the Payment Verfied?')) return;
    this.paymentService.delete(paymentId).subscribe({
      next: () => { this.toastr.success('Cancelled'); this.load(); },
      error: () => this.toastr.danger('Cancellation failed')
    });
  }

  deletePayment(payment: PaymentView) {
    if (!confirm('Delete payment?')) return;
    this.paymentService.delete(payment.id).subscribe({
      next: () => { this.toastr.success('Cancelled'); this.load(); },
      error: () => this.toastr.danger('Cancellation failed')
    });
  }
  printReceipt(payment: any) {
    this.paymentService.getReceipt(payment.id).subscribe({
      next: (fullPayment) => {
        this.generateReceiptPdf(fullPayment);
      },
      error: () => this.toastr.danger('Failed to fetch receipt details'),
    });
  }
  
  private async generateReceiptPdf(payment: any) {
    const doc = new jsPDF();
    let y = 20;
  
    // --- Load image dynamically from assets ---
    const logoUrl = 'assets/images/DaleViewLogo.jpg'; // place your logo in src/assets/
    const logoData = await this.getImageAsBase64(logoUrl);
    doc.addImage(logoData, 'PNG', 20, 10, 40, 20); // x, y, width, height
  
    // Company header
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
    doc.text(`Payment ID: ${payment.paymentId}`, 150, y);
  
    // Student & Room
    y += 6;
    doc.text(`Student: ${payment.studentName}`, 20, y);
    doc.text(`Room: ${payment.roomNo || '-'}`, 150, y);
  
    y += 6;
    doc.text(`Payment Mode: ${payment.paymentMode}`, 20, y);
    doc.text(`Payment Type: ${payment.paymentType}`, 150, y);
  
    y += 6;
    doc.text(`Status: ${payment.paymentStatus}`, 20, y);
  
    // Divider line
    y += 6;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 4;
  
    // --- Room Rents ---
    if (payment.roomRents?.length) {
      autoTable(doc, {
        startY: y,
        head: [['Bill No', 'Month', 'Amount']],
        body: payment.roomRents.map((r: any) => [r.billNo, r.month, r.amount.toFixed(2)]),
        theme: 'grid',
        headStyles: { fillColor: [230, 230, 230], textColor: 20, halign: 'center' },
        styles: { fontSize: 10, lineColor: [200, 200, 200], lineWidth: 0.2 },
        margin: { left: 20, right: 20 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  
    // --- Other Charges ---
    if (payment.otherCharges?.length) {
      autoTable(doc, {
        startY: y,
        head: [['Particulars', 'Amount']],
        body: payment.otherCharges.map((c: any) => [c.particulars, c.amount.toFixed(2)]),
        theme: 'grid',
        headStyles: { fillColor: [230, 230, 230], textColor: 20, halign: 'center' },
        styles: { fontSize: 10, lineColor: [200, 200, 200], lineWidth: 0.2 },
        margin: { left: 20, right: 20 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  
    // --- Advances ---
    if (payment.advances?.length) {
      autoTable(doc, {
        startY: y,
        head: [['Advance Date', 'Amount']],
        body: payment.advances.map((a: any) => [
          new Date(a.createdAt).toLocaleDateString(),
          a.amount.toFixed(2),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [230, 230, 230], textColor: 20, halign: 'center' },
        styles: { fontSize: 10, lineColor: [200, 200, 200], lineWidth: 0.2 },
        margin: { left: 20, right: 20 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  
    // Total
    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(0);
    doc.setLineWidth(0.8);
    doc.rect(20, y, 170, 10);
    doc.text(`Total Paid: ${payment.paymentAmount.toFixed(2)}`, 180, y + 7, { align: 'right' });
  
    // Footer
    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Thank you for your payment!', 105, y, { align: 'center' });
  
    doc.save(`Payment_${payment.paymentId}.pdf`);
  }
  
  // Utility to load image as base64
  private getImageAsBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject('Canvas context not found');
        }
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  
  
  
}
