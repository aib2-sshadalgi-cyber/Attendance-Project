import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Tab({ to, end, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
        }`
      }
      end={!!end}
    >
      {children}
    </NavLink>
  );
}

export function Shell({ variant }) {
  const { user, logout } = useAuth();
  const nav =
    variant === 'admin'
      ? [
          { to: '/admin', label: 'Overview', end: true },
          { to: '/admin/students', label: 'Students' },
          { to: '/admin/subjects', label: 'Subjects' },
          { to: '/admin/lectures', label: 'Lectures' },
          { to: '/admin/attendance', label: 'Records' },
        ]
      : [
          { to: '/student', label: 'Dashboard', end: true },
          { to: '/student/attendance', label: 'Attendance' },
          { to: '/student/scan', label: 'Scan' },
        ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 pb-14">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-xs font-bold text-white">
              CA
            </div>
            <div className="leading-tight">
              <p className="text-xs uppercase tracking-wide text-slate-500">Campus</p>
              <p className="font-semibold text-slate-900">Attendance Desk</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">{user?.email}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-brand-900">
              {variant}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 pb-3">

          {nav.map((item) => (
            <Tab key={item.to} to={item.to} end={item.end}>
              {item.label}
            </Tab>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Outlet />
      </main>
      <footer className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/90 py-3 text-center text-xs text-slate-500 backdrop-blur">
        Face biometric • One scan per lecture • Built for scalable campus deployment
      </footer>
    </div>
  );
}
