import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { CatalogsController } from './catalogs.controller.js';
import { CatalogsService } from './catalogs.service.js';

describe('CatalogsController', () => {
  let controller: CatalogsController;

  const catalogsService = {
    categories: vi.fn().mockResolvedValue([{ id: 1, name: 'Proyector' }]),
    resourceStatuses: vi.fn().mockResolvedValue([{ id: 1, name: 'Disponible' }]),
    reservationStatuses: vi.fn().mockResolvedValue([{ id: 1, name: 'Pendiente' }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogsController],
      providers: [
        {
          provide: CatalogsService,
          useValue: catalogsService,
        },
      ],
    }).compile();

    controller = module.get<CatalogsController>(CatalogsController);
  });

  it('should return the combined catalog payload expected by the frontend', async () => {
    await expect(controller.findAll()).resolves.toEqual({
      categories: [{ id: 1, name: 'Proyector' }],
      resourceStatuses: [{ id: 1, name: 'Disponible' }],
      reservationStatuses: [{ id: 1, name: 'Pendiente' }],
    });
  });
});
