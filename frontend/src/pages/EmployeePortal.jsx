import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Clock, 
    Calendar, 
    AlertTriangle, 
    MessageSquarePlus,
    X,
    Save,
    CheckCircle2
} from 'lucide-react';
import client from '../api/client';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const EmployeePortal = () => {
    const [asistencias, setAsistencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [justificacionTipo, setJustificacionTipo] = useState('tardanza');
    const [motivo, setMotivo] = useState('');

    useEffect(() => {
        fetchAsistencias();
    }, []);

    const fetchAsistencias = async () => {
        setLoading(true);
        try {
            const response = await client.get('/justificaciones/mis-asistencias');
            setAsistencias(response.data);
        } catch (error) {
            console.error('Error fetching asistencias:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (fecha, tipo = 'tardanza') => {
        setSelectedDate(fecha);
        setJustificacionTipo(tipo);
        setMotivo('');
        setIsModalOpen(true);
    };

    const handleSubmitJustificacion = async (e) => {
        e.preventDefault();
        try {
            const response = await client.post('/justificaciones', {
                fecha_referencia: selectedDate,
                tipo: justificacionTipo,
                motivo: motivo
            });
            alert(response.data.message || 'Justificación enviada correctamente');
            setIsModalOpen(false);
            fetchAsistencias();
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Error al enviar justificación';
            alert(errorMsg);
        }
    };

    const formatHora = (datetimeStr) => {
        if (!datetimeStr) return null;
        // Handle both "HH:MM:SS" and full ISO datetime strings
        if (datetimeStr.includes('T')) {
            const d = new Date(datetimeStr);
            return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        // Already a time string like "08:30:00"
        return datetimeStr.substring(0, 5);
    };

    const formatFecha = (fechaStr) => {
        if (!fechaStr) return '';
        // fechaStr can be "2026-03-17" or a full ISO string
        const raw = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr;
        const [y, m, d] = raw.split('-');
        return `${d}/${m}/${y}`;
    };

    const getStatusColor = (minutos_tardanza) => {
        if (minutos_tardanza > 0) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Mi Asistencia</h1>
                    <p className="text-slate-400 font-bold text-sm">Visualiza tus registros y solicita justificaciones</p>
                </div>
                <Button 
                    onClick={() => handleOpenModal(new Date().toISOString().split('T')[0], 'omision_marcacion')} 
                    className="px-8 py-4 uppercase tracking-[0.2em]"
                >
                    <MessageSquarePlus size={20} />
                    Justificar Omisión
                </Button>
            </header>

            <Card className="p-0 overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/80 border-b border-white/5">
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Fecha</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-emerald-500/5">Entrada (M)</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-emerald-500/5">Salida (M)</th>
                                <th className="px-6 py-5 text-[10px] font-black text-amber-500 uppercase tracking-widest text-center">Merienda</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-indigo-500/5">Entrada (T)</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-indigo-500/5">Salida (T)</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Justificación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-20 text-indigo-400 font-bold animate-pulse">Cargando historial...</td>
                                </tr>
                            ) : asistencias.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-20 text-slate-500 font-bold">No hay registros de asistencia recientes.</td>
                                </tr>
                            ) : (
                                asistencias.map((registro) => (
                                    <tr key={registro.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-black text-white italic tracking-tight">{formatFecha(registro.fecha)}</span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase">{new Date(registro.fecha).toLocaleDateString('es-ES', { weekday: 'long' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 bg-emerald-500/[0.02]">
                                            <div className="flex flex-col">
                                                <span className="text-white font-black text-sm">{formatHora(registro.hora_entrada)}</span>
                                                {registro.minutos_tardanza > 0 && <span className="text-[8px] text-amber-500 font-black uppercase">+{registro.minutos_tardanza}m tarde</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 bg-emerald-500/[0.02]">
                                            <span className="text-slate-300 font-bold text-sm">{formatHora(registro.hora_salida)}</span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {registro.minutos_merienda > 0 ? (
                                                <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                                                    {registro.minutos_merienda}m
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-700 font-black">--</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 bg-indigo-500/[0.02]">
                                            <span className="text-white font-black text-sm">{formatHora(registro.hora_entrada_2)}</span>
                                        </td>
                                        <td className="px-6 py-5 bg-indigo-500/[0.02]">
                                            <span className="text-slate-300 font-bold text-sm">{formatHora(registro.hora_salida_2)}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            {registro.estado_justificacion ? (
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border
                                                    ${registro.estado_justificacion === 'aprobada' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                                      registro.estado_justificacion === 'rechazada' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                                                      'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}
                                                >
                                                    {registro.estado_justificacion}
                                                </span>
                                            ) : (registro.minutos_tardanza > 0 || !registro.hora_entrada || !registro.hora_salida) ? (
                                                <button 
                                                    onClick={() => handleOpenModal(registro.fecha, registro.minutos_tardanza > 0 ? 'tardanza' : 'omision_marcacion')}
                                                    className="text-[10px] font-black text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500 px-3 py-1.5 rounded-full border border-indigo-500/20 transition-all uppercase tracking-widest"
                                                >
                                                    Justificar
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2 text-emerald-500/40">
                                                    <CheckCircle2 size={12} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Al Día</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal de Justificación */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg"
                        >
                            <Card className="p-10">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                        Enviar Justificación
                                    </h2>
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmitJustificacion} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Fecha a Justificar</label>
                                        <input 
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-bold"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Tipo de Evento</label>
                                        <select 
                                            value={justificacionTipo}
                                            onChange={(e) => setJustificacionTipo(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-bold"
                                        >
                                            <option value="tardanza">Tardanza</option>
                                            <option value="omision_marcacion">Omisión de Marcación (Entrada/Salida vacía)</option>
                                            <option value="falta">Falta por Inasistencia</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Detalle / Motivo</label>
                                        <textarea 
                                            value={motivo}
                                            onChange={(e) => setMotivo(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all min-h-[120px]"
                                            placeholder="Explique el motivo corto de la incidencia..."
                                            required
                                        />
                                    </div>

                                    <div className="flex justify-end gap-4 pt-4">
                                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="px-8">
                                            Cancelar
                                        </Button>
                                        <Button type="submit" className="px-10">
                                            <Save size={20} />
                                            Enviar a Revisión
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EmployeePortal;
