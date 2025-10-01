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
  guardianAlternativeMobile:string;
  admissionDate?: string;
    bloodGroup:string ;
   idProof:string;
   relationship:string;
   roomId :string;
   photoUrl:string;
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

  uploadPhoto(id: number, formData: FormData): Observable<{ photoUrl: string }> {
    return this.http.post<{ photoUrl: string }>(`${this.api}/${id}/upload-photo`, formData);
  }
  
  deletePhoto(id: number): Observable<any> {
    return this.http.delete(`${this.api}/${id}/delete-photo`);
  }
  
  getPhoto(studentId: number): Observable<Blob> {
    return this.http.get(`${this.api}/${studentId}/photo`, { responseType: 'blob' });
  }


}
