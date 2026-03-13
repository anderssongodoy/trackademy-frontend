import { Routes } from '@angular/router';

import { onboardingGuard } from './domains/academics/infrastructure/guards/onboarding.guard';
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
    path: 'onboarding',
    canActivate: [authGuard, onboardingGuard],
    loadComponent: () => import('./domains/academics/presentation/onboarding/onboarding.page').then((m) => m.OnboardingPage)
  },
  {
    path: 'app',
    canActivate: [authGuard],
    component: AppShellComponent,
    children: [
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
        path: 'cursos/:id/horario',
        loadComponent: () => import('./domains/academics/presentation/course-schedule/course-schedule.page').then((m) => m.CourseSchedulePage)
      },
      {
        path: 'horario',
        loadComponent: () => import('./domains/academics/presentation/schedule/schedule.page').then((m) => m.SchedulePage)
      },
      {
        path: 'calendario',
        loadComponent: () => import('./domains/academics/presentation/calendar/calendar.page').then((m) => m.CalendarPage)
      },
      {
        path: 'notas',
        loadComponent: () => import('./domains/academics/presentation/notes/notes.page').then((m) => m.NotesPage)
      },
      {
        path: 'tareas',
        loadComponent: () => import('./domains/academics/presentation/tasks/tasks.page').then((m) => m.TasksPage)
      },
      {
        path: 'recordatorios',
        loadComponent: () => import('./domains/academics/presentation/reminders/reminders.page').then((m) => m.RemindersPage)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./domains/academics/presentation/profile/profile.page').then((m) => m.ProfilePage)
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
