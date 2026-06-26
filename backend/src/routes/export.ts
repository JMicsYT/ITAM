import { Router, Request, Response, NextFunction } from 'express';
import { query } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

// ============================================================
// Export Router — выгрузка данных в CSV
// GET /api/export/equipment
// GET /api/export/consumables
// GET /api/export/tokens
// ============================================================

export const exportRouter = Router();
exportRouter.use(requireAuth);

// --- CSV хелпер ---
function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const line = (cells: string[]) => cells.map(escape).join(';');
  return [line(headers), ...rows.map(line)].join('\r\n');
}

function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // BOM для корректного открытия в Excel
  res.send('\uFEFF' + csv);
}

// ── GET /api/export/equipment ─────────────────────────────────
exportRouter.get(
  '/equipment',
  [
    query('status').optional().isString(),
    query('type').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const where: Record<string, unknown> = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.type)   where.type   = req.query.type;

      const items = await prisma.equipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const statusMap: Record<string, string> = {
        in_use: 'В работе', storage: 'На складе',
        repair: 'В ремонте', decommissioned: 'Списано',
      };
      const typeMap: Record<string, string> = {
        ups: 'ИБП', printer: 'Принтер/МФУ', pc: 'ПК',
        laptop: 'Ноутбук', server: 'Сервер', monitor: 'Монитор',
      };

      const csv = toCsv(
        ['Тип', 'Производитель', 'Модель', 'Серийный номер', 'Статус', 'Расположение', 'Ответственный', 'IP-адрес', 'Примечания', 'Добавлено'],
        items.map((i) => [
          typeMap[i.type] ?? i.type,
          i.brand,
          i.model,
          i.serialNumber,
          statusMap[i.status] ?? i.status,
          i.location,
          i.assignedTo ?? '',
          i.ipAddress ?? '',
          i.notes ?? '',
          new Date(i.createdAt).toLocaleDateString('ru-RU'),
        ])
      );

      const date = new Date().toISOString().split('T')[0];
      sendCsv(res, `equipment_${date}.csv`, csv);
    } catch (error) {
      next(error);
    }
  }
);

// ── GET /api/export/consumables ───────────────────────────────
exportRouter.get('/consumables', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.consumable.findMany({ orderBy: { model: 'asc' } });
    const statusMap: Record<string, string> = {
      in_stock:   'На складе',
      in_use:     'Используется',
      depleted:   'Пуст',
      written_off: 'Списан',
    };
    const csv = toCsv(
      ['Тип', 'Артикул/Модель', 'Серийный номер', 'Статус', 'Совместим с', 'Место хранения', 'Примечания', 'Добавлено'],
      items.map((i) => [
        i.type === 'cartridge' ? 'Картридж' : 'Фотобарабан',
        i.model,
        i.serialNumber,
        statusMap[i.status] ?? i.status,
        (i.compatibleWith as string[]).join(', '),
        i.location,
        i.notes ?? '',
        new Date(i.createdAt).toLocaleDateString('ru-RU'),
      ])
    );
    const date = new Date().toISOString().split('T')[0];
    sendCsv(res, `consumables_${date}.csv`, csv);
  } catch (error) {
    next(error);
  }
});


// ── GET /api/export/tokens ────────────────────────────────────
exportRouter.get('/tokens', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.token.findMany({ orderBy: { expirationDate: 'asc' } });
    const statusMap: Record<string, string> = {
      active: 'Активен', in_safe: 'В сейфе', expired: 'Истёк', revoked: 'Отозван',
    };
    const now = new Date();
    const csv = toCsv(
      ['Серийный номер', 'ФИО сотрудника', 'Тип сертификата', 'Статус', 'Истекает', 'Осталось дней', 'Примечания'],
      items.map((i) => {
        const days = Math.ceil((new Date(i.expirationDate).getTime() - now.getTime()) / 86_400_000);
        return [
          i.serialNumber,
          i.issuedTo,
          i.certificateType,
          statusMap[i.status] ?? i.status,
          new Date(i.expirationDate).toLocaleDateString('ru-RU'),
          days > 0 ? String(days) : 'Истёк',
          i.notes ?? '',
        ];
      })
    );
    const date = new Date().toISOString().split('T')[0];
    sendCsv(res, `tokens_${date}.csv`, csv);
  } catch (error) {
    next(error);
  }
});
