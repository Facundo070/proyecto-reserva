import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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
  categoriaId?: number;
  categoryId?: number;
  statusId: number;
  marca?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = typeof localStorage !== 'undefined' ? localStorage : null;

  private readonly _user = signal<AuthUser | null>(this.readUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

  readonly baseUrl = 'http://localhost:3000';

  get token(): string | null {
    return this.storage?.getItem('token') ?? null;
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  login(payload: LoginRequest) {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, payload);
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
  }

  getResources() {
    return this.http.get<Resource[]>(`${this.baseUrl}/resources`, {
      headers: this.getAuthHeaders(),
    });
  }

  getCatalogs() {
    return this.http.get<CatalogsResponse>(`${this.baseUrl}/catalogs`, {
      headers: this.getAuthHeaders(),
    });
  }

  getReservations() {
    return this.http.get<Reservation[]>(`${this.baseUrl}/reservations`, {
      headers: this.getAuthHeaders(),
    });
  }

  createReservation(payload: ReservationCreateInput) {
    return this.http.post<Reservation>(`${this.baseUrl}/reservations`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  createResource(payload: ResourceCreateInput) {
    return this.http.post<Resource>(`${this.baseUrl}/resources`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  updateReservationStatus(id: number, status: string) {
    return this.http.patch<Reservation>(
      `${this.baseUrl}/reservations/${id}/status`,
      { status },
      { headers: this.getAuthHeaders() },
    );
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