import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

import { APP_ENV } from '../config/app-environment.token';
import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';

/**
 * Pruebas unitarias del AuthSessionService.
 *
 * Cubre:
 *   - HU-01 (Login Google / Microsoft): el frontend consulta /api/v1/auth/session
 *     usando el JWT propio para saber si la sesion sigue activa.
 *   - Seguridad: sin token local NO se llama al backend (evita 401 innecesarios).
 *   - Resiliencia: ante error de red devuelve `false` y no propaga la excepcion.
 *
 * Test plan: SP-004 (sesion en el frontend) + SP-005 (validacion de tokens).
 */
describe('AuthSessionService (HU-01)', () => {
  const ENV_STUB = {
    production: false,
    apiBaseUrl: 'https://api.test.local',
    authSessionPath: '/api/v1/auth/session',
    authMicrosoftExchangePath: '/api/v1/auth/microsoft',
    authGoogleExchangePath: '/api/v1/auth/google',
    authGoogleOAuthUrlPath: '/api/v1/auth/google/oauth-url',
    defaultUniversityId: 1,
    azureTenantId: 'consumers',
    azureFrontendClientId: 'test-client-id',
    googleClientId: 'test-google-client-id'
  };

  let httpSpy: jasmine.SpyObj<HttpClient>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let service: AuthSessionService;

  beforeEach(() => {
    httpSpy = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['getAccessToken']);

    TestBed.configureTestingModule({
      providers: [
        AuthSessionService,
        { provide: HttpClient, useValue: httpSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: APP_ENV, useValue: ENV_STUB }
      ]
    });

    service = TestBed.inject(AuthSessionService);
  });

  it('devuelve false cuando no hay token guardado y NO llama al backend', async () => {
    authSpy.getAccessToken.and.resolveTo(null);

    const result = await firstValueFrom(service.isAuthenticated());

    expect(result).toBe(false);
    expect(httpSpy.get).not.toHaveBeenCalled();
  });

  it('devuelve true cuando el backend responde authenticated: true', async () => {
    authSpy.getAccessToken.and.resolveTo('token-jwt-propio');
    httpSpy.get.and.returnValue(of({ authenticated: true }));

    const result = await firstValueFrom(service.isAuthenticated());

    expect(result).toBe(true);
    expect(httpSpy.get).toHaveBeenCalledWith(
      `${ENV_STUB.apiBaseUrl}${ENV_STUB.authSessionPath}`
    );
  });

  it('devuelve false cuando el backend responde authenticated: false', async () => {
    authSpy.getAccessToken.and.resolveTo('token-jwt-propio');
    httpSpy.get.and.returnValue(of({ authenticated: false }));

    const result = await firstValueFrom(service.isAuthenticated());

    expect(result).toBe(false);
  });

  it('Seguridad: si /session devuelve 401 devolvemos false sin propagar el error', async () => {
    authSpy.getAccessToken.and.resolveTo('token-vencido');
    httpSpy.get.and.returnValue(throwError(() => new Error('401 Unauthorized')));

    const result = await firstValueFrom(service.isAuthenticated());

    expect(result).toBe(false);
  });
});
