import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function AdminHome() {
  const [stats, setStats] = useState({ students: 0, subjects: 0, lectures: 0, scans: 0 });

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
    </div>
  );
}
