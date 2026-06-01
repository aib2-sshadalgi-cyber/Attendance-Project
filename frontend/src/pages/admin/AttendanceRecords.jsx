import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { FaceCapture } from '../../components/FaceCapture';

export default function AttendanceRecords() {
  const [records, setRecords] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [filters, setFilters] = useState({ lectureId: '', roll: '' });
  const [scanOpen, setScanOpen] = useState(false);
  const [scanLectureId, setScanLectureId] = useState('');
  const [cameraId, setCameraId] = useState('');
  const [cameras, setCameras] = useState([]);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [scanBusy, setScanBusy] = useState(false);

  const loadLectures = async () => {
    const res = await api.get('/api/lectures');
    setLectures(Array.isArray(res.data) ? res.data : []);
  };

  const loadRecords = async (lectureId = filters.lectureId, roll = filters.roll) => {
    const params = new URLSearchParams();
    if (lectureId) params.set('lectureId', lectureId);
    if (roll) params.set('rollNumber', roll);
    const res = await api.get(`/api/attendance?${params.toString()}`);
    setRecords(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    loadLectures().catch(() => {});
  }, []);

  useEffect(() => {
    loadRecords().catch(() => {});
  }, [filters.lectureId, filters.roll]);

  useEffect(() => {
    if (!scanOpen) return;

    const refreshCameras = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const list = devices
          .filter((device) => device.kind === 'videoinput')
          .map((device, index) => ({
            id: device.deviceId,
            label: device.label || `Camera ${index + 1}`,
          }));
        setCameras(list);
        if (!cameraId && list[0]) {
          setCameraId(list[0].id);
        }
      } catch {
        setCameras([]);
      }
    };

    refreshCameras();
  }, [scanOpen, cameraId]);

  const selectedLecture = useMemo(
    () => lectures.find((lec) => lec.id === scanLectureId) || null,
    [lectures, scanLectureId]
  );

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

  function openScanner() {
    setScanFeedback(null);
    setScanLectureId(filters.lectureId || lectures[0]?.id || '');
    setScanOpen(true);
  }

  async function markAttendance(descriptor) {
    if (!scanLectureId) {
      throw new Error('Choose a lecture first');
    }
    setScanBusy(true);
    setScanFeedback(null);
    try {
      const { data } = await api.post('/api/attendance/staff-scan', {
        lectureId: scanLectureId,
        faceDescriptor: descriptor,
      });
      setScanFeedback({
        type: 'success',
        title: `Marked ${data.student?.name || 'student'}`,
        subtitle: `${data.student?.rollNumber || ''} • ${data.subjectName || data.message}`.trim(),
      });
      await loadRecords(scanLectureId, filters.roll);
    } catch (err) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      if ((status === 409 && body?.code === 'ALREADY_MARKED') || status === 409) {
        setScanFeedback({
          type: 'info',
          title: 'Already accounted for',
          subtitle: body?.message || 'Scanned for lecture',
        });
        return;
      }
      setScanFeedback({
        type: 'error',
        title: 'Verification failed',
        subtitle: typeof body?.message === 'string' ? body.message : err.message,
      });
    } finally {
      setScanBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Attendance ledger</h1>
          <p className="text-slate-600">Queryable trail with CSV payloads for archival systems.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openScanner}
            className="rounded-xl bg-slate-900 px-6 py-2 font-semibold text-white hover:bg-black"
          >
            Scan attendance
          </button>
          <button
            type="button"
            onClick={triggerDownload}
            className="rounded-xl border border-brand-700 px-6 py-2 font-semibold text-brand-800 hover:bg-brand-50"
          >
            Export CSV snapshot
          </button>
        </div>
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
                [{lec.subjectCode}] {lec.subjectName} · {lec.title} · {new Date(lec.scheduledAt).toLocaleString()}
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

      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Camera attendance popup</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Select a lecture time slot, choose the camera, then scan the student face.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScanOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {scanFeedback && (
              <Banner
                type={scanFeedback.type}
                title={scanFeedback.title}
                subtitle={scanFeedback.subtitle}
                onClose={() => setScanFeedback(null)}
              />
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-5">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 lg:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Lecture time slot</label>
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:ring"
                  value={scanLectureId}
                  onChange={(e) => setScanLectureId(e.target.value)}
                >
                  <option value="">Select lecture</option>
                  {lectures.map((lec) => (
                    <option key={lec.id} value={lec.id}>
                      [{lec.subjectCode}] {lec.subjectName} • {lec.title} • {new Date(lec.scheduledAt).toLocaleString()}
                    </option>
                  ))}
                </select>

                <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Selected lecture</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {selectedLecture
                      ? `${selectedLecture.subjectName} • ${selectedLecture.title}`
                      : 'No lecture selected'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedLecture ? new Date(selectedLecture.scheduledAt).toLocaleString() : 'Choose the slot you want to mark'}
                  </p>
                </div>

                <label className="mt-4 block text-sm font-semibold text-slate-700">Camera option</label>
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:ring"
                  value={cameraId}
                  onChange={(e) => setCameraId(e.target.value)}
                >
                  {cameras.length === 0 && <option value="">Default camera</option>}
                  {cameras.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label}
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-xs text-slate-500">
                  Grant camera permission once to see device names. The selected camera is used for face scan capture.
                </p>
              </div>

              <div className="rounded-3xl bg-white p-5 shadow-panel lg:col-span-3">
                <FaceCapture
                  cameraId={cameraId || undefined}
                  disabled={!scanLectureId || scanBusy}
                  buttonLabel={scanBusy ? 'Scanning…' : 'Capture face & mark attendance'}
                  onDescriptor={(descriptor) => markAttendance(descriptor)}
                  onError={() => {}}
                />
                <p className="mt-4 text-center text-sm text-slate-600">
                  The attendance will be marked for the selected lecture and time slot above.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Banner({ type, title, subtitle, onClose }) {
  const colors =
    type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
      : type === 'info'
      ? 'border-sky-200 bg-sky-50 text-sky-950'
      : 'border-rose-200 bg-rose-50 text-rose-950';

  return (
    <div className={`rounded-2xl border px-6 py-4 ${colors}`}>
      <div className="flex justify-between gap-4">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm opacity-90">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-black/10"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
