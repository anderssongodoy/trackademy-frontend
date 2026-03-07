import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./features/landing/landing.page').then((m) => m.LandingPage)
	},
	{
		path: 'auth/sign-in',
		loadComponent: () =>
			import('./features/auth/sign-in/sign-in.page').then((m) => m.SignInPage)
	},
	{
		path: 'auth/callback',
		loadComponent: () =>
			import('./features/auth/sign-in/sign-in.page').then((m) => m.SignInPage)
	},
	{
		path: 'app/onboarding',
		canActivate: [authGuard],
		loadComponent: () => import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage)
	},
	{
		path: 'app/dashboard',
		canActivate: [authGuard],
		loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage)
	},
	{
		path: '**',
		redirectTo: ''
	}
];
