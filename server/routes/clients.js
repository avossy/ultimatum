import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { makeCrud } from '../utils/crud.js';

const crud = makeCrud({
  table: 'clients',
  idColumn: 'client_id',
  baseSelect: `SELECT t.client_id AS id, t.full_name AS name, t.phone, t.email, t.address,
                      t.registration_date AS "registrationDate"
               FROM clients t`,
  orderBy: 't.full_name',
  search: ['t.full_name', 't.phone', 't.email'],
  fields: [
    { key: 'name', column: 'full_name', label: 'ПІБ', type: 'string', max: 150 },
    { key: 'phone', column: 'phone', label: 'Телефон', type: 'string', max: 20 },
    { key: 'email', column: 'email', label: 'Email', type: 'email', nullable: true },
    { key: 'address', column: 'address', label: 'Адреса', type: 'string', max: 250, nullable: true },
  ],
});

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', crud.list);
router.get('/:id', crud.getOne);
router.post('/', crud.create);
router.patch('/:id', crud.update);
router.delete('/:id', crud.remove);

export default router;
