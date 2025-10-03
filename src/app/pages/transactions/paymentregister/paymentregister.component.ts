import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PaymentRegisterService } from './paymentregister.service';
import * as jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-payment-register',
  templateUrl: './paymentregister.component.html',
  styleUrls: ['./paymentregister.component.scss']
})
export class PaymentRegisterComponent implements OnInit {

  filterForm: FormGroup;
  payments: any[] = [];
  rooms: any[] = [];
  students: any[] = [];

  constructor(private fb: FormBuilder, private service: PaymentRegisterService) { }

  ngOnInit(): void {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    this.filterForm = this.fb.group({
      rooms: [[]],
      students: [[]],
      fromDate: [todayStr],
      toDate: [todayStr]
    });

    this.loadFilters();
    this.loadPayments();
  }

  loadFilters() {
    this.service.getRooms().subscribe(res => this.rooms = res);
    this.service.getStudents().subscribe(res => this.students = res);
  }

  loadPayments() {
    const filters = this.filterForm.value;
    this.service.getPayments(filters).subscribe(res => this.payments = res);
  }

  submitFilter() {
    this.loadPayments();
  }

 
  async exportPDF() {
    const doc = new jsPDF.default('p','pt','a4');
    let yPos = 70;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const currentDate = new Date().toLocaleDateString();

    // Load logo as Base64
    const logoData = await this.getImageAsBase64('assets/images/logo.jpg');

    // Header with Logo
    const drawHeader = () => {
      // Add logo
      const img = new Image();
      img.src = logoData;
      img.onload = () => {}; // ensure loaded
      let logoWidth = 60;  // max width
      let logoHeight = 30; // max height

      // preserve aspect ratio
      if (img.width && img.height) {
        const ratio = img.width / img.height;
        if (logoWidth / logoHeight > ratio) {
          logoWidth = logoHeight * ratio;
        } else {
          logoHeight = logoWidth / ratio;
        }
      }

      doc.addImage(logoData, 'JPEG', 40, 10, logoWidth, logoHeight);

      // Title
      doc.setFontSize(14).setFont("helvetica", "bold");
      doc.text("Dale View Hostel", pageWidth / 2, 30, { align: "center" });
      doc.setFontSize(12).setFont("helvetica", "normal");
      doc.text("Payment Register", pageWidth / 2, 48, { align: "center" });

      // Date
      doc.setFontSize(9);
      doc.text(`Generated on: ${currentDate}`, pageWidth - 40, 30, { align: "right" });

      yPos = 70;
    };

    // Footer
    const drawFooter = (pageNumber: number) => {
      doc.setFontSize(9).setTextColor(100);
      doc.text(`Page ${pageNumber}`, pageWidth - 50, pageHeight - 20);
    };

    let currentPage = 1;
    drawHeader();
    drawFooter(currentPage);

    // Section drawer (tables)
    const drawSection = (title: string, head: string[], body: any[], totalLabel?: string, totalValue?: number) => {
      autoTable(doc, {
        startY: yPos,
        head: [[title]],
        body: [],
        theme: "plain",
        headStyles: { fillColor: [240,240,240], halign: "left", fontSize: 10, fontStyle: "bold", textColor: [0,0,0] },
        margin: { left: 40, right: 40 },
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 2,
        head: [head],
        body: body,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2, lineWidth: 0.2 },
        headStyles: { fillColor: [220,220,220], textColor: [0,0,0], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248,248,248] },
        margin: { left: 40, right: 40 },
        didDrawPage: (data) => {
          yPos = data.cursor.y + 8;
          if (doc.getNumberOfPages() > currentPage) {
            currentPage = doc.getNumberOfPages();
            drawHeader();
            drawFooter(currentPage);
          }
        },
      });

      if (totalLabel) {
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY,
          body: [[`${totalLabel}`, "", "", "", totalValue?.toFixed(2)]],
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 2, lineWidth: 0.2, fontStyle: "bold" },
          bodyStyles: { fillColor: [240,240,240] },
          margin: { left: 40, right: 40 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
    };

    // Loop through payments
    this.payments.forEach((pay, index) => {
      // Student/payment info table
      autoTable(doc, {
        startY: yPos,
        body: [
          [
            { content: `S.No: ${index+1}`, styles: { halign: "left", fontStyle: "bold" } },
            { content: `Date: ${new Date(pay.paymentDate).toLocaleDateString()}`, styles: { halign: "left" } },
            { content: `Student: ${pay.studentName}`, styles: { halign: "left" } },
          ],
          [
            { content: `Room: ${pay.roomNo}`, styles: { halign: "left" } },
            { content: `Type: ${pay.paymentType}`, styles: { halign: "left" } },
            { content: `Mode: ${pay.paymentMode}`, styles: { halign: "left" } },
          ],
          [
            { content: `Amount: ${pay.paymentAmount.toFixed(2)}`, styles: { halign: "left" } },
            { content: `Status: ${pay.paymentStatus}`, styles: { halign: "left" } },
            { content: "", styles: { halign: "left" } },
          ],
        ],
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3, lineWidth: 0.2 },
        margin: { left: 40, right: 40 },
        bodyStyles: { fillColor: [250,250,250] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Sections
      if (pay.roomRents?.length) {
        const body = pay.roomRents.map((r, idx) => [idx+1, r.BillNo, r.RoomNo, r.Month, r.Amount.toFixed(2)]);
        const total = pay.roomRents.reduce((a,b) => a+b.Amount, 0);
        drawSection("Room Rent Paid", ["S.No","BillNo","Room","Month","Amount"], body, "Total Rent", total);
      }

      if (pay.otherCharges?.length) {
        const body = pay.otherCharges.map((c, idx) => [idx+1, c.particulars,"","","",c.amount.toFixed(2)]);
        const total = pay.otherCharges.reduce((a,b)=>a+b.amount,0);
        drawSection("Other Charges", ["S.No","Particulars","","","Amount"], body, "Total Other Charges", total);
      }

      if (pay.advances?.length) {
        const body = pay.advances.map((a, idx) => [idx+1, new Date(a.createdAt).toLocaleDateString(),"","","", a.amount.toFixed(2)]);
        const total = pay.advances.reduce((a,b)=>a+b.amount,0);
        drawSection("Advance Payments", ["S.No","Date","","","Amount"], body, "Total Advance", total);
      }

      if (pay.additionalCharges?.length) {
        const body = pay.additionalCharges.map((a, idx)=>[idx+1, a.particular,"","","",a.amount.toFixed(2)]);
        const total = pay.additionalCharges.reduce((a,b)=>a+b.amount,0);
        drawSection("Additional Charges", ["S.No","Particular","","","Amount"], body, "Total Additional", total);
      }
    });

    doc.save("payment-register.pdf");
  }

  // Helper to convert image to Base64
  private async getImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(blob);
    });
  }

  
  getStatusClass(status: string) {
    return {
      'status-paid': status?.toLowerCase() === 'paid',
      'status-pending': status?.toLowerCase() === 'pending',
      'status-failed': status?.toLowerCase() === 'overdue' || status?.toLowerCase() === 'failed',
    };
  }
}
