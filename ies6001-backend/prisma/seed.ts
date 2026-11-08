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