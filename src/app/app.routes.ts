import { Routes } from '@angular/router';
import { authGuard } from './domains/identity/infrastructure/auth/auth.guard';
import { AppShellComponent } from './shared/ui/app-shell/app-shell.component';

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
    path: 'app',
    canActivate: [authGuard],
    component: AppShellComponent,
    children: [
      {
        path: 'onboarding',
        loadComponent: () => import('./domains/academics/presentation/onboarding/onboarding.page').then((m) => m.OnboardingPage)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./domains/academics/presentation/dashboard/dashboard.page').then((m) => m.DashboardPage)
      },
      {
        path: 'cursos',
        loadComponent: () => import('./domains/academics/presentation/courses/courses.page').then((m) => m.CoursesPage)
      },
      {
        path: 'cursos/:id',
        loadComponent: () => import('./domains/academics/presentation/course-detail/course-detail.page').then((m) => m.CourseDetailPage)
      },
      {
        path: 'horario',
        loadComponent: () => import('./domains/academics/presentation/schedule/schedule.page').then((m) => m.SchedulePage)
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
