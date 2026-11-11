import { Reservation } from './auth.service';

export function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function getReservationItems(reservation: Reservation): string {
  return reservation.resources?.map((item) => item.resource?.name ?? 'Sin nombre').join(', ') || 'Sin elementos';
}

export function isOccupied(reservation: Reservation): boolean {
  if ((reservation.status?.name ?? '').toLowerCase() !== 'aprobada') return false;
  const now = Date.now();
  return now >= new Date(reservation.startDate).getTime() && now <= new Date(reservation.endDate).getTime();
}

export function canCancel(reservation: Reservation): boolean {
  return ['pendiente', 'aprobada'].includes((reservation.status?.name ?? '').toLowerCase());
}