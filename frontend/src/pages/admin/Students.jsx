import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { FaceCapture } from '../../components/FaceCapture';

export default function Students() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', name: '', rollNumber: '', department: '' });
  const [busy, setBusy] = useState(false);
  const [faceTargetId, setFaceTargetId] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api.get('/api/admin/students').then((res) => setRows(res.data));

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await api.post('/api/admin/students', form);
      setForm({ email: '', password: '', name: '', rollNumber: '', department: '' });
      setMsg('Student created.');
      await load();
    } catch (err) {
      setMsg(err?.response?.data?.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!window.confirm('Remove student permanently?')) return;
    await api.delete(`/api/admin/students/${id}`);
    await load();
  }

  const targetName = useMemo(() => rows.find((r) => r.id === faceTargetId)?.name || '', [faceTargetId, rows]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Student directory</h1>
        <p className="text-slate-600">CRUD provisioning + biometric enrollment kiosk.</p>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-panel">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
          {['email', 'password', 'name', 'rollNumber', 'department'].map((field) => (
            <label key={field} className="text-sm font-semibold text-slate-700">
              {field}
              <input
                className="mt-2 w-full rounded-xl border px-3 py-2 shadow-inner outline-none focus:ring-brand-600/40"
                required
                type={field === 'password' ? 'password' : 'text'}
                value={form[field]}
                onChange={(ev) =>
                  setForm((prev) => ({ ...prev, [field]: ev.target.value }))
                }
                placeholder={field}
              />
            </label>
          ))}
          <div className="md:col-span-3 flex gap-4 items-center">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              Add student
            </button>
            {msg && <p className="text-sm font-medium text-brand-700">{msg}</p>}
          </div>
        </form>
      </div>
      <div className="rounded-3xl bg-white shadow-panel overflow-hidden border border-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Roll</th>
              <th className="text-left px-4 py-3">Dept</th>
              <th className="text-left px-4 py-3">Face</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-semibold text-slate-900">{r.name}</td>
                <td className="px-4 py-3">{r.rollNumber}</td>
                <td className="px-4 py-3">{r.department}</td>
                <td className="px-4 py-3">{r.hasFace ? '✅' : '⛔ Missing'}</td>
                <td className="px-4 py-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800"
                    onClick={() => {
                      setFaceTargetId(r.id);
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }}
                  >
                    Register face
                  </button>
                  <button type="button" className="text-xs text-rose-600" onClick={() => remove(r.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div id="capture" className="rounded-3xl bg-white p-6 shadow-panel">
        <h2 className="text-xl font-semibold text-slate-900">Registrar capture panel</h2>
        {!faceTargetId && <p className="mt-2 text-sm text-slate-600">Pick a learner above to initiate imaging.</p>}
        {!!faceTargetId && (
          <div className="mt-6 max-w-xl">
            <p className="text-sm font-medium text-brand-900">Target: {targetName}</p>
            <FaceCapture
              buttonLabel="Save biometric template"
              onDescriptor={async (descriptor) => {
                await api.patch(`/api/admin/students/${faceTargetId}/register-face`, { faceDescriptor: descriptor });
                setMsg('Biometric envelope stored.');
                setFaceTargetId('');
                await load();
              }}
              onError={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
}
