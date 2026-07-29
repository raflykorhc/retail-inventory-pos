import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default user accounts...');

  const accounts = [
    {
      username: 'manager',
      password: 'manager123',
      fullName: 'Manager Toko',
      role: 'MANAGER',
    },
    {
      username: 'admin',
      password: 'admin123',
      fullName: 'Administrator',
      role: 'ADMIN',
    },
    {
      username: 'kasir',
      password: 'kasir123',
      fullName: 'Kasir Toko',
      role: 'CASHIER',
    },
  ];

  for (const account of accounts) {
    const hashedPassword = await bcrypt.hash(account.password, 10);
    await prisma.user.upsert({
      where: { username: account.username },
      update: {},
      create: {
        username: account.username,
        password: hashedPassword,
        fullName: account.fullName,
        role: account.role,
      },
    });
    console.log(`  ✓ Akun "${account.username}" (${account.role}) siap.`);
  }

  console.log('\nSeeding selesai!');
  console.log('─────────────────────────────────────');
  console.log('  Username : manager  | Password: manager123');
  console.log('  Username : admin    | Password: admin123');
  console.log('  Username : kasir    | Password: kasir123');
  console.log('─────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
