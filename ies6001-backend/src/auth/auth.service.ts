import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar la persona por su Email, solo con perfiles de usuarios activos
    const person = await this.prisma.person.findUnique({
      where: { email },
      include: {
        profiles: {
          where: { user: { deletedAt: null } },
          include: { user: true },
        },
      },
    });

    if (!person || person.profiles.length === 0) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const profile = person.profiles[0];
    const user = profile.user;

    // Verificar contraseña con Bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar Token JWT
    const payload = {
      sub: user.id,
      email: person.email,
      profileId: profile.id,
      name: user.name,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: person.email,
        profileId: profile.id,
        role: user.role,
      },
    };
  }
}