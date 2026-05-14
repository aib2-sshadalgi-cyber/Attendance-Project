import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function AdminHome() {
  const [stats, setStats] = useState({ students: 0, subjects: 0, lectures: 0, scans: 0 });
  const [staffForm, setStaffForm] = useState({ email: '', password: '' });
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffMsg, setStaffMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/students'),
      api.get('/api/subjects'),
      api.get('/api/lectures'),
      api.get('/api/attendance'),
    ])
      .then(([students, subjects, lectures, attendance]) => {
        setStats({
          students: students.data?.length || 0,
          subjects: subjects.data?.length || 0,
          lectures: lectures.data?.length || 0,
          scans: attendance.data?.length || 0,
        });
      })
      .catch(() => {});
  }, []);

  async function createStaff(e) {
    e.preventDefault();
    setStaffBusy(true);
    setStaffMsg('');
    try {
      const { data } = await api.post('/api/admin/staff', staffForm);
      setStaffMsg(`Scanner account created: ${data.email}`);
      setStaffForm({ email: '', password: '' });
    } catch (err) {
      setStaffMsg(err?.response?.data?.message || 'Could not create scanner account');
    } finally {
      setStaffBusy(false);
    }
  }

  const cards = [
    { label: 'Students synced', value: stats.students, to: '/admin/students', color: 'from-brand-500 to-sky-500' },
    { label: 'Subjects online', value: stats.subjects, to: '/admin/subjects', color: 'from-indigo-500 to-purple-600' },
    { label: 'Lecture timelines', value: stats.lectures, to: '/admin/lectures', color: 'from-rose-500 to-orange-400' },
    { label: 'Biometric validations', value: stats.scans, to: '/admin/attendance', color: 'from-emerald-500 to-teal-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-brand-700">Operational overview</p>
        <h1 className="text-3xl font-semibold text-slate-900">Administration cockpit</h1>
        <p className="text-slate-600">Monitor biometric throughput, intervene on duplicate attempts, audit exports.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className={`rounded-3xl bg-gradient-to-br ${c.color} p-8 text-white shadow-panel`}>
            <p className="text-xs uppercase tracking-widest text-white/75">{c.label}</p>
            <p className="mt-6 text-5xl font-bold">{c.value}</p>
            <p className="mt-3 text-sm text-white/85">Navigate →</p>
          </Link>
        ))}
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-panel">
        <h2 className="text-lg font-semibold text-slate-900">Create scanner account</h2>
        <p className="mt-1 text-sm text-slate-600">
          Use this for the designated staff member who will scan student faces.
        </p>
        <form onSubmit={createStaff} className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Staff email
            <input
              required
              type="email"
              className="mt-2 w-full rounded-xl border px-3 py-2 shadow-inner outline-none focus:ring-brand-600/40"
              value={staffForm.email}
              onChange={(e) => setStaffForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Password
            <input
              required
              type="password"
              className="mt-2 w-full rounded-xl border px-3 py-2 shadow-inner outline-none focus:ring-brand-600/40"
              value={staffForm.password}
              onChange={(e) => setStaffForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </label>
          <div className="md:col-span-3 flex items-center gap-4">
            <button
              type="submit"
              disabled={staffBusy}
              className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {staffBusy ? 'Creating…' : 'Create scanner account'}
            </button>
            {staffMsg && <p className="text-sm font-medium text-brand-700">{staffMsg}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
