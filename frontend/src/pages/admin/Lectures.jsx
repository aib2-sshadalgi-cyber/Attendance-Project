import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

function toLocalDatetimeValue(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(
    dt.getMinutes()
  )}`;
}

export default function Lectures() {
  const [lectures, setLectures] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({
    subjectId: '',
    title: 'Lecture',
    scheduledAt: toLocalDatetimeValue(new Date()),
    endsAt: '',
    room: '',
  });

  const loadAll = async () => {
    const [lec, subs] = await Promise.all([api.get('/api/lectures'), api.get('/api/subjects')]);
    setLectures(Array.isArray(lec.data) ? lec.data : []);
    setSubjects(Array.isArray(subs.data) ? subs.data : []);
  };

  useEffect(() => {
    loadAll().catch(() => {});
  }, []);

  async function createLecture(ev) {
    ev.preventDefault();
    const payload = {
      subjectId: form.subjectId,
      title: form.title,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      room: form.room,
    };
    if (form.endsAt) payload.endsAt = new Date(form.endsAt).toISOString();
    await api.post('/api/lectures', payload);
    await loadAll();
  }

  async function toggle(id, flag) {
    await api.patch(`/api/lectures/${id}`, { isActive: flag });
    await loadAll();
  }

  async function remove(id) {
    if (!confirm('Remove lecture slot and associated scans?')) return;
    await api.delete(`/api/lectures/${id}`);
    await loadAll();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-6 items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Lecture operations</h1>
          <p className="text-slate-600">Plan windows feeding student biometric kiosk.</p>
        </div>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-panel">
        <form onSubmit={createLecture} className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700 md:col-span-1">
            Subject
            <select
              required
              value={form.subjectId}
              onChange={(ev) => setForm((p) => ({ ...p, subjectId: ev.target.value }))}
              className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
            >
              <option value="">Select</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.code}] {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Title
            <input
              required
              className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={form.title}
              onChange={(ev) => setForm((p) => ({ ...p, title: ev.target.value }))}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Room / hall
            <input
              className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={form.room}
              onChange={(ev) => setForm((p) => ({ ...p, room: ev.target.value }))}
              placeholder="A-101"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Scheduled at
            <input
              type="datetime-local"
              required
              className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={form.scheduledAt}
              onChange={(ev) => setForm((p) => ({ ...p, scheduledAt: ev.target.value }))}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Ends (optional)
            <input
              type="datetime-local"
              className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={form.endsAt}
              onChange={(ev) => setForm((p) => ({ ...p, endsAt: ev.target.value }))}
            />
          </label>
          <div className="flex items-end">
            <button className="w-full rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">
              Publish slot
            </button>
          </div>
        </form>
      </div>
      <div className="rounded-3xl bg-white divide-y divide-slate-100 shadow-panel overflow-hidden border border-white">
        {lectures.map((lec) => (
          <div key={lec.id} className="flex flex-wrap gap-4 items-center justify-between px-6 py-4">
            <div>
              <p className="text-lg font-semibold text-slate-900">{lec.subjectName}</p>
              <p className="text-xs font-semibold text-slate-500">{lec.subjectCode}</p>
              <p className="text-sm text-slate-700">
                {lec.title} • {new Date(lec.scheduledAt).toLocaleString()} · {lec.room || 'Online'}
              </p>
              <p className="text-xs uppercase tracking-wide mt-2 text-slate-500">
                Slot {lec.isActive ? '🟢 active' : '🔴 archived'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center justify-end">
              <Link className="text-sm font-semibold text-brand-700" to={`/admin/monitor/${lec.id}`}>
                Live roster →
              </Link>
              <button
                type="button"
                className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold"
                onClick={() => toggle(lec.id, !lec.isActive)}
              >
                {lec.isActive ? 'Close' : 'Reopen'}
              </button>
              <button type="button" className="text-xs text-red-600" onClick={() => remove(lec.id)}>
                Purge slot
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
