import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { ReservationsService } from './reservations.service.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';

interface AuthRequest {
  user: { userId: number; role: string };
}

@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.reservationsService.findAll(req.user.userId, req.user.role);
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.findOne(id, req.user.userId, req.user.role);
  }

  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.reservationsService.updateStatus(id, dto.status);
  }

  @Patch(':id/cancel')
  cancel(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.cancel(id, req.user.userId, req.user.role);
  }
}