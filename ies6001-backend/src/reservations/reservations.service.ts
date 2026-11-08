import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';

const ACTIVE_STATUSES = ['Pendiente', 'Aprobada'];

// Transiciones permitidas: estado actual -> estados a los que puede pasar
const TRANSITIONS: Record<string, string[]> = {
  Pendiente: ['Aprobada', 'Cancelada'],
  Aprobada: ['Finalizada', 'Cancelada'],
  Finalizada: [],
  Cancelada: [],
};

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateReservationDto) {
    const { startDate, endDate } = dto;
    const resourceIds = [...new Set(dto.resourceIds)];

    if (endDate <= startDate) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la de inicio');
    }
    if (startDate < new Date()) {
      throw new BadRequestException('La fecha de inicio no puede estar en el pasado');
    }

    return this.prisma.$transaction(
      async (tx) => {
        // 1. Perfil del usuario
        const profile = await tx.profile.findFirst({ where: { userId } });
        if (!profile) {
          throw new BadRequestException('El usuario no tiene un perfil asociado');
        }

        // 2. Los recursos existen y están disponibles
        const resources = await tx.resource.findMany({
          where: { id: { in: resourceIds } },
          include: { status: true },
        });
        if (resources.length !== resourceIds.length) {
          throw new NotFoundException('Alguno de los recursos no existe');
        }
        const unavailable = resources.filter((r) => r.status.name !== 'Disponible');
        if (unavailable.length > 0) {
          throw new BadRequestException(
            `Recursos no disponibles: ${unavailable.map((r) => r.name).join(', ')}`,
          );
        }

        // 3. Solapamiento: startA < endB AND endA > startB
        const conflict = await tx.reservationResource.findFirst({
          where: {
            resourceId: { in: resourceIds },
            reservation: {
              startDate: { lt: endDate },
              endDate: { gt: startDate },
              status: { name: { in: ACTIVE_STATUSES } },
            },
          },
          include: { resource: true },
        });
        if (conflict) {
          throw new ConflictException(
            `"${conflict.resource.name}" ya está reservado en ese horario`,
          );
        }

        // 4. Crear la reserva en estado Pendiente
        const pending = await tx.statusReservation.findUniqueOrThrow({
          where: { name: 'Pendiente' },
        });

        return tx.reservation.create({
          data: {
            createdByUserId: userId,
            profileId: profile.id,
            startDate,
            endDate,
            statusReservationId: pending.id,
            resources: {
              create: resourceIds.map((resourceId) => ({ resourceId })),
            },
          },
          include: {
            status: true,
            resources: { include: { resource: true } },
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  findAll(userId: number, role: string) {
    return this.prisma.reservation.findMany({
      where: role === 'ADMIN' ? {} : { createdByUserId: userId },
      include: {
        status: true,
        resources: { include: { resource: true } },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: number, userId: number, role: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        status: true,
        resources: { include: { resource: true } },
      },
    });
    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    if (role !== 'ADMIN' && reservation.createdByUserId !== userId) {
      throw new ForbiddenException('No tenés permiso para ver esta reserva');
    }
    return reservation;
  }

  async updateStatus(id: number, newStatusName: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { status: true },
    });
    if (!reservation) throw new NotFoundException('Reserva no encontrada');

    const allowed = TRANSITIONS[reservation.status.name] ?? [];
    if (!allowed.includes(newStatusName)) {
      throw new BadRequestException(
        `No se puede pasar de "${reservation.status.name}" a "${newStatusName}"`,
      );
    }

    const newStatus = await this.prisma.statusReservation.findUniqueOrThrow({
      where: { name: newStatusName },
    });

    return this.prisma.reservation.update({
      where: { id },
      data: { statusReservationId: newStatus.id },
      include: { status: true },
    });
  }

  async cancel(id: number, userId: number, role: string) {
    await this.findOne(id, userId, role); // valida que exista y que sea suyo (o admin)
    return this.updateStatus(id, 'Cancelada');
  }
}