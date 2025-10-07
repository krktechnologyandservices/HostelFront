
import { Component, OnInit, NgZone } from '@angular/core';
import { NbToastrService } from '@nebular/theme';
import { PaymentService, PaymentView } from './payments.service';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { environment } from '../../../../environments/environment';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-payment-list',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss']
})
export class PaymentListComponent implements OnInit {
  payments: PaymentView[] = [];
  filteredPayments: PaymentView[] = [];
  loading = true;

  // Filter fields
  searchText: string = '';
  fromDate: string = '';
  toDate: string = '';

  constructor(
    private paymentService: PaymentService,
    private toastr: NbToastrService,
    private zone: NgZone,
    private router: Router
  ) {}

  ngOnInit(): void {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    this.fromDate = todayStr;
    this.toDate = todayStr;

    this.load();
  }

  load() {
    this.loading = true;
    this.paymentService.getAll().subscribe({
      next: res => { 
        this.payments = res; 
        this.applyFilter();
        this.loading = false; 
      },
      error: () => { 
        this.loading = false; 
        this.toastr.danger('Failed to load payments'); 
      }
    });
  }

  // --- FILTER METHODS ---
  applyFilter() {
    this.filteredPayments = this.payments.filter(p => {
      const matchesText = !this.searchText ||
        p.studentName.toLowerCase().includes(this.searchText.toLowerCase()) ||
        p.id.toString().includes(this.searchText);
  
      // --- Only compare date parts ---
      const paymentDate = new Date(p.paymentDate);
      const from = this.fromDate ? new Date(this.fromDate + 'T00:00:00') : null;
      const to = this.toDate ? new Date(this.toDate + 'T23:59:59') : null;
  
      const matchesDate =
        (!from || paymentDate >= from) &&
        (!to || paymentDate <= to);
  
      return matchesText && matchesDate;
    });
  }
  

  submitFilter() {
    this.applyFilter();
  }

  resetFilter() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    this.searchText = '';
    this.fromDate = todayStr;
    this.toDate = todayStr;
    this.applyFilter();
  }

  addPayment() {
    this.router.navigate(['pages/transactions/payments/new']);
  }

  editPayment(payment: PaymentView) {
    this.router.navigate([`pages/transactions/payments/${payment.id}/edit`]);
  }

  UpdateVerficaition(paymentId: number) {
    if (!confirm('Is the Payment Verified?')) return;
    this.paymentService.UpdateVerification(paymentId).subscribe({
      next: () => { this.toastr.success('Update was successful'); this.load(); },
      error: () => this.toastr.danger('Update failed')
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

  // --- Keep your existing generateReceiptPdf(), QR, and number-to-words methods as is ---
  // ... (copy all existing PDF methods from your current component)






  // --- Main PDF generation method ---
  public async generateReceiptPdf(payment: any) {
    const doc = new jsPDF();
    let y = 20;

    // --- Load logo dynamically ---
    const logoUrl = 'assets/images/DaleViewLogo.jpg';
    try {
      const logoData = await this.getImageAsBase64(logoUrl);
      doc.addImage(logoData, 'PNG', 20, 10, 40, 20);
    } catch (err) {
      console.warn('Logo load failed:', err);
    }

    // --- Header ---
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
    const formattedId = payment.paymentId.toString().padStart(4, '0');
    doc.text(`Receipt No: ${formattedId}`, 150, y);

    // --- Student & Room ---
    y += 6;
    doc.text(`Student: ${payment.studentName}`, 20, y);
    doc.text(`Room: ${payment.roomNo || '-'}`, 150, y);

    y += 6;
    doc.text(`Payment Mode: ${payment.paymentMode}`, 20, y);
    doc.text(`Payment Type: ${payment.paymentType}`, 150, y);

    y += 6;
    doc.text(`Status: ${payment.paymentStatus}`, 20, y);

    // --- Divider line ---
    y += 6;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 4;

    // --- Room Rents Table ---
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

    // --- Other Charges Table ---
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

    // --- Advances Table ---
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

    // --- Total Box with Amount in Words + Numeric ---
    const boxX = 20, boxY = y, boxW = 170, boxH = 18;
    doc.setDrawColor(0);
    doc.setLineWidth(0.8);
    doc.rect(boxX, boxY, boxW, boxH);

    const amountInWords = this.convertNumberToWords(payment.paymentAmount) || 'Zero';
    const wordsText = `Rupees ${amountInWords} Only`;
    const splitWords = doc.splitTextToSize(wordsText, boxW - 10);
    let lineOffset = 6;
    for (let i = 0; i < splitWords.length && i < 2; i++) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(splitWords[i], boxX + 5, boxY + lineOffset + (i * 5));
    }

    // Numeric amount
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Total Paid: ${payment.paymentAmount.toFixed(2)}`, boxX + boxW - 5, boxY + boxH - 4, { align: 'right' });

    y = boxY + boxH + 10;

    // --- QR Code ---
    try {
      const qrDataUrl = await this.generateSignedQrForPayment(payment);
      const qrSize = 20;
      const qrX = boxX + boxW - qrSize;
      const qrY = y;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // Note next to QR
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Scan to verify receipt', qrX - 2 - 20, qrY + 22);

      y = Math.max(y, qrY + qrSize + 8);
    } catch (err) {
      console.warn('QR generation failed:', err);
    }

    // --- Footer ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Thank you for your payment!', 105, y, { align: 'center' });

    // --- Save PDF ---
    doc.save(`Payment_${payment.paymentId}.pdf`);
  }

  // --- Convert number to words ---
  private convertNumberToWords(amount: number): string {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convert = (n: number): string => {
      if (n < 20) return units[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
      if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
    };

    const [whole, fraction] = amount.toFixed(2).split('.');
    let words = convert(parseInt(whole));
    if (parseInt(fraction) > 0) {
      words += ` and ${convert(parseInt(fraction))} Paise`;
    }
    return words.trim();
  }

  // --- Load image as Base64 ---
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

  // // --- Generate QR code with signed verification URL ---
  // private async generateSignedQrForPayment(payment: any): Promise<string> {
  //   const secretKey = 'mySecretKey123'; // should match backend verification
  //   const payload = `${payment.paymentId}|${payment.paymentAmount}|${payment.paymentDate}`;
  //   const signature = this.hashString(payload + secretKey);

  //   const verificationUrl = `${environment.apiBaseUrl}/verify?paymentId=${payment.paymentId}&amount=${payment.paymentAmount}&date=${encodeURIComponent(payment.paymentDate)}&sig=${signature}`;

  //   try {
  //     const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 200 });
  //     return qrDataUrl;
  //   } catch (err) {
  //     console.error('QR code generation failed', err);
  //     throw err;
  //   }
  // }

  private async generateSignedQrForPayment(payment: any): Promise<string> {
    const secretKey = 'mySecretKey123'; // must match backend

    // --- format payload exactly like backend ---
    const payload = `${payment.paymentId}|${payment.paymentAmount.toFixed(2)}|${new Date(payment.paymentDate).toISOString().split('T')[0]}`;

    // --- HMAC-SHA256 signature ---
    const signature = CryptoJS.HmacSHA256(payload, secretKey).toString(CryptoJS.enc.Hex);

    // --- verification URL ---
    const verificationUrl = `${environment.apiBaseUrl}/verify?paymentId=${payment.paymentId}&amount=${payment.paymentAmount.toFixed(2)}&date=${encodeURIComponent(new Date(payment.paymentDate).toISOString().split('T')[0])}&sig=${signature}`;

    // --- generate QR ---
    return await QRCode.toDataURL(verificationUrl, { width: 200 });
}

  // --- Simple hash function for signature ---
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  }


  
  
}
