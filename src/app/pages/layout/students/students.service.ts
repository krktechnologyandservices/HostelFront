import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
export interface Student {
  studentId?: number;
  fullName: string;
  email: string;
  phone: string;
  dob?: string;
  gender?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  admissionDate?: string;
    bloodGroup:string ;
   idProof:string;

   roomId :string;
}

@Injectable({ providedIn: 'root' })
export class StudentService {
  private api =`${environment.apiBaseUrl}/students`;

  constructor(private http: HttpClient) {}
  getStudentById(id: number): Observable<Student> {
    return this.http.get<Student>(`${this.api}/${id}`);
  }
  
  getAll(): Observable<Student[]> { return this.http.get<Student[]>(this.api); }
  get(id: number): Observable<Student> { return this.http.get<Student>(`${this.api}/${id}`); }
  add(student: Student): Observable<any> { return this.http.post(this.api, student); }
  update(id: number, student: Student): Observable<any> { return this.http.put(`${this.api}/${id}`, student); }
  delete(id: number): Observable<any> { return this.http.delete(`${this.api}/${id}`); }
}
