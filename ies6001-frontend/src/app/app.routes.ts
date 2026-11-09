import { Routes } from '@angular/router';
import { DashboardPage, LoginPage, ReservationsPage, ResourcesPage } from './app';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  { path: 'dashboard', component: DashboardPage, canActivate: [authGuard] },
  { path: 'resources', component: ResourcesPage, canActivate: [authGuard] },
  { path: 'reservations', component: ReservationsPage, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];