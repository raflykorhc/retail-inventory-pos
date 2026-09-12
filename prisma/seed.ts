import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default user accounts...');

  const accounts = [
    {
      username: 'pemilik',
      password: 'pemilik123',
      fullName: 'Pemilik Usaha',
      role: 'OWNER',
    },
    {
      username: 'kasir',
      password: 'kasir123',
      fullName: 'Kasir Toko',
      role: 'CASHIER',
    },
    // Akun legacy kompatibel
    {
      username: 'manager',
      password: 'manager123',
      fullName: 'Manager Toko (Pemilik)',
      role: 'OWNER',
    },
    {
      username: 'admin',
      password: 'admin123',
      fullName: 'Administrator (Pemilik)',
      role: 'OWNER',
    },
  ];

  for (const account of accounts) {
    const hashedPassword = await bcrypt.hash(account.password, 10);
    await prisma.user.upsert({
      where: { username: account.username },
      update: {
        role: account.role,
        fullName: account.fullName,
      },
      create: {
        username: account.username,
        password: hashedPassword,
        fullName: account.fullName,
        role: account.role,
      },
    });
    console.log(`  ✓ Akun "${account.username}" (${account.role} - ${account.fullName}) siap.`);
  }

  console.log('\nSeeding selesai!');
  console.log('───────────────────────────────────────────────────────');
  console.log('  [PEMILIK USAHA] Username : pemilik  | Password: pemilik123');
  console.log('  [KASIR]         Username : kasir    | Password: kasir123');
  console.log('  (Legacy)        Username : manager  | Password: manager123');
  console.log('───────────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
