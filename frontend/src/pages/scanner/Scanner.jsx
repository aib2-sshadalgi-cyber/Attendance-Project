import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { FaceCapture } from '../../components/FaceCapture';

export default function Scanner() {
  const [lectures, setLectures] = useState([]);
  const [selected, setSelected] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    api
      .get('/api/lectures?activeOnly=true')
      .then((res) => {
        setLectures(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {});
  }, []);

  async function submitDescriptor(descriptor) {
    if (!selected) {
      throw new Error('Choose a lecture first');
    }
    setFeedback(null);
    try {
      const { data } = await api.post('/api/attendance/staff-scan', {
        lectureId: selected,
        faceDescriptor: descriptor,
      });
      setFeedback({
        type: 'success',
        title: `Marked ${data.student?.name || 'student'}`,
        subtitle: `${data.student?.rollNumber || ''} ${data.message}`.trim(),
      });
    } catch (err) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      if ((status === 409 && body?.code === 'ALREADY_MARKED') || status === 409) {
        setFeedback({
          type: 'info',
          title: 'Already accounted for',
          subtitle: body?.message || 'Scanned for lecture',
        });
        return;
      }
      setFeedback({
        type: 'error',
        title: 'Verification failed',
        subtitle: typeof body?.message === 'string' ? body.message : err.message,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Staff attendance scanner</h1>
        <p className="text-slate-600">
          Scan any registered student face and mark attendance for the selected lecture.
        </p>
      </div>
      {feedback && (
        <Banner
          type={feedback.type}
          title={feedback.title}
          subtitle={feedback.subtitle}
          onClose={() => setFeedback(null)}
        />
      )}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-3xl bg-white p-6 shadow-panel lg:col-span-2">
          <label className="text-sm font-semibold text-slate-700">Lecture roster</label>
          <select
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-brand-500/30 focus:ring"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select lecture slot</option>
            {lectures.map((l) => (
              <option key={l.id} value={l.id}>
                [{l.subjectCode}] {l.subjectName} • {new Date(l.scheduledAt).toLocaleString()}
              </option>
            ))}
          </select>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            The scanner account can validate any registered face against the student registry.
          </p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-panel lg:col-span-3">
          <FaceCapture
            disabled={!selected}
            buttonLabel={selected ? 'Capture face & mark attendance' : 'Choose a lecture'}
            onDescriptor={(d) => submitDescriptor(d)}
            onError={() => {}}
          />
        </div>
      </div>
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