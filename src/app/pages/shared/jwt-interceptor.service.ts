import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { NbTokenService, NbAuthJWTToken } from '@nebular/auth';
import { switchMap, take, catchError } from 'rxjs/operators';
import { NbToastrService } from '@nebular/theme';

@Injectable()
export class MyJwtInterceptor implements HttpInterceptor {

  constructor(
    private tokenService: NbTokenService,
    private toastrService: NbToastrService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.url.endsWith('/auth/login') || req.url.endsWith('/refresh-token')) {
      return next.handle(req).pipe(
        catchError((error: HttpErrorResponse) => this.handleError(error))
      );
    }

    return this.tokenService.get().pipe(
      take(1),
      switchMap((token: NbAuthJWTToken) => {
        let clonedReq = req;
        if (token && token.getValue()) {
          clonedReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token.getValue()}`
            }
          });
        }
        return next.handle(clonedReq).pipe(
          catchError((error: HttpErrorResponse) => this.handleError(error))
        );
      })
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Something went wrong!';
    if (error.error && typeof error.error === 'string') {
      message = error.error; // backend returns plain text
    } else if (error.error && error.error.message) {
      message = error.error.message; // backend JSON { message: ... }
    } else if (error.message) {
      message = error.message;
    }

    // Show a nice nebular toast
    this.toastrService.danger(message, 'Error', {
      duration: 4000,
      icon: 'alert-circle-outline',
      status: 'danger', // danger, success, warning, info
      destroyByClick: true,
      preventDuplicates: true
    });

    return throwError(() => error);
  }
}
