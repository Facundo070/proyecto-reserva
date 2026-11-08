import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CatalogsService {
  constructor(private prisma: PrismaService) {}

  categories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  resourceStatuses() {
    return this.prisma.statusResource.findMany();
  }

  reservationStatuses() {
    return this.prisma.statusReservation.findMany();
  }
}