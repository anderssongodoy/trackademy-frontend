import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly tokenKey = 'trackademy.appToken';

  isSignedIn(): boolean {
    return localStorage.getItem(this.tokenKey) !== null;
  }
}
