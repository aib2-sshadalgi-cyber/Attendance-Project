import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function AttendanceHistory() {
  const [filter, setFilter] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.from) params.set('from', filter.from);
    if (filter.to) params.set('to', filter.to);
    api
      .get(`/api/attendance/my?${params.toString()}`)
      .then((res) => setData(res.data))
      .catch(() => {});
  }, [filter.from, filter.to]);

  const rows = data?.attendance || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Historical attendance</h1>
        <p className="text-slate-600">Grouped by biometric capture timestamps.</p>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-panel">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm font-medium text-slate-700">
            From
            <input
              type="datetime-local"
              className="mt-1 rounded-xl border border-slate-200 px-3 py-2 shadow-sm outline-none ring-brand-500/30 focus:ring"
              value={filter.from}
              onChange={(e) => setFilter((ps) => ({ ...ps, from: e.target.value }))}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            To
            <input
              type="datetime-local"
              className="mt-1 rounded-xl border border-slate-200 px-3 py-2 shadow-sm outline-none ring-brand-500/30 focus:ring"
              value={filter.to}
              onChange={(e) => setFilter((ps) => ({ ...ps, to: e.target.value }))}
            />
          </label>
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            onClick={() => setFilter({ from: '', to: '' })}
          >
            Clear
          </button>
        </div>
      </div>
      <div className="rounded-3xl bg-white shadow-panel overflow-hidden border border-white">
        <div className="grid grid-cols-6 gap-2 border-b bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <span className="col-span-2">Subject</span>
          <span className="col-span-2">Lecture slot</span>
          <span>Status</span>
          <span>Scanned</span>
        </div>
        <div className="divide-y">
          {rows.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-500">Nothing to show yet—complete a biometric scan.</p>
          )}
          {rows.map((row, idx) => (
            <div key={`${idx}-${row.lectureAt}`} className="grid grid-cols-6 gap-2 px-4 py-3 text-sm items-center">
              <div className="col-span-2">
                <p className="font-semibold text-slate-900">{row.subjectName}</p>
                <p className="text-xs text-slate-500">{row.subjectCode}</p>
              </div>
              <div className="col-span-2 text-slate-700">
                {row.lectureTitle}
                <p className="text-xs text-slate-500">{new Date(row.lectureAt).toLocaleString()}</p>
              </div>
              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold capitalize text-emerald-700">
                {row.status}
              </span>
              <span className="text-slate-700">{new Date(row.scannedAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
