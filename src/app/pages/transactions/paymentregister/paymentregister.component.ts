// paymentregister.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PaymentRegisterService } from './paymentregister.service';
import * as jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-payment-register',
  templateUrl: './paymentregister.component.html',
  styleUrls: ['./paymentregister.component.scss']
})
export class PaymentRegisterComponent implements OnInit, OnDestroy {
  filterForm: FormGroup;
  payments: any[] = [];
  rooms: any[] = [];
  students: any[] = [];
  
  // UI State
  isFiltersExpanded = true;
  isTableView = true;
  isLoading = false;
  currentPage = 1;
  totalRecords = 0;
  hasNextPage = false;
  
  // Section expansion state
  expandedSections = new Map<string, Set<string>>();

  constructor(private fb: FormBuilder, private service: PaymentRegisterService) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadFilters();
    this.submitFilter();
    
    // Initialize with filters expanded on desktop, collapsed on mobile
    this.isFiltersExpanded = window.innerWidth > 768;
  }

  ngOnDestroy(): void {
    this.expandedSections.clear();
  }

  private initializeForm(): void {
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
  }

  loadFilters(): void {
    this.service.getRooms().subscribe({
      next: (res) => this.rooms = res,
      error: (error) => console.error('Error loading rooms:', error)
    });
    
    this.service.getStudents().subscribe({
      next: (res) => this.students = res,
      error: (error) => console.error('Error loading students:', error)
    });
  }

  loadPayments(filters?: any): void {
    this.isLoading = true;
    
    const filterData = filters || this.filterForm.value;
    
    this.service.getPayments(filterData).subscribe({
      next: (res) => {
        this.payments = res;
        this.totalRecords = res.length;
        this.hasNextPage = this.payments.length > 10;
        this.isLoading = false;
        
        // Debug log to check data
        console.log('Payments loaded:', this.payments.length);
        if (this.payments.length > 0) {
          console.log('Sample payment:', this.payments[0]);
        }
      },
      error: (error) => {
        console.error('Error loading payments:', error);
        this.isLoading = false;
        this.payments = [];
      }
    });
  }

  submitFilter(): void {
    this.currentPage = 1;
    const filters = this.filterForm.value;
    this.loadPayments(filters);
  }

  resetFilters(): void {
    this.initializeForm();
    this.submitFilter();
  }

  refreshData(): void {
    this.submitFilter();
  }

  toggleFilterExpansion(): void {
    this.isFiltersExpanded = !this.isFiltersExpanded;
  }

  toggleViewMode(): void {
    this.isTableView = !this.isTableView;
  }

  // Section expansion methods
  toggleSection(payment: any, sectionType: string): void {
    const paymentKey = this.getPaymentKey(payment);
    if (!this.expandedSections.has(paymentKey)) {
      this.expandedSections.set(paymentKey, new Set());
    }
    
    const sections = this.expandedSections.get(paymentKey)!;
    if (sections.has(sectionType)) {
      sections.delete(sectionType);
    } else {
      sections.add(sectionType);
    }
  }

  isSectionExpanded(payment: any, sectionType: string): boolean {
    const paymentKey = this.getPaymentKey(payment);
    return this.expandedSections.get(paymentKey)?.has(sectionType) || false;
  }

  private getPaymentKey(payment: any): string {
    return `${payment.id || payment.paymentId}-${payment.studentName}`;
  }

  // Pagination methods
  nextPage(): void {
    if (this.hasNextPage) {
      this.currentPage++;
      this.submitFilter();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.submitFilter();
    }
  }

  // TrackBy functions for performance
  trackByPaymentId(index: number, payment: any): string {
    return payment.id || payment.paymentId || index.toString();
  }

  trackByRoomId(index: number, room: any): string {
    return room.Id || index.toString();
  }

  trackByStudentId(index: number, student: any): string {
    return student.Id || index.toString();
  }

  // FIXED: Status methods - return string instead of object
  getStatusClass(status: string): string {
    if (!status) return 'status-pending';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('paid') || statusLower.includes('completed') || statusLower === 'paid') {
      return 'status-paid';
    } else if (statusLower.includes('pending') || statusLower.includes('processing') || statusLower === 'pending') {
      return 'status-pending';
    } else if (statusLower.includes('failed') || statusLower.includes('overdue') || statusLower.includes('cancelled') || statusLower === 'failed') {
      return 'status-failed';
    }
    return 'status-pending';
  }

  getStatusIcon(status: string): string {
    if (!status) return 'clock-outline';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('paid') || statusLower.includes('completed') || statusLower === 'paid') {
      return 'checkmark-circle-outline';
    } else if (statusLower.includes('pending') || statusLower.includes('processing') || statusLower === 'pending') {
      return 'clock-outline';
    } else if (statusLower.includes('failed') || statusLower.includes('overdue') || statusLower.includes('cancelled') || statusLower === 'failed') {
      return 'close-circle-outline';
    }
    return 'clock-outline';
  }

  // Action methods
  viewPaymentDetails(payment: any): void {
    console.log('View payment details:', payment);
  }

  async exportPDF(): Promise<void> {
    if (this.payments.length === 0) {
      console.warn('No payments to export');
      return;
    }

    try {
      const doc = new jsPDF.default('p', 'pt', 'a4');
      let yPos = 70;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const currentDate = new Date().toLocaleDateString();

      // Load logo as Base64
      const logoData = await this.getImageAsBase64('assets/images/DaleViewLogo.jpg');

      // Header with Logo
      const drawHeader = () => {
        const logoWidth = 60;
        const logoHeight = 30;

        if (logoData) {
          doc.addImage(logoData, 'JPEG', 40, 10, logoWidth, logoHeight);
        }

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

        if (totalLabel && totalValue !== undefined) {
          autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            body: [[`${totalLabel}`, "", "", "", totalValue.toFixed(2)]],
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
              { content: `Amount: ${pay.paymentAmount?.toFixed(2) || '0.00'}`, styles: { halign: "left" } },
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
          const body = pay.roomRents.map((r: any, idx: number) => [idx+1, r.BillNo, r.RoomNo, r.Month, (r.Amount || 0).toFixed(2)]);
          const total = pay.roomRents.reduce((a: number, b: any) => a + (b.Amount || 0), 0);
          drawSection("Room Rent Paid", ["S.No","BillNo","Room","Month","Amount"], body, "Total Rent", total);
        }

        if (pay.otherCharges?.length) {
          const body = pay.otherCharges.map((c: any, idx: number) => [idx+1, c.particulars,"","","",(c.amount || 0).toFixed(2)]);
          const total = pay.otherCharges.reduce((a: number, b: any) => a + (b.amount || 0), 0);
          drawSection("Other Charges", ["S.No","Particulars","","","Amount"], body, "Total Other Charges", total);
        }

        if (pay.advances?.length) {
          const body = pay.advances.map((a: any, idx: number) => [idx+1, new Date(a.createdAt).toLocaleDateString(),"","","", (a.amount || 0).toFixed(2)]);
          const total = pay.advances.reduce((a: number, b: any) => a + (b.amount || 0), 0);
          drawSection("Advance Payments", ["S.No","Date","","","Amount"], body, "Total Advance", total);
        }

        if (pay.additionalCharges?.length) {
          const body = pay.additionalCharges.map((a: any, idx: number) => [idx+1, a.particular,"","","",(a.amount || 0).toFixed(2)]);
          const total = pay.additionalCharges.reduce((a: number, b: any) => a + (b.amount || 0), 0);
          drawSection("Additional Charges", ["S.No","Particular","","","Amount"], body, "Total Additional", total);
        }
      });

      doc.save("payment-register.pdf");
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  }

  async exportSinglePDF(payment: any): Promise<void> {
    try {
      const doc = new jsPDF.default('p', 'pt', 'a4');
      
      doc.setFontSize(16).setFont("helvetica", "bold");
      doc.text("Payment Receipt", 20, 30);
      
      doc.setFontSize(10).setFont("helvetica", "normal");
      doc.text(`Student: ${payment.studentName}`, 20, 60);
      doc.text(`Room: ${payment.roomNo}`, 20, 80);
      doc.text(`Date: ${new Date(payment.paymentDate).toLocaleDateString()}`, 20, 100);
      doc.text(`Amount: ${payment.paymentAmount?.toFixed(2) || '0.00'}`, 20, 120);
      doc.text(`Type: ${payment.paymentType}`, 20, 140);
      doc.text(`Mode: ${payment.paymentMode}`, 20, 160);
      doc.text(`Status: ${payment.paymentStatus}`, 20, 180);
      
      doc.save(`payment-${payment.studentName}-${payment.paymentDate}.pdf`);
    } catch (error) {
      console.error('Error exporting single PDF:', error);
    }
  }

  // Helper to convert image to Base64
  private async getImageAsBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error loading image:', error);
      return '';
    }
  }
}