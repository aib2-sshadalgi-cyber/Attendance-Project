import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';

export default function LectureMonitor() {
  const { lectureId } = useParams();
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const { data } = await api.get(`/api/attendance/monitor/${lectureId}`);
        if (!cancelled) {
          setSnapshot(data);
          setError('');
        }
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Unable to load monitor stream');
      }
    };
    tick();
    const id = window.setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [lectureId]);

  const rows = snapshot?.records || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Realtime intake console</h1>
        <p className="text-slate-600">Rolling refresh cadence (~5 seconds) respects Vercel serverless footprints.</p>
      </div>
      {snapshot?.lecture && (
        <div className="rounded-3xl bg-gradient-to-r from-brand-600 to-brand-900 p-6 text-white shadow-panel">
          <p className="text-xs uppercase tracking-[0.4em] text-white/65">Teaching unit</p>
          <p className="text-3xl font-semibold mt-3">{snapshot.lecture.subjectName}</p>
          <p className="text-sm mt-2 text-white/85">
            {snapshot.lecture.title} · seats captured {snapshot.countPresent} · baseline{' '}
            {new Date(snapshot.lecture.scheduledAt).toLocaleString()}
          </p>
        </div>
      )}
      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>
      )}
      <div className="rounded-3xl bg-white shadow-panel overflow-hidden border border-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="text-left px-4 py-3"> learner </th>
              <th className="text-left px-4 py-3"> roll </th>
              <th className="text-left px-4 py-3"> department </th>
              <th className="text-left px-4 py-3"> scanned </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-slate-500">
                  Listening for biometric handshakes…
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={`${r.rollNumber}-${i}`}>
                <td className="px-4 py-3 font-semibold text-slate-900">{r.studentName}</td>
                <td className="px-4 py-3">{r.rollNumber}</td>
                <td className="px-4 py-3">{r.department}</td>
                <td className="px-4 py-3">{new Date(r.scannedAt).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
