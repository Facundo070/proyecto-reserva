import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService, CatalogsResponse, Reservation, Resource } from './core/auth.service';
import { canCancel, formatDate, getReservationItems, isOccupied } from './core/reservation.utils';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly router = inject(Router);
  protected readonly navItems = [
    { label: 'Inicio', url: '/dashboard' },
    { label: 'Recursos', url: '/resources' },
    { label: 'Reservas', url: '/reservations' },
  ];

  protected readonly isLoggedIn = this.auth.isLoggedIn;

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <section class="auth-shell">
      <div class="auth-card">
        <div class="portal-header">
  <span>Portal de Gestión Institucional</span>

  <span class="status-online">
    ● Sistema en línea
  </span>
</div>

<div class="auth-header">
  <div class="auth-brand-badge">
    <span class="brand-letter">I</span>
    <span>IES 6001</span>
  </div>

  <h1>Acceso al sistema</h1>

<p class="institution-name">
  Sistema de Gestión y Reserva de Recursos
</p>

<p>
  Ingresá tus credenciales para gestionar recursos y reservas institucionales.
</p>
</div>

<div class="role-selector">
  <button
    type="button"
    class="role-btn"
    [class.active]="selectedRole() === 'DOCENTE'"
    (click)="selectedRole.set('DOCENTE')"
  >
    Docente
  </button>

  <button
    type="button"
    class="role-btn"
    [class.active]="selectedRole() === 'ADMIN'"
    (click)="selectedRole.set('ADMIN')"
  >
    Administrador
  </button>
</div>


<div class="login-info">

  @if (selectedRole() === 'DOCENTE') {

    <strong>📚 Docente</strong>

    <ul>
      <li>Reservar recursos institucionales</li>
      <li>Consultar disponibilidad</li>
      <li>Gestionar solicitudes realizadas</li>
    </ul>

  } @else {

    <strong>🛠️ Administrador</strong>

    <ul>
      <li>Gestionar recursos</li>
      <li>Aprobar reservas</li>
      <li>Administrar usuarios</li>
    </ul>

  }

</div>


        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
          <label class="form-field-group">
            <span class="field-label">Correo electrónico</span>
            <div class="input-wrap icon-input">
  

  <input
    formControlName="email"
    type="email"
    placeholder="correo@ejemplo.com"
    class="form-input rounded-input"
  />
</div>
          </label>

          <label class="form-field-group">
            <span class="field-label">Contraseña</span>
            <div class="input-wrap">
             <div class="password-wrapper">
             
  <input
    formControlName="password"
    [type]="showPassword() ? 'text' : 'password'"
    placeholder="••••••••"
    class="form-input rounded-input"
  />

  <button
    type="button"
    class="toggle-password-btn"
    (click)="showPassword.set(!showPassword())"
  >
    {{ showPassword() ? 'Ocultar' : 'Mostrar' }}
  </button>
</div>
            </div>
          </label>

<div class="remember-row">
  <label class="remember-label">
    <input type="checkbox" />
    <span>Recordar sesión</span>
  </label>

  <a href="#" class="forgot-link">
    ¿Olvidó su contraseña?
  </a>
</div>


          @if (error()) {
            <div class="alert error">{{ error() }}</div>
          }

          <button type="submit" class="auth-submit-btn" [disabled]="loading()">
            @if (loading()) {
              Iniciando sesión...
            } @else {
              Iniciar sesión
            }
          </button>
        </form>
        <div class="support-box">
  <div>
    <strong>¿Problemas para ingresar?</strong>
    <small>Contacte con soporte técnico institucional.</small>
  </div>

  <a href="#" class="support-link">
    Soporte TI →
  </a>
</div>
      </div>
    </section>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = new FormGroup({
  email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly error = signal<string>('');
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly selectedRole = signal<'DOCENTE' | 'ADMIN'>('DOCENTE');

  submit(): void {
    if (this.form.invalid) {
      this.error.set('Completá email y contraseña válidos.');
      return;
    }

    const payload = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');

    this.auth.login(payload).subscribe({
      next: (response) => {
        this.auth.setSession(response);
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Credenciales inválidas');
      },
      complete: () => this.loading.set(false),
    });
  }
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page-panel">
      <div class="page-header">

  <div>
    <p class="eyebrow">Resumen Institucional</p>

    <h2>Panel principal</h2>

    <p class="dashboard-subtitle">
      Bienvenido, {{ auth.user()?.name }}
    </p>
  </div>

  <button class="dashboard-action-btn">
    + Nueva Reserva
  </button>

</div>

      @if (loading()) {
        <div class="loading-state">
          <p>Cargando información del sistema...</p>
        </div>
      } @else {
        <!-- Tarjetas de presentación con espacio llamativo para las métricas -->
        <div class="stats-grid presentation-cards">
          <!-- Tarjeta de presentación: Recursos -->
          <article class="presentation-stat-card card-recursos">
            <div class="pcard-top">
              <span class="pcard-chip">Inventario</span>
              <span class="pcard-icon">📦</span>
            </div>
            <div class="pcard-metric">
              <span class="pcard-title">Recursos</span>
              <strong class="pcard-number">{{ resources().length }}</strong>
            </div>
            <p class="pcard-desc">Equipos e instalaciones registrados</p>
            <div class="pcard-bottom">
              <span class="pcard-status">● Sistema operativo</span>
            </div>
          </article>

          <!-- Tarjeta de presentación: Reservas -->
          <article class="presentation-stat-card card-reservas">
            <div class="pcard-top">
              <span class="pcard-chip">Actividad</span>
              <span class="pcard-icon">📅</span>
            </div>
            <div class="pcard-metric">
              <span class="pcard-title">Reservas</span>
              <strong class="pcard-number">{{ reservations().length }}</strong>
            </div>
            <p class="pcard-desc">Reservas en plataforma y seguimiento</p>
            <div class="pcard-bottom">
              <span class="pcard-status">● Control de asignaciones</span>
            </div>
          </article>

          <!-- Tarjeta de presentación: Usuario -->
          <article class="presentation-stat-card card-usuario">
            
            <div class="pcard-top">
              <span class="pcard-chip">Sesión Activa</span>
              <span class="pcard-icon">👤</span>
            </div>
            <div class="pcard-metric">
              <span class="pcard-title">Usuario</span>
              <strong class="pcard-user-name">{{ auth.user()?.name ?? 'Sin sesión' }}</strong>
            </div>
            <p class="pcard-desc">Rol asignado: {{ auth.user()?.role ?? 'USUARIO' }}</p>
            <div class="pcard-bottom">
              <span class="pcard-status">● Conectado actualmente</span>
            </div>
          </article>
          <article class="presentation-stat-card card-docentes">

  <div class="pcard-top">
    <span class="pcard-chip">Docentes</span>
    <span class="pcard-icon">👨‍🏫</span>
  </div>

  <div class="pcard-metric">
    <span class="pcard-title">Docentes</span>
    <strong class="pcard-number">
      {{ teachersCount() }}
    </strong>
  </div>

  <p class="pcard-desc">
    Profesores registrados en el sistema
  </p>

  <div class="pcard-bottom">
    <span class="pcard-status">
      ● Usuarios activos
    </span>
  </div>

</article>
        </div>
        
        <div class="list-panel">
          <div class="list-panel-header">
            <div>
              <h3>Reservas recientes</h3>
              <p class="panel-subtitle">Estado en tiempo real de recursos y asignaciones</p>
            </div>
            <span class="count-badge">{{ reservations().length }} registradas</span>
          </div>

         @if (reservations().length === 0) {
  <div class="empty-state">

    <div class="empty-icon">
      📅
    </div>

    <h4>Sin reservas registradas</h4>

    <p>
      Todavía no existen reservas en el sistema.
    </p>

    <button
      class="empty-action-btn"
      (click)="router.navigateByUrl('/reservations')"
    >
      Crear primera reserva
    </button>

  </div>
}
 @else {
            <div class="reservation-cards-grid">
              @for (reservation of reservations(); track reservation.id) {
                <!-- Tarjeta con estilo de color rojo si el recurso está ocupado -->
                <article class="reservation-card presentation-style" [class.card-occupied]="isOccupied(reservation)">
                  @if (isOccupied(reservation)) {
                    <div class="occupied-banner">
                      <span class="pulse-indicator"></span>
                      <strong>RECURSO OCUPADO / EN USO</strong>
                    </div>
                  }

                  <div class="card-header">
                    <span class="reserva-number">Reserva #{{ reservation.id }}</span>
                    <span class="badge" [class.badge-danger]="isOccupied(reservation)">
                      {{ isOccupied(reservation) ? 'Ocupado (' + (reservation.status?.name ?? 'En uso') + ')' : (reservation.status?.name ?? 'Sin estado') }}
                    </span>
                  </div>

                  <div class="card-field">
                    <span class="card-label">Elemento asignado</span>
                    <p class="item-name">{{ getReservationItems(reservation) }}</p>
                  </div>

                  <div class="card-field">
                    <span class="card-label">Fecha y horario</span>
                    <p class="date-range">
                      <span>🗓️ {{ formatDate(reservation.startDate) }}</span>
                      <span class="arrow-sep">→</span>
                      <span>⌛ {{ formatDate(reservation.endDate) }}</span>
                    </p>
                  </div>

                  <div class="card-meta">
                    {{ reservation.resources.length }} recurso(s) asignado(s)
                  </div>
                </article>
              }
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class DashboardPage implements OnInit {
  protected readonly auth = inject(AuthService);
  readonly loading = signal(true);
  readonly resources = signal<Resource[]>([]);
  readonly reservations = signal<Reservation[]>([]);
  readonly users = signal<any[]>([]);
  readonly teachersCount = computed(() => this.users().length);



  protected readonly formatDate = formatDate;
  protected readonly getReservationItems = getReservationItems;
  protected readonly isOccupied = isOccupied;
  protected readonly router = inject(Router);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);

   forkJoin({
  resources: this.auth.getResources(),
  reservations: this.auth.getReservations(),
  users: this.auth.getUsers(),
}).subscribe({
  next: ({ resources, reservations, users }) => {
    
    this.resources.set(resources);
    this.reservations.set(reservations);
    this.users.set(users);
    this.loading.set(false);
  },

  error: (err) => {
    console.error('ERROR USERS', err);
    this.loading.set(false);
  },
});
  }
}
@Component({
  selector: 'app-resources-page',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <section class="page-panel">
      <div class="page-header">
        <div>
          <p class="eyebrow">Inventario</p>
          <h2>Recursos</h2>
        </div>
      </div>

      @if (auth.isAdmin()) {
        <form [formGroup]="form" (ngSubmit)="submitResource()" class="resource-form">
          <h3>Agregar recurso</h3>
          <div class="form-grid">
            <label>
              <span>Nombre</span>
              <input formControlName="name" type="text" />
            </label>
            <label>
              <span>Marca</span>
              <input formControlName="marca" type="text" />
            </label>
            <label>
              <span>Categoría</span>
              <select formControlName="categoryId">
                <option [ngValue]="null">Seleccionar</option>
                @for (category of catalog()?.categories ?? []; track category.id) {
                  <option [ngValue]="category.id">{{ category.name }}</option>
                }
              </select>
            </label>
            <label>
              <span>Estado</span>
              <select formControlName="statusId">
                <option [ngValue]="null">Seleccionar</option>
                @for (status of catalog()?.resourceStatuses ?? []; track status.id) {
                  <option [ngValue]="status.id">{{ status.name }}</option>
                }
              </select>
            </label>
          </div>
          <label>
            <span>Descripción</span>
            <textarea formControlName="description"></textarea>
          </label>
          <button type="submit" [disabled]="loading()">
            @if (loading()) { Guardando... } @else { Crear recurso }
          </button>
        </form>
      }

      @if (feedback()) {
        <div class="alert" [class.success]="feedbackType() === 'success'" [class.error]="feedbackType() === 'error'">
          {{ feedback() }}
        </div>
      }

      <div class="list-panel">
        <h3>Recursos</h3>
        @if (resources().length === 0) {
          <p>No hay recursos cargados.</p>
        } @else {
          <div class="row-list">
            @for (resource of resources(); track resource.id) {
              <article class="row-item resource-item">
                <div>
                  <strong>{{ resource.name }}</strong>
                  <p>{{ resource.category?.name ?? 'Sin categoría' }}</p>
                  <small>{{ resource.marca ?? 'Sin marca' }}</small>
                </div>
                <div class="resource-actions">
                  @if (auth.isAdmin()) {
                    <select
                      aria-label="Cambiar estado del recurso"
                      (change)="changeStatus(resource, $event)"
                    >
                      @for (status of catalog()?.resourceStatuses ?? []; track status.id) {
                        <option [value]="status.id" [selected]="status.id === resource.statusId">
                          {{ status.name }}
                        </option>
                      }
                    </select>
                    <button type="button" (click)="remove(resource)">Eliminar</button>
                  } @else {
                    <span class="badge">{{ resource.status?.name ?? 'Sin estado' }}</span>
                  }
                </div>
              </article>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class ResourcesPage implements OnInit {
  protected readonly auth = inject(AuthService);
  readonly resources = signal<Resource[]>([]);
  readonly catalog = signal<CatalogsResponse | null>(null);
  readonly loading = signal(false);
  readonly feedback = signal('');
  readonly feedbackType = signal<'success' | 'error'>('success');

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    marca: new FormControl('', { nonNullable: true }),
    categoryId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    statusId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    forkJoin({
      resources: this.auth.getResources(),
      catalog: this.auth.getCatalogs(),
    }).subscribe({
      next: ({ resources, catalog }) => {
        this.resources.set(resources);
        this.catalog.set(catalog);
        const disponible = catalog.resourceStatuses.find((s) => s.name === 'Disponible');
        if (disponible && this.form.controls.statusId.value === null) {
          this.form.patchValue({ statusId: disponible.id });
        }
      },
      error: () => this.showFeedback('error', 'No se pudieron cargar los recursos.'),
    });
  }

  submitResource(): void {
    if (!this.auth.isAdmin()) return;
    const { name, marca, categoryId, statusId, description } = this.form.getRawValue();
    if (this.form.invalid || categoryId === null || statusId === null) {
      this.form.markAllAsTouched();
      this.showFeedback('error', 'Completá nombre, categoría y estado.');
      return;
    }

    this.loading.set(true);
    this.auth.createResource({ name, categoryId, statusId, marca, description }).subscribe({
      next: () => {
        this.form.reset({ name: '', marca: '', categoryId: null, statusId, description: '' });
        this.showFeedback('success', 'Recurso creado.');
        this.load();
      },
      error: (err) => {
        this.loading.set(false);
        this.showFeedback('error', err?.error?.message ?? 'No se pudo crear el recurso.');
      },
      complete: () => this.loading.set(false),
    });
  }

  changeStatus(resource: Resource, event: Event): void {
    const statusId = Number((event.target as HTMLSelectElement).value);
    this.auth.updateResource(resource.id, { statusId }).subscribe({
      next: () => {
        this.showFeedback('success', `Estado de "${resource.name}" actualizado.`);
        this.load();
      },
      error: (err) => {
        this.showFeedback('error', err?.error?.message ?? 'No se pudo cambiar el estado.');
        this.load();
      },
    });
  }

  remove(resource: Resource): void {
    if (!confirm(`¿Eliminar "${resource.name}"?`)) return;
    this.auth.deleteResource(resource.id).subscribe({
      next: () => {
        this.showFeedback('success', 'Recurso eliminado.');
        this.load();
      },
      error: (err) =>
        this.showFeedback('error', err?.error?.message ?? 'No se pudo eliminar el recurso.'),
    });
  }

  private showFeedback(type: 'success' | 'error', message: string): void {
    this.feedbackType.set(type);
    this.feedback.set(message);
  }
}

@Component({
  selector: 'app-reservations-page',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <section class="page-panel">
      <div class="page-header">
        <div>
          <p class="eyebrow">Gestión</p>
          <h2>Reservas</h2>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="submitReservation()" class="resource-form" aria-label="Formulario de nueva reserva">
        <div class="form-title-wrap">
          <h3>Nueva reserva</h3>
          <p class="form-subtitle">Seleccioná fecha, horario y los recursos que necesitás apartar.</p>
        </div>

        <div class="form-grid datetime-grid">
          <label class="datetime-field">
            <span class="field-title">📅 Fecha y hora de inicio</span>
            <input
              formControlName="startDate"
              aria-label="Fecha de inicio de la reserva"
              type="datetime-local"
              class="datetime-input-defined"
            />
          </label>
          <label class="datetime-field">
            <span class="field-title">⌛ Fecha y hora de fin</span>
            <input
              formControlName="endDate"
              aria-label="Fecha de fin de la reserva"
              type="datetime-local"
              class="datetime-input-defined"
            />
          </label>
        </div>

        <div class="resources-selector-section">
          <span class="field-title">Recursos disponibles para reservar</span>
          <div class="checkbox-cards-group" aria-label="Seleccion de recursos disponibles">
            @for (resource of availableResources(); track resource.id) {
              <label class="resource-checkbox-card" [class.selected]="selectedResourceIds().includes(resource.id)">
                <input
                  type="checkbox"
                  aria-label="Seleccionar recurso {{ resource.name }}"
                  [checked]="selectedResourceIds().includes(resource.id)"
                  (change)="toggleResource(resource.id)"
                />
                <div class="checkbox-content">
                  <strong>{{ resource.name }}</strong>
                  <small>{{ resource.category?.name ?? 'General' }}</small>
                </div>
              </label>
            }
          </div>
        </div>

        @if (feedback()) {
          <div class="alert" [class.success]="feedbackType() === 'success'" [class.error]="feedbackType() === 'error'">
            {{ feedback() }}
          </div>
        }

        <button
          type="submit"
          class="submit-action-btn"
          aria-label="Reservar los recursos seleccionados"
          [disabled]="saving() || selectedResourceIds().length === 0 || availableResources().length === 0"
        >
          @if (saving()) { Creando reserva... } @else { Confirmar y reservar recursos }
        </button>
      </form>

      <div class="list-panel">
        <div class="list-panel-header">
          <div>
            <h3>{{ auth.isAdmin() ? 'Todas las reservas' : 'Mis reservas' }}</h3>
            <p class="panel-subtitle">Historial de solicitudes y estado de recursos</p>
          </div>
          <span class="count-badge">{{ reservations().length }} registradas</span>
        </div>

        @if (reservations().length === 0) {
          <p class="empty-text">No hay reservas creadas en este momento.</p>
        } @else {
          <div class="reservation-cards-grid">
            @for (reservation of reservations(); track reservation.id) {
              <article class="reservation-card presentation-style" [class.card-occupied]="isOccupied(reservation)">
                @if (isOccupied(reservation)) {
                  <div class="occupied-banner">
                    <span class="pulse-indicator"></span>
                    <strong>RECURSO OCUPADO / EN USO</strong>
                  </div>
                }

                <div class="card-header">
                  <span class="reserva-number">Reserva #{{ reservation.id }}</span>
                  <span class="badge" [class.badge-danger]="isOccupied(reservation)">
                    {{ isOccupied(reservation) ? 'Ocupado (' + (reservation.status?.name ?? 'En uso') + ')' : (reservation.status?.name ?? 'Pendiente') }}
                  </span>
                </div>

                <div class="card-field">
                  <span class="card-label">Recursos asignados</span>
                  <p class="item-name">{{ getReservationItems(reservation) }}</p>
                </div>

                <div class="card-field">
                  <span class="card-label">Período de reserva</span>
                  <p class="date-range">
                    <span>🗓️ {{ formatDate(reservation.startDate) }}</span>
                    <span class="arrow-sep">→</span>
                    <span>⌛ {{ formatDate(reservation.endDate) }}</span>
                  </p>
                </div>

                <div class="card-meta">
                  {{ reservation.resources.length }} recurso(s) asignado(s)
                </div>

                <div class="card-actions">
                  @if (canCancel(reservation)) {
                    <button type="button" (click)="cancel(reservation.id)">Cancelar</button>
                  }
                  @if (auth.isAdmin() && reservation.status.name === 'Pendiente') {
                    <button type="button" (click)="changeStatus(reservation.id, 'Aprobada')">Aprobar</button>
                  }
                  @if (auth.isAdmin() && reservation.status.name === 'Aprobada') {
                    <button type="button" (click)="changeStatus(reservation.id, 'Finalizada')">Finalizar</button>
                  }
                </div>
              </article>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class ReservationsPage implements OnInit {
  protected readonly auth = inject(AuthService);
  readonly resources = signal<Resource[]>([]);
  readonly reservations = signal<Reservation[]>([]);
  readonly saving = signal(false);
  readonly selectedResourceIds = signal<number[]>([]);
  readonly feedback = signal('');
  readonly feedbackType = signal<'success' | 'error'>('success');

  readonly availableResources = computed(() =>
    this.resources().filter((r) => r.status?.name === 'Disponible'),
  );

  protected readonly formatDate = formatDate;
  protected readonly getReservationItems = getReservationItems;
  protected readonly isOccupied = isOccupied;
  protected readonly canCancel = canCancel;

  readonly form = new FormGroup({
    startDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    forkJoin({
      resources: this.auth.getResources(),
      reservations: this.auth.getReservations(),
    }).subscribe({
      next: ({ resources, reservations }) => {
        this.resources.set(resources);
        this.reservations.set(reservations);
      },
    });
  }

  toggleResource(id: number): void {
    const next = new Set(this.selectedResourceIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedResourceIds.set([...next]);
  }

  submitReservation(): void {
    if (this.form.invalid || this.selectedResourceIds().length === 0) {
      this.showFeedback('error', 'Seleccioná al menos un recurso y completá las fechas de la reserva.');
      return;
    }

    const { startDate, endDate } = this.form.getRawValue();
    this.saving.set(true);
    this.feedback.set('');

    this.auth
      .createReservation({
        resourceIds: this.selectedResourceIds(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      })
      .subscribe({
        next: () => {
          this.form.reset();
          this.selectedResourceIds.set([]);
          this.showFeedback('success', 'Reserva creada correctamente.');
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.showFeedback(
            'error',
            err?.error?.message ?? 'No se pudo crear la reserva. Revisá disponibilidad y fechas.',
          );
        },
        complete: () => this.saving.set(false),
      });
  }

  cancel(id: number): void {
    if (!confirm('¿Cancelar esta reserva?')) return;
    this.auth.cancelReservation(id).subscribe({
      next: () => {
        this.showFeedback('success', 'Reserva cancelada.');
        this.load();
      },
      error: (err) => this.showFeedback('error', err?.error?.message ?? 'No se pudo cancelar la reserva.'),
    });
  }

  changeStatus(id: number, status: 'Aprobada' | 'Finalizada'): void {
    this.auth.updateReservationStatus(id, status).subscribe({
      next: () => {
        this.showFeedback('success', `Reserva ${status.toLowerCase()}.`);
        this.load();
      },
      error: (err) => this.showFeedback('error', err?.error?.message ?? 'No se pudo cambiar el estado.'),
    });
  }

  private showFeedback(type: 'success' | 'error', message: string): void {
    this.feedbackType.set(type);
    this.feedback.set(message);
  }
}