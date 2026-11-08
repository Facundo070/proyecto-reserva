import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const resourceStatuses = ['Disponible', 'En mantenimiento', 'Fuera de servicio'];
  const categories = ['Proyector', 'Notebook', 'Laboratorio', 'Salón'];
  const reservationStatuses = ['Pendiente', 'Aprobada', 'Finalizada', 'Cancelada'];

  for (const name of resourceStatuses)
    await prisma.statusResource.upsert({ where: { name }, update: {}, create: { name } });
  for (const name of categories)
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  for (const name of reservationStatuses)
    await prisma.statusReservation.upsert({ where: { name }, update: {}, create: { name } });

  const statusDisponible = await prisma.statusResource.findUniqueOrThrow({ where: { name: 'Disponible' } });
  const categoryProyector = await prisma.category.findUniqueOrThrow({ where: { name: 'Proyector' } });
  const categoryNotebook = await prisma.category.findUniqueOrThrow({ where: { name: 'Notebook' } });
  const categorySalon = await prisma.category.findUniqueOrThrow({ where: { name: 'Salón' } });

  const demoResources = [
    { name: 'Proyector Epson', marca: 'Epson', description: 'Proyector para aulas y presentaciones', statusId: statusDisponible.id, categoryId: categoryProyector.id },
    { name: 'Notebook Dell Latitude', marca: 'Dell', description: 'Notebook para clases y trabajos prácticos', statusId: statusDisponible.id, categoryId: categoryNotebook.id },
    { name: 'Notebook Lenovo ThinkPad', marca: 'Lenovo', description: 'Equipo portátil de alto rendimiento', statusId: statusDisponible.id, categoryId: categoryNotebook.id },
    { name: 'Aula Multimedia 1', marca: 'IES6001', description: 'Salón con equipamiento audiovisual', statusId: statusDisponible.id, categoryId: categorySalon.id },
  ];

  for (const resource of demoResources) {
    const existing = await prisma.resource.findFirst({
      where: {
        name: resource.name,
        marca: resource.marca ?? null,
      },
    });

    if (!existing) {
      await prisma.resource.create({ data: resource });
    }
  }

  // Admin inicial
  const person = await prisma.person.upsert({
    where: { dni: '00000000' },
    update: {},
    create: {
      firstName: 'Admin',
      lastName: 'IES6001',
      dni: '00000000',
      email: 'admin@ies6001.edu.ar',
    },
  });

  const existing = await prisma.profile.findFirst({ where: { personId: person.id } });
  if (!existing) {
    const user = await prisma.user.create({
      data: {
        name: 'Admin IES6001',
        password: await bcrypt.hash('Cambiar123!', 10),
        role: 'ADMIN',
      },
    });
    await prisma.profile.create({ data: { userId: user.id, personId: person.id } });
  }

  console.log('Seed completado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());