import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Organization from './pages/Organization';
import Attendance from './pages/Attendance';
import Settings from './pages/Settings';
import Schedules from './pages/Schedules';
import Users from './pages/Users';
import EmployeePortal from './pages/EmployeePortal';
import AdminLayout from './components/layout/AdminLayout';
import Payroll from './pages/Payroll';


const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="employee-portal" element={<EmployeePortal />} />
            <Route path="employees" element={<Employees />} />
            <Route path="organization" element={<Organization />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="users" element={<Users />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
