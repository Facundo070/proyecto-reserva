import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 1. Verificación por DNI
  async findPersonByDni(dni: string) {
    const person = await this.prisma.person.findUnique({
      where: { dni },
    });
    if (!person) {
      throw new NotFoundException(`No se encontró ninguna persona con el DNI ${dni}`);
    }
    return person;
  }

  // 2. Crear Usuario completo (Person + User + Profile)
  async create(createUserDto: CreateUserDto) {
    const { firstName, lastName, dni, email, password } = createUserDto;

    const existingPerson = await this.prisma.person.findFirst({
      where: { OR: [{ dni }, { email }] },
    });

    if (existingPerson) {
      throw new BadRequestException('El DNI o el Email ya se encuentran registrados.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const person = await tx.person.create({
        data: { firstName, lastName, dni, email },
      });

      // El rol queda en DOCENTE por defecto (definido en el schema)
      const user = await tx.user.create({
        data: {
          name: `${firstName} ${lastName}`,
          password: hashedPassword,
        },
      });

      const profile = await tx.profile.create({
        data: {
          userId: user.id,
          personId: person.id,
        },
      });

      return {
        id: user.id,
        name: user.name,
        email: person.email,
        dni: person.dni,
        role: user.role,
        profileId: profile.id,
      };
    });
  }

  // 3. Listar usuarios (solo activos)
  async findAll() {
    return this.prisma.profile.findMany({
      where: { user: { deletedAt: null } },
      include: {
        user: { select: { id: true, name: true, role: true, emailVerified: true } },
        person: true,
      },
    });
  }

  // 4. Buscar usuario por ID de perfil (solo activos)
  async findOne(id: number) {
    const profile = await this.prisma.profile.findFirst({
      where: { id, user: { deletedAt: null } },
      include: {
        user: { select: { id: true, name: true, role: true, emailVerified: true } },
        person: true,
      },
    });

    if (!profile) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return profile;
  }

  // 5. Baja Lógica (Soft Delete)
  async softDelete(profileId: number) {
    const profile = await this.prisma.profile.findFirst({
      where: { id: profileId, user: { deletedAt: null } },
      include: { reservations: { select: { id: true } } },
    });

    if (!profile) {
      throw new NotFoundException(`Perfil no encontrado`);
    }

    // Reservas del perfil o creadas por ese usuario
    const createdCount = await this.prisma.reservation.count({
      where: { createdByUserId: profile.userId },
    });

    if (profile.reservations.length > 0 || createdCount > 0) {
      throw new BadRequestException(
        'Protección de datos: No se puede desactivar un usuario con reservas asociadas.',
      );
    }

    await this.prisma.user.update({
      where: { id: profile.userId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Usuario desactivado correctamente' };
  }
}