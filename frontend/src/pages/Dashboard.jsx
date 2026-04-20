import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { 
  Users, 
  Clock, 
  Activity, 
  Building2, 
  ArrowUpRight, 
  TrendingUp,
  AlertTriangle,
  UserCheck,
  UserMinus,
  FileText,
  Radio,
  Wifi,
  WifiOff
} from 'lucide-react';
import client from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';

const iconMap = {
    Users: Users,
    Clock: Clock,
    UserMinus: UserMinus,
    FileText: FileText
};

// Estilos y etiquetas según tipo de marcación
const getMarcacionStyle = (tipo) => {
    switch ((tipo || '').toLowerCase()) {
        case 'entrada':
            return { label: 'Entrada', avatarCls: 'bg-emerald-500/10 text-emerald-500', badgeCls: 'bg-emerald-500/20 text-emerald-400' };
        case 'salida':
            return { label: 'Salida',  avatarCls: 'bg-rose-500/10 text-rose-500',    badgeCls: 'bg-rose-500/20 text-rose-400'    };
        case 'entrada2':
            return { label: 'Entrada T.', avatarCls: 'bg-sky-500/10 text-sky-400',    badgeCls: 'bg-sky-500/20 text-sky-300'       };
        case 'salida2':
            return { label: 'Salida T.',  avatarCls: 'bg-orange-500/10 text-orange-400', badgeCls: 'bg-orange-500/20 text-orange-300' };
        default:
            return { label: tipo || '?', avatarCls: 'bg-slate-700 text-slate-400',    badgeCls: 'bg-slate-700 text-slate-400'     };
    }
};

const StatCard = ({ label, value, icon: IconName, color, index }) => {
    const Icon = iconMap[IconName] || Activity;
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card className="p-0 overflow-hidden group border-white/5 bg-slate-900/50 backdrop-blur-xl">
                <div className="p-6 flex items-start justify-between">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                        <h3 className="text-3xl font-black text-white italic">{value}</h3>
                    </div>
                    <div className={`p-4 rounded-2xl bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-${color}-500/5`}>
                        <Icon size={24} />
                    </div>
                </div>
                <div className={`h-1 w-full bg-gradient-to-r from-transparent via-${color}-500/40 to-transparent opacity-30 group-hover:opacity-100 transition-opacity`} />
            </Card>
        </motion.div>
    );
};

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const response = await client.get('/dashboard/stats');
            setData(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Refresh every 5 seconds for "real-time" feel
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-indigo-400 font-black text-sm uppercase tracking-widest animate-pulse">Sincronizando Métricas...</p>
            </div>
        );
    }

    if (!data || data.error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
                <div className="p-4 rounded-full bg-rose-500/10 text-rose-500 mb-4">
                    <AlertTriangle size={48} />
                </div>
                <h2 className="text-2xl font-black text-white uppercase italic">Error de Conexión</h2>
                <p className="text-slate-400 font-bold max-w-md">
                    {data?.error || "No se pudieron obtener las métricas del sistema. Reintenta en unos momentos."}
                </p>
                <button 
                    onClick={() => { setLoading(true); fetchStats(); }}
                    className="mt-6 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    const stats = data.stats || [];
    const recentActivity = data.recentActivity || [];
    const dispositivos = data.dispositivos || [];

    return (
        <div className="space-y-8 pb-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
                        Dashboard
                    </h1>
                    <p className="text-slate-400 font-bold text-sm mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Monitoreo en tiempo real del sistema
                    </p>
                </motion.div>
                
                <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-white/5">
                    <span className="px-3 py-1 text-[10px] font-black text-slate-500 uppercase">Hoy: {new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <StatCard 
                        key={stat.label}
                        index={i}
                        label={stat.label}
                        value={stat.value}
                        icon={stat.icon}
                        color={stat.type === 'primary' ? 'indigo' : stat.type === 'accent' ? 'emerald' : stat.type === 'warning' ? 'rose' : 'cyan'} 
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Actividad Reciente */}
                <Card className="lg:col-span-2 p-8 bg-slate-900/40 border-white/5 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Activity className="text-indigo-500" />
                            Marcaciones Recientes
                        </h2>
                        <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors border-b border-indigo-500/20 pb-1">
                            Historial Completo
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((log, i) => (
                                    <motion.div 
                                        key={log.fecha_hora + log.nombres + i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                                    >
                                        {(() => {
                                            const style = getMarcacionStyle(log.tipo_marcacion);
                                            return (
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${style.avatarCls}`}>
                                                        {log.nombres[0]}{log.apellidos[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{log.nombres} {log.apellidos}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase ${style.badgeCls}`}>
                                                                {style.label}
                                                            </span>
                                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                                                                {new Date(log.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })} • {log.dispositivo}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <ArrowUpRight className="text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" size={18} />
                                    </motion.div>
                                ))
                            ) : (
                                <div className="py-12 text-center">
                                    <Clock className="mx-auto text-slate-700 mb-4" size={48} />
                                    <p className="text-slate-500 font-bold italic uppercase tracking-widest text-xs">No hay actividad hoy</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </Card>

                {/* Estado de Biométricos */}
                <div className="space-y-6">
                    <Card className="p-8 bg-slate-900/40 border-white/5 backdrop-blur-md h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                <Radio className="text-indigo-500 animate-pulse" />
                                Nodos Biométricos
                            </h2>
                        </div>
                        
                        <div className="space-y-6">
                            {dispositivos.length > 0 ? (
                                dispositivos.map((dis, i) => (
                                    <div key={dis.nombre} className="relative group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dis.online ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-600'}`}>
                                                    {dis.online ? <Wifi size={20} /> : <WifiOff size={20} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-200">{dis.nombre}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{dis.ubicacion || 'Sin Ubicación'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${dis.online ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                                                    {dis.online ? 'En Línea' : 'Desconectado'}
                                                </span>
                                                <p className="text-[8px] text-slate-600 font-bold mt-1 uppercase">
                                                    ID: {dis.device_uid || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-3xl">
                                    <p className="text-slate-600 text-xs font-bold uppercase italic">Sin dispositivos registrados</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-12 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                            <div className="flex items-center gap-3 text-indigo-400 mb-2">
                                <AlertTriangle size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Aviso del Sistema</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                El estado de los dispositivos se actualiza cada vez que recibimos un 'heartbeat' o marcación activa.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

