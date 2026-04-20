import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Clock, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck,
  UserCog,
  Calendar,
  Wallet
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const baseNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/employee-portal', icon: Clock, label: 'Mi Portal', roles: ['empleado', 'practicante', 'monitor'] },
    { path: '/employees', icon: Users, label: 'Empleados', roles: ['admin', 'administrador', 'moderador'] },
    { path: '/organization', icon: Building2, label: 'Organización', roles: ['admin', 'administrador', 'moderador'] },
    { path: '/attendance', icon: Clock, label: 'Monitor Asistencia', roles: ['admin', 'administrador', 'moderador', 'monitor'] },
    { path: '/schedules', icon: Calendar, label: 'Gestión de Horarios', roles: ['admin', 'administrador'] },
    { path: '/users', icon: UserCog, label: 'Usuarios', roles: ['admin', 'administrador'] },
    { path: '/payroll', icon: Wallet, label: 'Planilla de Sueldos', roles: ['admin', 'administrador'] },
    { path: '/settings', icon: Settings, label: 'Configuración', roles: ['admin', 'administrador'] },
  ];

  const userRol = user?.rol?.toLowerCase() || 'empleado';
  const isAdmin = userRol === 'admin' || userRol === 'administrador';
  
  const navItems = baseNavItems.filter(item => {
    if (isAdmin) return true; // El admin ve todo
    if (!item.roles) return true; // Items sin roles definidos son públicos para autenticados
    return item.roles.includes(userRol);
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="relative z-20 flex flex-col bg-slate-900 border-r border-white/5 shadow-2xl"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center p-1 bg-white/5 border border-white/10">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          {isSidebarOpen && (
            <motion.span 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="font-black text-xl tracking-tighter text-white"
            >
              SISTEMA TID
            </motion.span>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                  isActive 
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-inner' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={22} className={isActive ? 'text-indigo-400' : 'group-hover:scale-110 transition-transform'} />
                {isSidebarOpen && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-sm">
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors group"
          >
            <LogOut size={22} className="group-hover:rotate-12 transition-transform" />
            {isSidebarOpen && <span className="font-bold text-sm">Cerrar Sesión</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md border-b border-white/5">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all shadow-lg"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-white">{user?.nombre || 'Administrador'}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{user?.rol || 'Super Admin'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-indigo-400 font-black shadow-inner">
              {user?.nombre?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminLayout;
