import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function Subjects() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: '', code: '' });
  const [msg, setMsg] = useState('');

  const load = () => api.get('/api/subjects').then((res) => setRows(res.data));

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/subjects', { name: form.name, code: form.code.toUpperCase() });
      setForm({ name: '', code: '' });
      await load();
    } catch {
      setMsg('Subject code duplicate or validation error');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Subject catalog</h1>
        <p className="text-slate-600">Canonical codes feed lecture scheduling workflows.</p>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-panel">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Subject name
            <input
              required
              className="mt-2 w-full rounded-xl border px-3 py-2 shadow-inner outline-none focus:ring"
              value={form.name}
              onChange={(ev) => setForm((prev) => ({ ...prev, name: ev.target.value }))}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Code
            <input
              required
              className="mt-2 w-full rounded-xl border px-3 py-2 uppercase shadow-inner outline-none focus:ring"
              value={form.code}
              onChange={(ev) => setForm((prev) => ({ ...prev, code: ev.target.value }))}
            />
          </label>
          <div className="flex items-end">
            <button className="w-full rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">Add</button>
          </div>
          {msg && <p className="md:col-span-4 text-sm text-red-600">{msg}</p>}
        </form>
      </div>
      <div className="rounded-3xl bg-white divide-y divide-slate-100 shadow-panel overflow-hidden border border-white">
        {rows.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="font-semibold text-slate-900">{s.name}</p>
              <p className="text-xs text-slate-500">{s.code}</p>
            </div>
            <button type="button" className="text-xs text-red-600" onClick={() => api.delete(`/api/subjects/${s.id}`).then(load)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
