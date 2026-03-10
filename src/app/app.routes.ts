import { Routes } from '@angular/router';
import { authGuard } from './domains/identity/infrastructure/auth/auth.guard';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./shell/features/landing/landing.page').then((m) => m.LandingPage)
	},
	{
		path: 'auth/sign-in',
		loadComponent: () =>
			import('./shell/features/auth/sign-in/sign-in.page').then((m) => m.SignInPage)
	},
	{
		path: 'auth/callback',
		loadComponent: () =>
			import('./shell/features/auth/sign-in/sign-in.page').then((m) => m.SignInPage)
	},
	{
		path: 'app/onboarding',
		canActivate: [authGuard],
		loadComponent: () => import('./shell/features/onboarding/onboarding.page').then((m) => m.OnboardingPage)
	},
	{
		path: 'app/dashboard',
		canActivate: [authGuard],
		loadComponent: () => import('./shell/features/dashboard/dashboard.page').then((m) => m.DashboardPage)
	},
	{
		path: '**',
		redirectTo: ''
	}
];
