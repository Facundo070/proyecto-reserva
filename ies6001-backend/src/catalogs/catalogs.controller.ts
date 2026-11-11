import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CatalogsService } from './catalogs.service.js';

@ApiTags('catalogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get()
  async findAll() {
    const [categories, resourceStatuses, reservationStatuses] = await Promise.all([
      this.catalogsService.categories(),
      this.catalogsService.resourceStatuses(),
      this.catalogsService.reservationStatuses(),
    ]);

    return {
      categories,
      resourceStatuses,
      reservationStatuses,
    };
  }

  @Get('categories')
  categories() {
    return this.catalogsService.categories();
  }

  @Get('resource-statuses')
  resourceStatuses() {
    return this.catalogsService.resourceStatuses();
  }

  @Get('reservation-statuses')
  reservationStatuses() {
    return this.catalogsService.reservationStatuses();
  }
}