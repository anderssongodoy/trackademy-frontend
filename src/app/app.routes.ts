import { Routes } from '@angular/router';
import { authGuard } from './domains/identity/infrastructure/auth/auth.guard';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./domains/marketing/presentation/landing/landing.page').then((m) => m.LandingPage)
	},
	{
		path: 'auth/sign-in',
		loadComponent: () =>
			import('./domains/identity/presentation/sign-in/sign-in.page').then((m) => m.SignInPage)
	},
	{
		path: 'auth/callback',
		loadComponent: () =>
			import('./domains/identity/presentation/sign-in/sign-in.page').then((m) => m.SignInPage)
	},
	{
		path: 'app/onboarding',
		canActivate: [authGuard],
		loadComponent: () => import('./domains/academics/presentation/onboarding/onboarding.page').then((m) => m.OnboardingPage)
	},
	{
		path: 'app/dashboard',
		canActivate: [authGuard],
		loadComponent: () => import('./domains/academics/presentation/dashboard/dashboard.page').then((m) => m.DashboardPage)
	},
	{
		path: '**',
		redirectTo: ''
	}
];

