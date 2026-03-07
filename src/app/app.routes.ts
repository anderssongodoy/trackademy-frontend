import { Routes } from '@angular/router';

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
		path: 'app/onboarding',
		loadComponent: () => import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage)
	},
	{
		path: 'app/dashboard',
		loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage)
	},
	{
		path: '**',
		redirectTo: ''
	}
];
