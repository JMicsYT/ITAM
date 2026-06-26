import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// ============================================================
// Seed Script — заполняет БД демо-данными для разработки
// Запуск: npm run db:seed
// ============================================================

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...');

  // --- Очистка существующих данных ---
  await prisma.auditLog.deleteMany();
  await prisma.token.deleteMany();
  await prisma.consumable.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.user.deleteMany();

  // --- Пользователи ---
  const adminHash = await bcrypt.hash('admin123', 12);
  const techHash  = await bcrypt.hash('tech123', 12);
  await prisma.user.createMany({
    data: [
      { username: 'admin',  passwordHash: adminHash, fullName: 'Администратор Системы', role: 'admin' },
      { username: 'tech',   passwordHash: techHash,  fullName: 'Технический Специалист',  role: 'technician' },
    ],
  });
  console.log('👤 Пользователи созданы (admin/admin123 и tech/tech123)');

  console.log('🗑  Существующие данные очищены');

  // --- Equipment (Оборудование) ---
  await prisma.equipment.createMany({
    data: [
      {
        type: 'pc',
        brand: 'Dell',
        model: 'OptiPlex 3080',
        serialNumber: 'SN-PC-001',
        status: 'in_use',
        location: 'Кабинет 101',
        assignedTo: 'Иванов Иван Иванович',
        ipAddress: '192.168.1.101',
        specs: { cpu: 'Intel Core i5-10500', ram: '16GB DDR4', storage: '512GB SSD' },
      },
      {
        type: 'laptop',
        brand: 'HP',
        model: 'EliteBook 840 G8',
        serialNumber: 'SN-LT-001',
        status: 'in_use',
        location: 'Кабинет 205',
        assignedTo: 'Петрова Мария Сергеевна',
        specs: { cpu: 'Intel Core i7-1165G7', ram: '32GB DDR4', storage: '1TB NVMe' },
      },
      {
        type: 'printer',
        brand: 'Kyocera',
        model: 'ECOSYS M2135dn',
        serialNumber: 'SN-PR-001',
        status: 'in_use',
        location: 'Кабинет 102',
        ipAddress: '192.168.1.201',
        specs: { ppm: 35, duplex: true, network: true },
      },
      {
        type: 'ups',
        brand: 'APC',
        model: 'Smart-UPS 1500VA',
        serialNumber: 'SN-UPS-001',
        status: 'in_use',
        location: 'Серверная',
        specs: { powerVA: 1500, powerW: 1000, batteryType: 'Lead-Acid' },
      },
      {
        type: 'server',
        brand: 'Dell',
        model: 'PowerEdge R640',
        serialNumber: 'SN-SRV-001',
        status: 'in_use',
        location: 'Серверная',
        ipAddress: '192.168.1.10',
        specs: { cpu: '2x Intel Xeon Silver 4210', ram: '128GB DDR4 ECC', storage: '4x 2TB SAS RAID' },
      },
      {
        type: 'monitor',
        brand: 'Samsung',
        model: 'S24A336',
        serialNumber: 'SN-MON-001',
        status: 'storage',
        location: 'Склад',
        specs: { diagonal: '24"', resolution: '1920x1080', panel: 'IPS' },
      },
    ],
  });
  console.log('🖥  Оборудование добавлено (6 позиций)');

  // --- Consumables (Расходники — поштучный учёт по серийным номерам) ---
  await prisma.consumable.createMany({
    data: [
      {
        type: 'cartridge',
        model: 'Kyocera TK-1170',
        serialNumber: 'TK1170-001',
        status: 'in_stock',
        compatibleWith: ['Kyocera ECOSYS M2135dn', 'Kyocera ECOSYS M2040dn'],
        location: 'Склад А, Шкаф 1',
      },
      {
        type: 'cartridge',
        model: 'Kyocera TK-1170',
        serialNumber: 'TK1170-002',
        status: 'in_stock',
        compatibleWith: ['Kyocera ECOSYS M2135dn', 'Kyocera ECOSYS M2040dn'],
        location: 'Склад А, Шкаф 1',
      },
      {
        type: 'cartridge',
        model: 'Kyocera TK-1170',
        serialNumber: 'TK1170-003',
        status: 'in_use',
        compatibleWith: ['Kyocera ECOSYS M2135dn', 'Kyocera ECOSYS M2040dn'],
        location: 'Кабинет 102',
        notes: 'Установлен в Kyocera ECOSYS M2135dn (SN-PR-001)',
      },
      {
        type: 'cartridge',
        model: 'HP CE285A (85A)',
        serialNumber: 'CE285A-001',
        status: 'in_stock',
        compatibleWith: ['HP LaserJet Pro P1102', 'HP LaserJet Pro M1130'],
        location: 'Склад А, Шкаф 1',
      },
      {
        type: 'cartridge',
        model: 'HP CE285A (85A)',
        serialNumber: 'CE285A-002',
        status: 'depleted',
        compatibleWith: ['HP LaserJet Pro P1102', 'HP LaserJet Pro M1130'],
        location: 'Склад А, Шкаф 1',
        notes: 'Картридж пуст, подлежит утилизации',
      },
      {
        type: 'drum_unit',
        model: 'Kyocera DK-1150',
        serialNumber: 'DK1150-001',
        status: 'in_stock',
        compatibleWith: ['Kyocera ECOSYS M2135dn', 'Kyocera ECOSYS P2235d'],
        location: 'Склад А, Шкаф 2',
      },
    ],
  });
  console.log('📦 Расходники добавлены (6 экземпляров по серийным номерам)');


  // --- Tokens (Рутокены) ---
  const futureDate = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d;
  };

  await prisma.token.createMany({
    data: [
      {
        serialNumber: 'RT-000001234',
        issuedTo: 'Иванов Иван Иванович',
        certificateType: 'ФНС',
        expirationDate: futureDate(14), // Истекает через 14 месяцев
        status: 'active',
        notes: 'Используется для подачи налоговой отчётности',
      },
      {
        serialNumber: 'RT-000005678',
        issuedTo: 'Петрова Мария Сергеевна',
        certificateType: 'Казначейство',
        expirationDate: futureDate(1), // ⚠️ Истекает через 1 месяц!
        status: 'active',
        notes: 'Требуется продление в ближайшее время',
      },
      {
        serialNumber: 'RT-000009012',
        issuedTo: 'Сидоров Алексей Петрович',
        certificateType: 'ЕГАИС',
        expirationDate: futureDate(-2), // Уже истёк
        status: 'expired',
      },
      {
        serialNumber: 'RT-000003456',
        issuedTo: 'Козлова Анна Владимировна',
        certificateType: 'Контур',
        expirationDate: futureDate(11),
        status: 'in_safe',
        notes: 'Хранится в сейфе главного бухгалтера, ком. 301',
      },
    ],
  });
  console.log('🔑 Рутокены добавлены (4 позиции)');

  console.log('');
  console.log('✅ База данных успешно заполнена!');
  console.log('📊 Откройте Prisma Studio: npm run db:studio');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении БД:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
