import { useCallback } from 'react';
import AdminSidebar from './AdminSidebar.jsx';
import CrudTable from './CrudTable.jsx';
import { useFetch } from '../hooks/useFetch.js';

/**
 * Сторінка адмінки «таблиця + форма» поверх REST-ресурсу.
 *
 * props:
 *  resource  — { create, update, remove } з api (напр. api.clients)
 *  load      — () => Promise<rows> (за замовчуванням resource.list)
 *  toPayload — (draft, mode) => тіло запиту (за замовчуванням — draft без службових полів)
 */
export default function ApiCrudPage({
  title, resource, load, columns, fields, searchKeys, renderCell,
  toPayload = (draft) => draft,
}) {
  const fetchRows = useCallback(() => (load ? load() : resource.list()), [load, resource]);
  const { data: rows, loading, error, reload } = useFetch(fetchRows, [fetchRows]);

  const handleAdd = async (draft) => {
    await resource.create(toPayload(draft, 'add'));
    await reload();
  };
  const handleEdit = async (id, draft) => {
    await resource.update(id, toPayload(draft, 'edit'));
    await reload();
  };
  const handleDelete = async (id) => {
    await resource.remove(id);
    await reload();
  };

  return (
    <div className="client-layout">
      <AdminSidebar />
      {error && !rows ? (
        <main className="crud"><p>{error}</p></main>
      ) : loading && !rows ? (
        <main className="crud"><p>Завантаження...</p></main>
      ) : (
        <CrudTable
          title={title}
          columns={columns}
          fields={fields}
          rows={rows ?? []}
          searchKeys={searchKeys}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          renderCell={renderCell}
        />
      )}
    </div>
  );
}
