import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="mx-auto grid min-h-screen max-w-5xl gap-12 px-4 py-20 lg:grid-cols-2 lg:items-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-700">College-grade</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Biometric lecture attendance{' '}
          <span className="text-brand-600">scaled for real campuses.</span>
        </h1>
        <p className="mt-6 text-lg text-slate-600">
          Register once, authenticate every lecture. Duplicate scans blocked with clear feedback for
          each subject slot.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            to="/login"
            className="inline-flex rounded-2xl bg-brand-600 px-6 py-3 font-semibold text-white shadow-panel transition hover:bg-brand-700"
          >
            Launch console
          </Link>
          <Link
            to="/login"
            className="inline-flex rounded-2xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-800 shadow-panel transition hover:bg-slate-50"
          >
            Student / Faculty login
          </Link>
        </div>
      </div>
      <div className="rounded-3xl bg-white p-8 shadow-panel">
        <h2 className="text-xl font-semibold text-slate-900">Operational guarantees</h2>
        <ul className="mt-6 space-y-4 text-slate-700">
          <li>
            👉 Duplicate scan protection per lecture session with actionable messaging:&nbsp;
            <em>&quot;Scanned for (Subject Name) Lecture&quot;</em>.
          </li>
          <li>Fully modular React + Express + Supabase Postgres deployment path with Vercel-ready API shim.</li>
          <li>Role-based dashboards for faculty ops and streamlined student biometric flow.</li>
        </ul>
      </div>
    </div>
  );
}
