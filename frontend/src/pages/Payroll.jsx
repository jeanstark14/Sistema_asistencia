import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wallet, 
    Calendar, 
    Download, 
    RefreshCcw, 
    Search, 
    Filter,
    ArrowUpRight,
    Users,
    Banknote,
    CheckCircle2,
    Clock,
    FileText,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import client from '../api/client';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { toast } from 'react-hot-toast';

const Payroll = () => {
    const [nominas, setNominas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [periodo, setPeriodo] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    useEffect(() => {
        fetchNominas();
    }, []);

    const fetchNominas = async () => {
        setLoading(true);
        try {
            const response = await client.get('/nomina/recente');
            setNominas(response.data || []);
        } catch (error) {
            console.error('Error fetching nominas:', error);
            toast.error('Error al cargar historial de nóminas');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerar = async () => {
        setGenerating(true);
        try {
            const response = await client.post('/nomina/generar', { periodo });
            toast.success(`Nómina de ${periodo} generada exitosamente`);
            fetchNominas();
        } catch (error) {
            console.error('Error generating payroll:', error);
            const msg = error.response?.data?.error || 'Error al generar la nómina';
            toast.error(msg);
        } finally {
            setGenerating(false);
        }
    };

    const handleDescargarBoleta = async (id, codigo, periodo) => {
        try {
            const response = await client.get(`/nomina/boleta/${id}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Boleta_${periodo}_${codigo}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Error al descargar la boleta');
        }
    };

    const filteredNominas = nominas.filter(n => 
        `${n.nombres} ${n.apellidos} ${n.codigo_interno}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = [
        { label: 'Total Pagado (Mes)', value: `S/ ${nominas.reduce((acc, n) => acc + parseFloat(n.total_pagar), 0).toLocaleString()}`, icon: Banknote, color: 'text-emerald-400' },
        { label: 'Colaboradores', value: Array.from(new Set(nominas.map(n => n.empleado_id))).length, icon: Users, color: 'text-indigo-400' },
        { label: 'Periodo Activo', value: periodo, icon: Calendar, color: 'text-amber-400' },
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Header section with glass effect */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-[0.3em]"
                    >
                        <Wallet size={14} />
                        Gestión Financiera
                    </motion.div>
                    <h1 className="text-4xl lg:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
                        Planilla <span className="text-indigo-500">de Sueldos</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-sm max-w-md">
                        Administre y genere las remuneraciones mensuales de sus colaboradores eficientemente.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-slate-900/50 p-4 rounded-3xl border border-white/5 backdrop-blur-sm shadow-xl">
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1">Periodo a Procesar</label>
                        <input 
                            type="month" 
                            className="bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2 text-white font-black text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            value={periodo}
                            onChange={(e) => setPeriodo(e.target.value)}
                        />
                    </div>
                    <Button 
                        onClick={handleGenerar}
                        isLoading={generating}
                        disabled={generating}
                        className="h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black italic uppercase text-xs tracking-widest shadow-lg shadow-indigo-600/30 group"
                    >
                        <ArrowUpRight size={18} className="mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        Generar Planilla
                    </Button>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <Card className="p-6 bg-slate-900/40 border-white/5 relative overflow-hidden group hover:border-indigo-500/20 transition-all">
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 transform -rotate-12">
                                <stat.icon size={120} />
                            </div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                                    <h3 className={`text-3xl font-black italic tracking-tighter ${stat.color}`}>{stat.value}</h3>
                                </div>
                                <div className={`p-4 rounded-2xl bg-white/5 border border-white/5 ${stat.color}`}>
                                    <stat.icon size={26} />
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Area */}
            <Card className="border-white/5 bg-slate-900/20 backdrop-blur-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por empleado o código..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all placeholder:text-slate-600"
                        />
                    </div>
                    
                    <button 
                        onClick={fetchNominas}
                        className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all font-bold text-xs"
                    >
                        <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                        Actualizar Lista
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-white/5">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Colaborador</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Código</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Periodo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Monto (Neto)</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="px-6 py-5 h-20 bg-white/[0.01]" />
                                    </tr>
                                ))
                            ) : filteredNominas.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-600">
                                            <AlertCircle size={48} className="opacity-20" />
                                            <p className="font-bold italic">No se encontraron registros de nómina</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredNominas.map((n) => (
                                    <tr key={n.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400 font-black text-xs border border-indigo-500/10">
                                                    {n.nombres?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">
                                                        {n.nombres} {n.apellidos}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">DNI: {n.dni}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="font-mono text-xs text-slate-400 font-bold bg-white/5 px-2 py-1 rounded-lg">{n.codigo_interno}</span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex items-center justify-center gap-2 text-slate-300 font-black text-xs">
                                                <Calendar size={14} className="text-indigo-400" />
                                                {n.periodo}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="text-sm font-black text-emerald-400 italic">S/ {parseFloat(n.total_pagar).toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`text-[9px] font-black uppercase tracking-tighter px-3 py-1 rounded-full border
                                                ${n.estado === 'calculado' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}
                                            `}>
                                                {n.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button 
                                                onClick={() => handleDescargarBoleta(n.id, n.codigo_interno, n.periodo)}
                                                title="Descargar Boleta (PDF)"
                                                className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-600 transition-all shadow-lg group/btn"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase hidden group-hover/btn:block">Boleta</span>
                                                    <Download size={18} />
                                                </div>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Additional Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="p-8 border-indigo-500/10 bg-gradient-to-br from-indigo-600/5 to-transparent">
                    <div className="flex items-start gap-4">
                        <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-white italic uppercase tracking-tight">Análisis de Costos</h4>
                            <p className="text-slate-400 text-sm font-medium mt-1">
                                Las remuneraciones han incrementado un 4% respecto al mes anterior debido a horas extras acumuladas por cierre de trimestre.
                            </p>
                            <button className="mt-4 text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-2 transition-colors">
                                Ver reporte completo <ArrowUpRight size={14} />
                            </button>
                        </div>
                    </div>
                </Card>

                <Card className="p-8 border-amber-500/10 bg-gradient-to-br from-amber-600/5 to-transparent">
                    <div className="flex items-start gap-4">
                        <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-white italic uppercase tracking-tight">Pendientes de Cierre</h4>
                            <p className="text-slate-400 text-sm font-medium mt-1">
                                4 colaboradores aún tienen justificaciones pendientes de revisión. Se recomienda revisarlas antes de emitir la planilla final.
                            </p>
                            <button className="mt-4 text-xs font-black text-amber-500 hover:text-amber-400 uppercase tracking-widest flex items-center gap-2 transition-colors">
                                Revisar justificaciones <ArrowUpRight size={14} />
                            </button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Payroll;
