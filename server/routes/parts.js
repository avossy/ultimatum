import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { makeCrud } from '../utils/crud.js';

const crud = makeCrud({
  table: 'spare_parts',
  idColumn: 'part_id',
  baseSelect: `SELECT t.part_id AS id, t.part_name AS name, t.part_number AS "partNumber",
                      t.manufacturer, t.unit_price AS "unitPrice",
                      t.stock_quantity AS "stockQuantity", t.min_stock_level AS "minStockLevel",
                      (t.stock_quantity <= t.min_stock_level) AS "lowStock"
               FROM spare_parts t`,
  orderBy: 't.part_name',
  search: ['t.part_name', 't.part_number', 't.manufacturer'],
  fields: [
    { key: 'name', column: 'part_name', label: 'Назва', type: 'string', max: 150 },
    { key: 'partNumber', column: 'part_number', label: 'Артикул', type: 'string', max: 60 },
    { key: 'manufacturer', column: 'manufacturer', label: 'Виробник', type: 'string', max: 100, nullable: true },
    { key: 'unitPrice', column: 'unit_price', label: 'Ціна', type: 'number', min: 0, max: 99999999 },
    { key: 'stockQuantity', column: 'stock_quantity', label: 'Залишок', type: 'int', min: 0 },
    { key: 'minStockLevel', column: 'min_stock_level', label: 'Мінімальний залишок', type: 'int', min: 0, default: 0 },
  ],
});

const router = Router();
router.use(requireAuth);

// Каталог запчастин потрібен майстру (додає запчастини до заявки) і адміну
router.get('/', requireRole('master', 'admin'), crud.list);
router.get('/:id', requireRole('master', 'admin'), crud.getOne);

router.post('/', requireRole('admin'), crud.create);
router.patch('/:id', requireRole('admin'), crud.update);
router.delete('/:id', requireRole('admin'), crud.remove);

export default router;
