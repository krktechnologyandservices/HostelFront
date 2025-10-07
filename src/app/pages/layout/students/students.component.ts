import { Component, OnInit,ViewChild, TemplateRef } from '@angular/core';
import {formatDate} from '@angular/common';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { StudentService, Student, LedgerEntry } from './students.service';
import { NbDialogService } from '@nebular/theme';

import autoTable from 'jspdf-autotable';
@Component({
  selector: 'app-student-list',
  templateUrl: './students.component.html',
  styleUrls: ['./students.component.scss']
})
export class StudentsComponent implements OnInit {

  students: Student[] = [];
  filteredStudents: Student[] = [];
  searchQuery = '';
  @ViewChild('photoModal') photoModal!: TemplateRef<any>; // <
  studentPhotos: { [studentId: number]: SafeUrl } = {}; // Blob URLs
  enlargedPhotoUrl?: SafeUrl;

  // Ledger related
  ledgerStudent?: Student;
  ledgerEntries: LedgerEntry[] = [];
  fromDate?: string;
  toDate?: string;

  constructor(
    private studentService: StudentService,
    public router: Router,
    private sanitizer: DomSanitizer,
    private dialogService: NbDialogService,
  ) {}

  ngOnInit(): void {
    const today = new Date();

    this.fromDate = formatDate(today, 'dd-MMM-yyyy', 'en-US');  // default From = today
  this.toDate = formatDate(today, 'dd-MMM-yyyy', 'en-US');
    this.loadStudents();
  }

  loadStudents(): void {
    this.studentService.getAll().subscribe({
      next: (res) => {
        this.students = res;
        this.filteredStudents = res;
      },
      error: (err) => console.error(err)
    });
  }

  // 🔍 Search
  search(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredStudents = q ? this.students.filter(s =>
      (s.fullName?.toLowerCase().includes(q)) ||
      (s.email?.toLowerCase().includes(q)) ||
      (s.phone?.toLowerCase().includes(q)) ||
      (s.courseName?.toLowerCase().includes(q))
    ) : this.students;
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filteredStudents = this.students;
  }

  // ✏️ Edit/Delete
  edit(student: Student): void {
    if (!student?.studentId) return;
    this.router.navigate(['pages/master/students/edit', student.studentId]);
  }

  delete(student: Student): void {
    if (!student?.studentId) return;
    if (confirm('Are you sure to delete?')) {
      this.studentService.delete(student.studentId).subscribe({
        next: () => this.loadStudents(),
        error: (err) => console.error(err)
      });
    }
  }

  // 📸 Lazy-load photo and enlarge
  enlargePhoto(student: Student) {
    if (!student.studentId) return;
  
    const openDialog = () => {
      this.dialogService.open(this.photoModal, {
        context: this.studentPhotos[student.studentId], // pass URL
      });
    };
  
    if (this.studentPhotos[student.studentId]) {
      openDialog();
      return;
    }
  
    this.studentService.getPhoto(student.studentId).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
        this.studentPhotos[student.studentId!] = safeUrl;
        openDialog();
      },
      error: (err) => console.error(`Photo load failed for ${student.fullName}`, err)
    });
  }
  

  // 📜 Ledger
  loadLedger(student: Student) {
    this.ledgerStudent = student;
    this.ledgerEntries = []; // clear old entries
    // Initialize dates
    this.fromDate = new Date().toISOString().split('T')[0];
    this.toDate = new Date().toISOString().split('T')[0];
  }

  onDateChange() {
    if (!this.ledgerStudent?.studentId) return;
  
    this.studentService.getLedger(
      this.ledgerStudent.studentId,
      this.fromDate ? new Date(this.fromDate) : undefined,
      this.toDate ? new Date(this.toDate) : undefined
    ).subscribe(res => {
      this.ledgerEntries = res.map(e => ({
        ...e,
        date: formatDate(e.date, 'dd-MMM-yyyy', 'en-US')
      }));
    });
  }
  
  async exportLedgerPdf() {
    if (!this.ledgerStudent) return;
  
    const doc = new jsPDF('p', 'pt', 'a4');
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 70;
    const currentDate = new Date().toLocaleDateString();
  
    // --- Load logo dynamically ---
    const logoData = await this.getImageAsBase64('assets/images/DaleViewLogo.jpg');
  
    // --- Header ---
    const drawHeader = () => {
      doc.addImage(logoData, 'JPEG', 40, 10, 60, 30);
  
      doc.setFontSize(14).setFont('helvetica', 'bold');
      doc.text('Dale View Hostel', pageWidth / 2, 30, { align: 'center' });
  
      doc.setFontSize(12).setFont('helvetica', 'normal');
      doc.text('Student Ledger Report', pageWidth / 2, 48, { align: 'center' });
  
      doc.setFontSize(9);
      doc.text(`Generated on: ${currentDate}`, pageWidth - 40, 30, { align: 'right' });
  
      yPos = 70;
    };
  
    // --- Footer ---
    const drawFooter = (pageNumber: number) => {
      doc.setFontSize(9).setTextColor(100);
      doc.text(`Page ${pageNumber}`, pageWidth - 50, pageHeight - 20);
    };
  
    let currentPage = 1;
    drawHeader();
    drawFooter(currentPage);
  
    // --- Student Info Section ---
    autoTable(doc, {
      startY: yPos,
      body: [
        [
          { content: `Student: ${this.ledgerStudent.fullName}`, styles: { halign: 'left' } },
          { content: `Room No: ${this.ledgerStudent.roomNo || 'Multiple / N/A'}`, styles: { halign: 'left' } },
          { content: `From: ${this.fromDate || 'N/A'}  To: ${this.toDate || 'N/A'}`, styles: { halign: 'left' } },
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3, lineWidth: 0.2 },
      margin: { left: margin, right: margin },
      bodyStyles: { fillColor: [250, 250, 250] },
    });
  
    yPos = (doc as any).lastAutoTable.finalY + 15;
  
    // --- Ledger Table ---
    autoTable(doc, {
      head: [['Date', 'Description', 'Particulars', 'Debit', 'Credit', 'Balance']],
      body: this.ledgerEntries.map(e => {
        const particulars = [
          e.particulars || '',
          e.roomNo ? `(Room: ${e.roomNo})` : '',
        ]
          .filter(Boolean)
          .join(' '); // combine with space if both exist
  
        return [
          e.date ? new Date(e.date).toLocaleDateString() : '',
          e.description || '',
          particulars,
          e.debit && e.debit !== 0 ? e.debit.toFixed(2) : '',
          e.credit && e.credit !== 0 ? e.credit.toFixed(2) : '',
          e.balance && e.balance !== 0 ? e.balance.toFixed(2) : '',
        ];
      }),
      startY: yPos,
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3 },
      didDrawPage: (data) => {
        if (doc.getNumberOfPages() > currentPage) {
          currentPage = doc.getNumberOfPages();
          drawHeader();
          drawFooter(currentPage);
        }
      },
    });
  
    // --- Save File ---
    doc.save(`Ledger_${this.ledgerStudent.fullName.replace(/\s+/g, '_')}.pdf`);
  }

  
  // --- Helper function for Base64 image ---
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
  triggerFileInput(student: Student) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (event: any) => this.onPhotoSelected(event, student);
    fileInput.click();
  }
  
  onPhotoSelected(event: any, student: Student) {
    const file: File = event.target.files[0];
    if (!file || !student.studentId) return;
  
    if (file.size > 2 * 1024 * 1024) {
      alert('File size should be less than 2MB');
      return;
    }
  
    this.studentService.uploadPhoto(student.studentId, file).subscribe({
      next: () => {
        alert('Photo uploaded successfully');
        // Reload the photo immediately after upload
        this.studentService.getPhoto(student.studentId!).subscribe({
          next: (blob) => {
            const objectUrl = URL.createObjectURL(blob);
            const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
            this.studentPhotos[student.studentId!] = safeUrl;
          },
          error: (err) => console.error('Photo reload failed', err)
        });
      },
      error: (err) => {
        console.error('Upload failed', err);
        alert('Photo upload failed.');
      }
    });
  }
  
  
}