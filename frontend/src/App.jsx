import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Landing from './pages/Landing';
import { useAuth } from './context/AuthContext';
import { Shell } from './components/Shell';
import AdminHome from './pages/admin/AdminHome';
import Students from './pages/admin/Students';
import Subjects from './pages/admin/Subjects';
import Lectures from './pages/admin/Lectures';
import Monitor from './pages/admin/Monitor';
import AttendanceRecords from './pages/admin/AttendanceRecords';
import StudentDashboard from './pages/student/Dashboard';
import AttendanceHistory from './pages/student/AttendanceHistory';
import ScanAttendance from './pages/student/Scan';

function Protect({ roles, element }) {
  const { loading, user } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Securing dashboard…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles.length && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return element;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin/*"
        element={<Protect roles={['admin']} element={<Shell variant="admin" />} />}
      >
        <Route index element={<AdminHome />} />
        <Route path="students" element={<Students />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="lectures" element={<Lectures />} />
        <Route path="attendance" element={<AttendanceRecords />} />
        <Route path="monitor/:lectureId" element={<Monitor />} />
      </Route>
      <Route
        path="/student/*"
        element={<Protect roles={['student']} element={<Shell variant="student" />} />}
      >
        <Route index element={<StudentDashboard />} />
        <Route path="attendance" element={<AttendanceHistory />} />
        <Route path="scan" element={<ScanAttendance />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
