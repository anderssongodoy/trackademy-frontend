import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthSessionService } from '../infrastructure/auth/auth-session.service';

@Injectable({ providedIn: 'root' })
export class AuthSessionUseCase {
  private readonly session = inject(AuthSessionService);

  isAuthenticated(): Observable<boolean> {
    return this.session.isAuthenticated();
  }
}
