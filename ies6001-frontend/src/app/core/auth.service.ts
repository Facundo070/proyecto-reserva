import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { API_URL } from './api.config';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  profileId?: number;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CatalogItem {
  id: number;
  name: string;
}

export interface CatalogsResponse {
  categories: CatalogItem[];
  resourceStatuses: CatalogItem[];
  reservationStatuses: CatalogItem[];
}

export interface Resource {
  id: number;
  name: string;
  marca?: string | null;
  description?: string | null;
  categoryId: number;
  statusId: number;
  category?: CatalogItem;
  status?: CatalogItem;
}

export interface ReservationResource {
  id: number;
  resource: Resource;
}

export interface Reservation {
  id: number;
  startDate: string;
  endDate: string;
  status: CatalogItem;
  resources: ReservationResource[];
}

export interface ReservationCreateInput {
  resourceIds: number[];
  startDate: string;
  endDate: string;
}

export interface ResourceCreateInput {
  name: string;
  categoryId: number;
  statusId: number;
  marca?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = typeof localStorage !== 'undefined' ? localStorage : null;

  private readonly _user = signal<AuthUser | null>(this.readUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

  readonly baseUrl = API_URL;

  get token(): string | null {
    return this.storage?.getItem('token') ?? null;
  }

  login(payload: LoginRequest) {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, payload)
      .pipe(tap((res) => this.setSession(res)));
  }

  setSession(response: AuthResponse) {
    this.storage?.setItem('token', response.access_token);
    this.storage?.setItem('user', JSON.stringify(response.user));
    this._user.set(response.user);
  }

  logout() {
    this.storage?.removeItem('token');
    this.storage?.removeItem('user');
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  getResources() {
    return this.http.get<Resource[]>(`${this.baseUrl}/resources`);
  }

  getCatalogs() {
    return this.http.get<CatalogsResponse>(`${this.baseUrl}/catalogs`);
  }

  getReservations() {
    return this.http.get<Reservation[]>(`${this.baseUrl}/reservations`);
  }

  createReservation(payload: ReservationCreateInput) {
    return this.http.post<Reservation>(`${this.baseUrl}/reservations`, payload);
  }
updateResource(id: number, payload: Partial<ResourceCreateInput>) {
  return this.http.patch<Resource>(`${this.baseUrl}/resources/${id}`, payload);
}

deleteResource(id: number) {
  return this.http.delete<Resource>(`${this.baseUrl}/resources/${id}`);
}
  createResource(payload: ResourceCreateInput) {
    return this.http.post<Resource>(`${this.baseUrl}/resources`, payload);
  }

  updateReservationStatus(id: number, status: 'Aprobada' | 'Finalizada') {
    return this.http.patch<Reservation>(`${this.baseUrl}/reservations/${id}/status`, { status });
  }

  cancelReservation(id: number) {
    return this.http.patch<Reservation>(`${this.baseUrl}/reservations/${id}/cancel`, {});
  }
getUsers() {
  return this.http.get<any[]>(`${this.baseUrl}/users`);
}
  private readUser(): AuthUser | null {
    try {
      const raw = this.storage?.getItem('user');
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}