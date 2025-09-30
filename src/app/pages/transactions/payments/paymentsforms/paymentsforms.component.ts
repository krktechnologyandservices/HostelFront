import { Component, Input, OnInit } from '@angular/core';
import { NbDialogRef, NbToastrService } from '@nebular/theme';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { PaymentService, PendingBill, PaymentCreateDto, BillAdjustmentDto, AdditionalChargeDto, ExpenseHead } from '../payments.service';
import { StudentService } from '../../../layout/students/students.service';

@Component({
  selector: 'app-payment-form',
  templateUrl: './paymentsforms.component.html',
  styleUrls: ['./paymentsforms.component.scss']
})
export class PaymentFormComponent implements OnInit {
  @Input() payment?: any; // for edit
  form!: FormGroup;
  students: any[] = [];
  pendingBills: PendingBill[] = [];
  expenseHeads: ExpenseHead[] = [];

  constructor(
    protected ref: NbDialogRef<PaymentFormComponent>,
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private studentService: StudentService,
    private toastr: NbToastrService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      studentId: [this.payment?.studentId || null, Validators.required],
      bookingId: [this.payment?.bookingId || null],
      paymentDate: [this.payment?.paymentDate ? this.payment.paymentDate : new Date().toISOString().substring(0,10), Validators.required],
      paymentMode: [this.payment?.paymentMode || 'Cash', Validators.required],
      totalAmount: [this.payment?.amount || 0, [Validators.required, Validators.min(0.01)]],
      paymentType: [this.payment?.paymentType || 'BILL', Validators.required],
      referenceNumber: [this.payment?.referenceNumber || ''],
      remarks: [this.payment?.remarks || ''],
      billAdjustments: this.fb.array([]),
      additionalCharges: this.fb.array([])
    });

    // load students & expense heads
    this.studentService.getAll().subscribe(s => this.students = s);
    this.paymentService.getExpenseHeads().subscribe(h => this.expenseHeads = h);

    // If editing, prefill adjustments and charges
    if (this.payment) {
      // Additional charges
      if (this.payment.additionalCharges?.length) {
        this.payment.additionalCharges.forEach(ch => {
          this.additionalCharges.push(this.fb.group({
            expenseHeadId: [ch.expenseHeadId, Validators.required],
            amount: [ch.amount, [Validators.required, Validators.min(0.01)]],
            remarks: [ch.remarks || '']
          }));
        });
      }
    }

    // on student change or type change, load pending bills
    this.form.get('studentId')?.valueChanges.subscribe(sid => {
      if (this.form.get('paymentType')?.value === 'BILL' && sid) {
        this.loadPendingBills(sid);
      }
    });

    this.form.get('paymentType')?.valueChanges.subscribe(t => {
      const sid = this.form.get('studentId')?.value;
      if (t === 'BILL' && sid) {
        this.loadPendingBills(sid);
      } else {
        this.clearBillAdjustments();
      }
    });

    this.form.get('totalAmount')?.valueChanges.subscribe(_ => this.autoAllocate());
  }

  get billAdjArray() { return this.form.get('billAdjustments') as FormArray; }
  get additionalCharges() { return this.form.get('additionalCharges') as FormArray; }

  loadPendingBills(studentId: number) {
    this.paymentService.getPendingBills(studentId).subscribe(bills => {
      this.pendingBills = bills;

      // Map existing adjustments for edit
      const existingAdjMap = new Map<number, any>();
      if (this.payment?.billAdjustments?.length) {
        this.payment.billAdjustments.forEach((adj: any) => existingAdjMap.set(adj.billId, adj));
      }

      // Merge pending bills with existing adjustments
      const mergedBills: PendingBill[] = [...bills];
      existingAdjMap.forEach((adj, billId) => {
        if (!bills.some(b => b.billId === billId)) {
          mergedBills.push({
            billId: adj.billId,
            period: adj.period || '',
            billAmount: adj.billAmount || 0,
            balance: adj.adjustedAmount || 0,
            paidAmount: 0 // required for PendingBill type
          });
        }
      });

      this.clearBillAdjustments();
      mergedBills.forEach(b => {
        const adjAmount = existingAdjMap.get(b.billId)?.adjustedAmount || 0;
        this.billAdjArray.push(this.fb.group({
          billId: [b.billId],
          period: [b.period],
          billAmount: [b.billAmount],
          balance: [b.balance],
          adjustedAmount: [adjAmount]
        }));
      });

      this.autoAllocate();
    });
  }

  clearBillAdjustments() {
    while (this.billAdjArray.length) this.billAdjArray.removeAt(0);
  }

  autoAllocate() {
    if (this.form.get('paymentType')?.value !== 'BILL') return;
    const total = Number(this.form.get('totalAmount')?.value) || 0;
    const totalCharges = this.additionalCharges.controls.reduce((s, c) => s + Number(c.get('amount')?.value || 0), 0);
    let remaining = total - totalCharges;
    if (remaining < 0) remaining = 0;

    for (let i = 0; i < this.billAdjArray.length; i++) {
      const ctrl = this.billAdjArray.at(i);
      const balance = Number(ctrl.get('balance')?.value) || 0;
      const adj = Math.min(balance, remaining);
      ctrl.get('adjustedAmount')?.setValue(adj, { emitEvent: false });
      remaining -= adj;
    }
  }

  onManualAdjustChanged() {
    const total = Number(this.form.get('totalAmount')?.value) || 0;
    const charges = this.additionalCharges.controls.reduce((s, c) => s + Number(c.get('amount')?.value || 0), 0);
    const totalAdjusted = this.billAdjArray.controls.reduce((s, c) => s + Number(c.get('adjustedAmount')?.value || 0), 0) + charges;
    if (totalAdjusted > total) {
      this.toastr.warning('Sum of adjustments + charges cannot exceed total paying amount');
      this.autoAllocate();
    }
  }

  addCharge() {
    this.additionalCharges.push(this.fb.group({
      expenseHeadId: [null, Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      remarks: ['']
    }));
  }

  removeCharge(i: number) {
    this.additionalCharges.removeAt(i);
    this.autoAllocate();
  }

  save() {
    if (this.form.invalid) { this.toastr.warning('Please complete required fields'); return; }

    const dto: PaymentCreateDto = {
      studentId: Number(this.form.value.studentId),
      bookingId: this.form.value.bookingId || null,
      paymentDate: this.form.value.paymentDate,
      paymentMode: this.form.value.paymentMode,
      totalAmount: Number(this.form.value.totalAmount),
      referenceNumber: this.form.value.referenceNumber,
      remarks: this.form.value.remarks,
      paymentType: this.form.value.paymentType,
      billAdjustments: [],
      additionalCharges: []
    };

    if (dto.paymentType === 'BILL') {
      for (let c of this.billAdjArray.controls) {
        const adj = Number(c.get('adjustedAmount')?.value || 0);
        if (adj > 0) {
          dto.billAdjustments?.push({ billId: Number(c.get('billId')?.value), adjustedAmount: adj, remarks: '' });
        }
      }
    }

    for (let c of this.additionalCharges.controls) {
      const ehId = Number(c.get('expenseHeadId')?.value);
      const amt = Number(c.get('amount')?.value);
      if (ehId && amt > 0) dto.additionalCharges?.push({ expenseHeadId: ehId, amount: amt, remarks: c.get('remarks')?.value });
    }

    const sumAdj = (dto.billAdjustments || []).reduce((s,a)=>s+a.adjustedAmount,0) + (dto.additionalCharges || []).reduce((s,ch)=>s+ch.amount,0);
    if (sumAdj > dto.totalAmount) { this.toastr.danger('Adjusted amounts + charges exceed total payment'); return; }

    this.paymentService.create(dto).subscribe({
      next: () => { this.toastr.success('Payment saved'); this.ref.close(true); },
      error: (err) => { this.toastr.danger('Save failed'); console.error(err); }
    });
  }

  cancel() { this.ref.close(false); }
}
