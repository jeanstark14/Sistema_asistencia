import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Clock, 
    RefreshCcw, 
    Calendar, 
    User, 
    MapPin, 
    CheckCircle2, 
    AlertTriangle,
    Sun,
    Moon,
    Eye,
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    Search,
    X,
    Filter
} from 'lucide-react';
import client from '../api/client';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import InputField from '../components/ui/InputField';

const Attendance = () => {
    const formatDateLocal = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({
        inicio: formatDateLocal(new Date()),
        fin: formatDateLocal(new Date())
    });
    const [selectedPeriod, setSelectedPeriod] = useState('hoy');
    const [selectedJustification, setSelectedJustification] = useState(null);
    const [isJustificationModalOpen, setIsJustificationModalOpen] = useState(false);
    const [resolvingId, setResolvingId] = useState(null);

    const TIPO_LABELS = {
        tardanza: 'Tardanza',
        omision_marcacion: 'Omisión de Marcación',
        falta: 'Falta / Inasistencia'
    };

    useEffect(() => {
        fetchLogs();
    }, [dateRange]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await client.get('/biometrico/monitor', {
                params: {
                    fecha_inicio: dateRange.inicio,
                    fecha_fin: dateRange.fin
                }
            });
            setLogs(response.data.data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const resolverJustificacion = async (justificacionId, nuevoEstado) => {
        setResolvingId(justificacionId);
        try {
            await client.put(`/justificaciones/${justificacionId}/resolver`, {
                estado: nuevoEstado,
                comentario_revisor: ''
            });
            setIsJustificationModalOpen(false);
            fetchLogs();
        } catch (err) {
            alert('Error al procesar la justificación');
        } finally {
            setResolvingId(null);
        }
    };

    const handlePeriodChange = (period) => {
        setSelectedPeriod(period);
        const hoy = new Date();
        let inicio = new Date();
        let fin = new Date();

        if (period === 'hoy') {
            inicio = hoy;
            fin = hoy;
        } else if (period === 'semana') {
            const day = hoy.getDay(); 
            const diff = hoy.getDate() - day + (day === 0 ? -6 : 1); // diff is Lunes
            inicio = new Date(hoy.getFullYear(), hoy.getMonth(), diff);
            fin = new Date(hoy.getFullYear(), hoy.getMonth(), diff + 5); // del lunes al sábado
        } else if (period === 'mes') {
            inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        }

        setDateRange({
            inicio: formatDateLocal(inicio),
            fin: formatDateLocal(fin)
        });
    };

    const getFilteredLogs = () => {
        return logs.filter(log => 
            `${log.nombre_empleado} ${log.apellido_empleado}`.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const formatHora = (datetimeStr) => {
        if (!datetimeStr) return '--:--';
        if (datetimeStr.includes('T')) {
            const d = new Date(datetimeStr);
            return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        return datetimeStr.substring(0, 5);
    };

    const filteredLogs = getFilteredLogs();

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Monitor de Asistencia</h1>
                    <p className="text-slate-400 font-bold text-sm">Registro detallado de las asistencias</p>
                </div>
                <button 
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all font-bold group"
                >
                    <RefreshCcw size={18} className="group-active:rotate-180 transition-transform duration-500" />
                    Actualizar
                </button>
            </header>

            <div className="flex flex-col gap-6">
                {/* Period Selectors */}
                <div className="flex flex-wrap gap-2 p-1 bg-slate-900/50 rounded-2xl w-fit border border-white/5">
                    {[
                        { id: 'hoy', label: 'Hoy' },
                        { id: 'semana', label: 'Esta Semana' },
                        { id: 'mes', label: 'Este Mes' },
                        { id: 'personalizado', label: 'Personalizado' }
                    ].map(p => (
                        <button
                            key={p.id}
                            onClick={() => handlePeriodChange(p.id)}
                            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedPeriod === p.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4 bg-slate-900/40 border-white/5 md:col-span-2">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input 
                                type="text" 
                                placeholder="Buscar empleado..." 
                                className="w-full bg-transparent pl-12 pr-4 py-2 text-white focus:outline-none font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </Card>

                    {selectedPeriod === 'personalizado' && (
                        <Card className="p-4 bg-slate-900/40 border-white/5 md:col-span-2 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase">De:</span>
                                <input 
                                    type="date" 
                                    className="bg-slate-950/50 border border-white/5 rounded-lg px-2 py-1 text-xs text-white" 
                                    value={dateRange.inicio}
                                    onChange={e => setDateRange({...dateRange, inicio: e.target.value})}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase">A:</span>
                                <input 
                                    type="date" 
                                    className="bg-slate-950/50 border border-white/5 rounded-lg px-2 py-1 text-xs text-white" 
                                    value={dateRange.fin}
                                    onChange={e => setDateRange({...dateRange, fin: e.target.value})}
                                />
                            </div>
                        </Card>
                    )}

                    {selectedPeriod !== 'personalizado' && (
                        <div className="flex items-center justify-between bg-indigo-600/10 border border-indigo-500/20 rounded-2xl px-6 py-4 md:col-span-2">
                            <span className="text-xs font-bold text-slate-400 italic">
                                {dateRange.inicio.split('-').reverse().join('/')} - {dateRange.fin.split('-').reverse().join('/')}
                            </span>
                            <span className="text-sm font-black text-indigo-400 uppercase tracking-widest">{logs.length} Registros</span>
                        </div>
                    )}
                </div>
            </div>

            <Card className="p-0 overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-900/80 border-b border-white/5">
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empleado</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-emerald-500/5">Asistencia M</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-indigo-500/5">Asistencia T</th>
                                <th className="px-6 py-5 text-[10px] font-black text-amber-500 uppercase tracking-widest text-center">Merienda</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado / Justif.</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-indigo-400 font-black text-xs">
                                                {log.nombre_empleado?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm">
                                                    {log.nombre_empleado} {log.apellido_empleado}
                                                </p>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase">{log.area_nombre || 'General'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 bg-emerald-500/[0.02]">
                                        <div className="flex flex-col gap-1">
                                            {!log.tiene_asistencia ? (
                                                <span className="text-slate-600 font-black text-xs">--:-- → --:--</span>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-black text-xs">{formatHora(log.hora_entrada)}</span>
                                                    <span className="text-slate-500 font-bold text-[10px]">→</span>
                                                    <span className="text-slate-300 font-bold text-xs">{formatHora(log.hora_salida)}</span>
                                                </div>
                                            )}
                                            {(log.minutos_tardanza > 0 || log.estado === 'tardanza') && log.tiene_asistencia && <span className="text-[9px] text-amber-500 font-black uppercase tracking-tighter shadow-sm bg-amber-500/5 px-1.5 py-0.5 rounded italic w-fit">+{log.minutos_tardanza}m tarde</span>}
                                            {log.estado === 'tardanza' && !log.tiene_asistencia && <span className="text-[9px] text-rose-500 font-black uppercase tracking-tighter shadow-sm bg-rose-500/5 px-1.5 py-0.5 rounded italic w-fit">Sin marcar</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 bg-indigo-500/[0.02]">
                                        {!log.tiene_asistencia ? (
                                            <span className="text-slate-600 font-black text-xs">--:-- → --:--</span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-black text-xs">{formatHora(log.hora_entrada_2)}</span>
                                                <span className="text-slate-500 font-bold text-[10px]">→</span>
                                                <span className="text-slate-300 font-bold text-xs">{formatHora(log.hora_salida_2)}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        {log.minutos_merienda > 0 ? (
                                            <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                                                {log.minutos_merienda >= 60 ? `${Math.floor(log.minutos_merienda/60)}h ${log.minutos_merienda%60}m` : `${log.minutos_merienda}m`}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-slate-700 font-black">--</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1.5">
                                            {/* Estado de Asistencia */}
                                            {!log.tiene_asistencia ? (
                                                <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full w-fit ${
                                                    log.estado === 'tardanza' 
                                                        ? 'bg-rose-500/20 text-rose-500' 
                                                        : 'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                    {log.estado === 'tardanza' ? 'Sin marcar' : 'No marcado'}
                                                </span>
                                            ) : (
                                                <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full w-fit ${
                                                    log.minutos_tardanza > 0 || log.estado === 'tardanza' 
                                                        ? 'bg-amber-500/20 text-amber-500' 
                                                        : 'bg-emerald-500/20 text-emerald-400'
                                                }`}>
                                                    {log.minutos_tardanza > 0 || log.estado === 'tardanza' ? 'Tardanza' : 'Correcto'}
                                                </span>
                                            )}
                                            
                                            {/* Estado Justificación */}
                                            {(log.estado_justificacion || log.justificacion?.estado) ? (
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border text-center
                                                    ${log.estado_justificacion === 'aprobada' || log.justificacion?.estado === 'aprobada' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                                      log.estado_justificacion === 'rechazada' || log.justificacion?.estado === 'rechazada' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                                                      'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}
                                                >
                                                    {log.estado_justificacion || log.justificacion?.estado}
                                                </span>
                                            ) : ((log.minutos_tardanza > 0 || log.estado === 'tardanza') && log.tiene_asistencia && (
                                                <span className="text-[8px] text-rose-500 font-black uppercase tracking-widest italic animate-pulse flex items-center gap-1">
                                                    <AlertTriangle size={10} /> Sin Justif.
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button 
                                            onClick={() => {
                                                setSelectedJustification(log);
                                                setIsJustificationModalOpen(true);
                                            }}
                                            className="p-2.5 rounded-xl bg-slate-800 border border-white/5 text-slate-400 hover:text-white hover:bg-indigo-600 transition-all shadow-lg"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal de Justificación */}
            <AnimatePresence>
                {isJustificationModalOpen && selectedJustification && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsJustificationModalOpen(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-lg">
                            <Card className="p-10 border-indigo-500/20 shadow-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-2xl font-black text-white italic uppercase">Detalle de Asistencia</h2>
                                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                                            {new Date(selectedJustification.fecha).toLocaleDateString()} - {selectedJustification.nombre_empleado}
                                        </p>
                                    </div>
                                    <button onClick={() => setIsJustificationModalOpen(false)} className="p-2 rounded-xl bg-slate-800 text-slate-500 hover:text-white transition-all"><X size={20} /></button>
                                </div>
                                
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Turno Mañana</p>
                                            <p className="text-white font-black text-sm">{formatHora(selectedJustification.hora_entrada)} - {formatHora(selectedJustification.hora_salida)}</p>
                                        </div>
                                        <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Turno Tarde</p>
                                            <p className="text-white font-black text-sm">{formatHora(selectedJustification.hora_entrada_2)} - {formatHora(selectedJustification.hora_salida_2)}</p>
                                        </div>
                                    </div>

                                    {selectedJustification.minutos_tardanza > 0 && (
                                        <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                            <div className="flex items-center gap-2 text-amber-500 mb-1">
                                                <AlertTriangle size={16} />
                                                <span className="font-black uppercase text-[10px]">Incidencia Detectada</span>
                                            </div>
                                            <p className="text-amber-200 text-sm font-bold">El colaborador tuvo una tardanza de {selectedJustification.minutos_tardanza} minutos en el ingreso.</p>
                                        </div>
                                    )}

                                    <div className="p-6 bg-slate-950/80 rounded-3xl border border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Justificación</h3>
                                            {selectedJustification.estado_justificacion && (
                                                <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/10 uppercase italic">{selectedJustification.estado_justificacion}</span>
                                            )}
                                        </div>
                                        
                                        {selectedJustification.motivo_justificacion ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase">Tipo:</span>
                                                    <span className="text-[10px] font-black text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 uppercase">
                                                        {TIPO_LABELS[selectedJustification.tipo_justificacion] || selectedJustification.tipo_justificacion}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Motivo del empleado:</p>
                                                    <p className="text-white font-bold text-sm italic">"{selectedJustification.motivo_justificacion}"</p>
                                                </div>
                                                {selectedJustification.comentario_revisor && (
                                                    <div className="pt-3 border-t border-white/5">
                                                        <p className="text-[9px] text-indigo-400/70 font-black uppercase mb-1">Respuesta del Revisor:</p>
                                                        <p className="text-slate-400 font-medium text-xs">"{selectedJustification.comentario_revisor}"</p>
                                                    </div>
                                                )}
                                                {/* Botones Aprobar / Rechazar si está pendiente */}
                                                {selectedJustification.estado_justificacion === 'pendiente' && (
                                                    <div className="flex gap-3 pt-4 border-t border-white/5">
                                                        <button
                                                            disabled={!!resolvingId}
                                                            onClick={() => resolverJustificacion(selectedJustification.justificacion.id, 'aprobada')}
                                                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40"
                                                        >
                                                            ✓ Aprobar
                                                        </button>
                                                        <button
                                                            disabled={!!resolvingId}
                                                            onClick={() => resolverJustificacion(selectedJustification.justificacion.id, 'rechazada')}
                                                            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40"
                                                        >
                                                            ✕ Rechazar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-slate-600 text-sm italic">No hay una justificación registrada para este registro.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <Button className="w-full" onClick={() => setIsJustificationModalOpen(false)}>Cerrar Detalle</Button>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Attendance;