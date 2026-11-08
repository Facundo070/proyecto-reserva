import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateResourceDto } from './dto/update-resource.dto.js';
import { CreateResourceDto } from './dto/resource.dto.js';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateResourceDto) {
    return this.prisma.resource.create({
      data: dto,
      include: { status: true, category: true },
    });
  }

  findAll(categoryId?: number, statusId?: number) {
    return this.prisma.resource.findMany({
      where: { categoryId, statusId },
      include: { status: true, category: true },
    });
  }

  async findOne(id: number) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
      include: { status: true, category: true },
    });
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    return resource;
  }

  async update(id: number, dto: UpdateResourceDto) {
    await this.findOne(id);
    return this.prisma.resource.update({
      where: { id },
      data: dto,
      include: { status: true, category: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    const used = await this.prisma.reservationResource.count({
      where: { resourceId: id },
    });
    if (used > 0) {
      throw new BadRequestException(
        'El recurso tiene reservas asociadas. Cambiá su estado a "Fuera de servicio" en su lugar.',
      );
    }
    return this.prisma.resource.delete({ where: { id } });
  }

  // Reservas activas del recurso dentro de un rango (para mostrar disponibilidad)
  async availability(id: number, from: Date, to: Date) {
    await this.findOne(id);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Los parámetros "from" y "to" deben ser fechas válidas');
    }
    return this.prisma.reservationResource.findMany({
      where: {
        resourceId: id,
        reservation: {
          startDate: { lt: to },
          endDate: { gt: from },
          status: { name: { in: ['Pendiente', 'Aprobada'] } },
        },
      },
      select: {
        reservation: { select: { id: true, startDate: true, endDate: true } },
      },
    });
  }
}