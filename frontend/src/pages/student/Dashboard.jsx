import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [lectures, setLectures] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/api/attendance/my').then((res) => res.data),
      api.get('/api/lectures?activeOnly=true').then((res) => res.data),
    ])
      .then(([mine, lect]) => {
        setData(mine);
        setLectures(Array.isArray(lect) ? lect : []);
      })
      .catch(() => {});
  }, []);

  const highlights = useMemo(() => data?.summary || { total: 0, present: 0 }, [data]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Attendance dashboard</h1>
        <p className="text-slate-600">Tracked sessions verified with facial biometrics.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Metric label="Captured sessions" value={highlights.total} hint="successful scans" accent="bg-brand-500" />
        <Metric label="Present marks" value={highlights.present} hint="validated presence" accent="bg-emerald-500" />
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
          <p className="text-sm font-semibold text-slate-500">Quick action</p>
          <Link
            to="/student/scan"
            className="mt-4 inline-flex w-full justify-center rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-black"
          >
            Scan for today&apos;s lectures
          </Link>
          <Link
            to="/student/attendance"
            className="mt-3 block text-center text-sm font-semibold text-brand-700 hover:underline"
          >
            View detailed history →
          </Link>
        </div>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Open lecture windows</h2>
            <p className="text-sm text-slate-600">
              Administrators close slots after completion — only active lectures display here.
            </p>
          </div>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {lectures.length === 0 && <p className="py-4 text-sm text-slate-500">No active lectures scheduled.</p>}
          {lectures.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-slate-900">
                  {l.subjectName}{' '}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {l.subjectCode}
                  </span>
                </p>
                <p className="text-sm text-slate-600">
                  {l.title} · {new Date(l.scheduledAt).toLocaleString()} {l.room && `• ${l.room}`}
                </p>
              </div>
              <Link
                to="/student/scan"
                state={{ lectureId: l.id }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                Select in scanner
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, hint, accent }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white ${accent}`}>{label}</span>
      <p className="mt-4 text-4xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-600">{hint}</p>
    </div>
  );
}
