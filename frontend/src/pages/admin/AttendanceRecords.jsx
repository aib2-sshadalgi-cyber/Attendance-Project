import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function AttendanceRecords() {
  const [records, setRecords] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [filters, setFilters] = useState({ lectureId: '', roll: '' });

  useEffect(() => {
    api
      .get('/api/lectures')
      .then((res) => setLectures(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.lectureId) params.set('lectureId', filters.lectureId);
    if (filters.roll) params.set('rollNumber', filters.roll);
    api
      .get(`/api/attendance?${params.toString()}`)
      .then((res) => setRecords(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, [filters.lectureId, filters.roll]);

  function triggerDownload() {
    const qs = filters.lectureId ? `?lectureId=${encodeURIComponent(filters.lectureId)}` : '';
    const base = import.meta.env.VITE_API_URL || '';
    const token = localStorage.getItem('attendance_token');
    fetch(`${base}/api/attendance/export${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'attendance-export.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => {});
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Attendance ledger</h1>
          <p className="text-slate-600">Queryable trail with CSV payloads for archival systems.</p>
        </div>
        <button
          type="button"
          onClick={triggerDownload}
          className="rounded-xl border border-brand-700 px-6 py-2 font-semibold text-brand-800 hover:bg-brand-50"
        >
          Export CSV snapshot
        </button>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-panel flex flex-wrap gap-4">
        <label className="text-sm font-semibold text-slate-700">
          Filter lecture
          <select
            className="mt-2 rounded-xl border px-3 py-2 outline-none focus:ring"
            value={filters.lectureId}
            onChange={(e) => setFilters((prev) => ({ ...prev, lectureId: e.target.value }))}
          >
            <option value="">All sessions</option>
            {lectures.map((lec) => (
              <option key={lec.id} value={lec.id}>
                [{lec.subjectCode}] {lec.subjectName} · {new Date(lec.scheduledAt).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Exact roll lookup
          <input
            className="mt-2 rounded-xl border px-3 py-2 uppercase outline-none focus:ring"
            value={filters.roll}
            placeholder="CS2024001"
            onChange={(e) => setFilters((prev) => ({ ...prev, roll: e.target.value }))}
          />
        </label>
      </div>
      <div className="rounded-3xl bg-white shadow-panel overflow-hidden border border-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="text-left px-4 py-3"> learner </th>
              <th className="text-left px-4 py-3"> subject </th>
              <th className="text-left px-4 py-3"> lecture </th>
              <th className="text-left px-4 py-3"> slot </th>
              <th className="text-left px-4 py-3"> status </th>
              <th className="text-left px-4 py-3"> scanned </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((r, idx) => (
              <tr key={`${r.id}-${idx}`}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{r.studentName}</p>
                  <p className="text-[11px] text-slate-500">{r.rollNumber}</p>
                </td>
                <td className="px-4 py-3">{r.subjectName}</td>
                <td className="px-4 py-3">{r.lectureTitle}</td>
                <td className="px-4 py-3">{new Date(r.lectureAt).toLocaleString()}</td>
                <td className="px-4 py-3 capitalize">{r.status}</td>
                <td className="px-4 py-3">{new Date(r.scannedAt).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
