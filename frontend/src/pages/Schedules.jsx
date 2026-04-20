import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Clock, 
    Calendar, 
    Plus, 
    Pencil, 
    Trash2, 
    Save, 
    X, 
    UserPlus,
    Loader2,
    Briefcase,
    Search,
    CheckSquare,
    Square
} from 'lucide-react';
import client from '../api/client';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import InputField from '../components/ui/InputField';

const DAYS = [
    { id: 2, name: 'Lun', full: 'Lunes', order: 1 },
    { id: 3, name: 'Mar', full: 'Martes', order: 2 },
    { id: 4, name: 'Mie', full: 'Miércoles', order: 3 },
    { id: 5, name: 'Jue', full: 'Jueves', order: 4 },
    { id: 6, name: 'Vie', full: 'Viernes', order: 5 },
    { id: 7, name: 'Sab', full: 'Sábado', order: 6 }
];

const Schedules = () => {
    const [schedules, setSchedules] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('turnos'); // 'turnos' o 'empleados'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        nombre_turno: '',
        horas_refrigerio: 1.00,
        estado: 'activo',
        has_refrigerio: true
    });

    const [assignData, setAssignData] = useState({
        empleado_id: '',
        turno_id: '',
        fecha_inicio: new Date().toISOString().split('T')[0],
        usar_personalizado: false,
        hora_inicio: '',
        hora_fin: '',
        horas_refrigerio: 1.00,
        dias_semana: [],
        has_refrigerio: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [schedRes, empRes, assignRes] = await Promise.all([
                client.get('/turnos'),
                client.get('/empleados'),
                client.get('/turnos/asignaciones')
            ]);
            setSchedules(schedRes.data);
            setEmployees(empRes.data);
            setAssignments(assignRes.data);
        } catch (error) {
            console.error('Error fetching schedule data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (schedule = null) => {
        if (schedule) {
            setEditingSchedule(schedule);
            setFormData({
                nombre_turno: schedule.nombre_turno,
                hora_inicio: schedule.hora_inicio,
                hora_fin: schedule.hora_fin,
                horas_refrigerio: schedule.horas_refrigerio,
                estado: schedule.estado || 'activo',
                has_refrigerio: parseFloat(schedule.horas_refrigerio) > 0
            });
        } else {
            setEditingSchedule(null);
            setFormData({ 
                nombre_turno: '', 
                hora_inicio: '', 
                hora_fin: '', 
                horas_refrigerio: 1.00, 
                estado: 'activo',
                has_refrigerio: true 
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSubmit = {
                ...formData,
                horas_refrigerio: formData.has_refrigerio ? formData.horas_refrigerio : 0
            };
            if (editingSchedule) {
                await client.put(`/turnos/${editingSchedule.id}`, dataToSubmit);
            } else {
                await client.post('/turnos', dataToSubmit);
            }
            fetchData();
            setIsModalOpen(false);
        } catch (error) {
            alert('Error al guardar turno');
        }
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSubmit = {
                ...assignData,
                hora_inicio: assignData.usar_personalizado ? assignData.hora_inicio : null,
                hora_fin: assignData.usar_personalizado ? assignData.hora_fin : null,
                horas_refrigerio: assignData.usar_personalizado 
                    ? (assignData.has_refrigerio ? assignData.horas_refrigerio : 0) 
                    : null
            };
            await client.post('/turnos/asignar', dataToSubmit);
            fetchData();
            setIsAssignModalOpen(false);
            setAssignData({
                empleado_id: '',
                turno_id: '',
                fecha_inicio: new Date().toISOString().split('T')[0],
                usar_personalizado: false,
                hora_inicio: '',
                hora_fin: '',
                horas_refrigerio: 1.00,
                dias_semana: [],
                has_refrigerio: true
            });
        } catch (error) {
            alert('Error al asignar turno');
        }
    };

    const handleDeleteAssignment = async (id) => {
        if (!window.confirm('¿Eliminar esta asignación de horario?')) return;
        try {
            await client.delete(`/turnos/asignaciones/${id}`);
            fetchData();
        } catch (error) {
            alert('Error al eliminar asignación');
        }
    };

    const handleDeleteSchedule = async (id) => {
        if (!window.confirm('¿Eliminar este turno? Esta acción no se puede deshacer.')) return;
        try {
            await client.delete(`/turnos/${id}`);
            fetchData();
        } catch (error) {
            alert('Error al eliminar turno');
        }
    };

    const toggleDay = (dayId) => {
        setAssignData(prev => ({
            ...prev,
            dias_semana: prev.dias_semana.includes(dayId)
                ? prev.dias_semana.filter(id => id !== dayId)
                : [...prev.dias_semana, dayId]
        }));
    };

    const togglePersonalized = () => {
        const isTurningOn = !assignData.usar_personalizado;
        let updates = { usar_personalizado: isTurningOn };

        if (isTurningOn && assignData.turno_id) {
            const baseShift = schedules.find(s => s.id === parseInt(assignData.turno_id));
            if (baseShift) {
                updates.hora_inicio = baseShift.hora_inicio;
                updates.hora_fin = baseShift.hora_fin;
                updates.horas_refrigerio = baseShift.horas_refrigerio;
                updates.has_refrigerio = parseFloat(baseShift.horas_refrigerio) > 0;
            }
        }
        
        setAssignData(prev => ({ ...prev, ...updates }));
    };

    const filteredAssignments = assignments.filter(a => 
        `${a.nombres} ${a.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        const nameA = `${a.apellidos} ${a.nombres}`.toLowerCase();
        const nameB = `${b.apellidos} ${b.nombres}`.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        
        const dayA = a.dia_semana === null ? 8 : (DAYS.find(d => d.id === a.dia_semana)?.order || 9);
        const dayB = b.dia_semana === null ? 8 : (DAYS.find(d => d.id === b.dia_semana)?.order || 9);
        return dayA - dayB;
    });

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Gestión de Horarios</h1>
                    <p className="text-slate-400 font-bold text-sm">Configura turnos generales o personaliza el horario de cada colaborador</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="secondary" onClick={() => setIsAssignModalOpen(true)}>
                        <UserPlus size={20} />
                        Asignar Horario
                    </Button>
                    <Button onClick={() => handleOpenModal()}>
                        <Plus size={20} />
                        Nuevo Turno Base
                    </Button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-900/50 rounded-2xl w-fit border border-white/5">
                <button 
                    onClick={() => setActiveTab('turnos')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'turnos' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Turnos Generales
                </button>
                <button 
                    onClick={() => setActiveTab('empleados')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'empleados' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Horarios por Empleado
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                </div>
            ) : activeTab === 'turnos' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {schedules.map((s) => (
                        <Card key={s.id} className="p-6 group relative overflow-hidden">
                            <div className="flex items-start justify-between mb-6">
                                <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    <Clock size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(s)} className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteSchedule(s.id)} className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-white italic mb-4">{s.nombre_turno}</h3>
                            <div className="space-y-3 mb-8">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Entrada</span>
                                    <span className="text-white font-black">{s.hora_inicio?.substring(0,5)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Salida</span>
                                    <span className="text-white font-black">{s.hora_fin?.substring(0,5)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Refrigerio</span>
                                    <span className="text-indigo-400 font-black">{s.horas_refrigerio} Hr</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="space-y-6">
                    <Card className="p-4 bg-slate-900/40 border-white/5">
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

                    <Card className="p-0 overflow-hidden border-white/5">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-900/80 border-b border-white/5">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Empleado</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Días</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Turno Base</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Horario</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {filteredAssignments.map((a) => (
                                    <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-5 font-bold text-white italic">{a.nombres} {a.apellidos}</td>
                                        <td className="px-8 py-5">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase ${a.dia_semana ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                                                {a.dia_semana ? DAYS.find(d => d.id === a.dia_semana)?.name : 'Todos'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-slate-400 text-sm font-bold">{a.nombre_turno}</td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-white px-2 py-1 bg-indigo-500/20 rounded border border-indigo-500/20">
                                                    {(a.custom_inicio || a.default_inicio).substring(0,5)} - {(a.custom_fin || a.default_fin).substring(0,5)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <button 
                                                onClick={() => handleDeleteAssignment(a.id)}
                                                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}

            {/* Modal Turno */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-lg">
                            <Card className="p-10">
                                <h2 className="text-2xl font-black text-white italic uppercase mb-8">Definir Turno</h2>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <InputField label="Nombre del Turno" value={formData.nombre_turno} onChange={e => setFormData({...formData, nombre_turno: e.target.value})} required placeholder="Ej. Turno Mañana" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="Hora Inicio" type="time" value={formData.hora_inicio} onChange={e => setFormData({...formData, hora_inicio: e.target.value})} required />
                                        <InputField label="Hora Fin" type="time" value={formData.hora_fin} onChange={e => setFormData({...formData, hora_fin: e.target.value})} required />
                                    </div>
                                    <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${formData.has_refrigerio ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                                                    <Clock size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-white font-black italic uppercase text-[10px]">¿Incluye Refrigerio?</p>
                                                </div>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({...formData, has_refrigerio: !formData.has_refrigerio})}
                                                className={`w-10 h-6 rounded-full relative transition-all duration-300 ${formData.has_refrigerio ? 'bg-indigo-600' : 'bg-slate-800'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${formData.has_refrigerio ? 'left-5' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {formData.has_refrigerio && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                                <InputField label="Horas de Refrigerio" type="number" step="0.5" value={formData.horas_refrigerio} onChange={e => setFormData({...formData, horas_refrigerio: e.target.value})} required={formData.has_refrigerio} />
                                            </motion.div>
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-4 pt-4">
                                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                        <Button type="submit">Guardar Turno</Button>
                                    </div>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Asignación / Personalización */}
            <AnimatePresence>
                {isAssignModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsAssignModalOpen(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-2xl px-4">
                            <Card className="p-8 md:p-12 overflow-y-auto max-h-[90vh]">
                                <h2 className="text-3xl font-black text-white italic uppercase mb-2">Asignar Horario</h2>
                                <p className="text-slate-500 font-bold text-sm mb-10">Vincula un empleado a un turno y personaliza sus horas si es necesario</p>
                                
                                <form onSubmit={handleAssignSubmit} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Empleado</label>
                                            <select className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold text-sm" value={assignData.empleado_id} onChange={e => setAssignData({...assignData, empleado_id: e.target.value})} required>
                                                <option value="">Elegir colaborador...</option>
                                                {employees.map(e => <option key={e.id} value={e.id}>{e.nombres} {e.apellidos}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Turno Base</label>
                                            <select className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold text-sm" value={assignData.turno_id} onChange={e => setAssignData({...assignData, turno_id: e.target.value})} required>
                                                <option value="">Elegir turno...</option>
                                                {schedules.map(s => <option key={s.id} value={s.id}>{s.nombre_turno}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Días de la Semana</label>
                                        <div className="flex flex-wrap gap-2">
                                            {DAYS.map(day => (
                                                <button
                                                    key={day.id}
                                                    type="button"
                                                    onClick={() => toggleDay(day.id)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all border ${assignData.dias_semana.includes(day.id) 
                                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' 
                                                        : 'bg-slate-950/50 text-slate-500 border-white/5 hover:border-white/10'}`}
                                                >
                                                    {day.full}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-slate-500 italic pl-1">* Si no seleccionas ningún día, se aplicará a toda la semana por defecto.</p>
                                    </div>

                                    <div className="p-6 bg-indigo-500/5 rounded-[2rem] border border-indigo-500/10 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${assignData.usar_personalizado ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                                                    <Clock size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white italic uppercase">¿Horario Personalizado?</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Activa para ignorar las horas del turno base</p>
                                                </div>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={togglePersonalized}
                                                className={`w-14 h-8 rounded-full relative transition-all duration-300 ${assignData.usar_personalizado ? 'bg-indigo-600' : 'bg-slate-800'}`}
                                            >
                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${assignData.usar_personalizado ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {!assignData.usar_personalizado && assignData.turno_id && (
                                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 bg-slate-900/50 p-3 rounded-xl border border-white/5 italic">
                                                <span>✓ Usando horario base:</span>
                                                {(() => {
                                                    const s = schedules.find(sh => sh.id === parseInt(assignData.turno_id));
                                                    return s ? (
                                                        <span className="text-indigo-400">
                                                            {s.hora_inicio.substring(0,5)} - {s.hora_fin.substring(0,5)} 
                                                            {parseFloat(s.horas_refrigerio) > 0 ? ` (${s.horas_refrigerio}hr refrig.)` : ' (Sin refrig.)'}
                                                        </span>
                                                    ) : null;
                                                })()}
                                            </div>
                                        )}

                                        {assignData.usar_personalizado && (
                                            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                                                <InputField label="Hora Inicio" type="time" value={assignData.hora_inicio} onChange={e => setAssignData({...assignData, hora_inicio: e.target.value})} required={assignData.usar_personalizado} />
                                                <InputField label="Hora Fin" type="time" value={assignData.hora_fin} onChange={e => setAssignData({...assignData, hora_fin: e.target.value})} required={assignData.usar_personalizado} />
                                                
                                                <div className="pt-2 md:col-span-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase">¿Refrigerio?</span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setAssignData({...assignData, has_refrigerio: !assignData.has_refrigerio})}
                                                            className={`w-8 h-5 rounded-full relative transition-all ${assignData.has_refrigerio ? 'bg-indigo-600' : 'bg-slate-800'}`}
                                                        >
                                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${assignData.has_refrigerio ? 'left-3.5' : 'left-0.5'}`} />
                                                        </button>
                                                    </div>
                                                    {assignData.has_refrigerio && (
                                                        <InputField label="Hrs" type="number" step="0.5" value={assignData.horas_refrigerio} onChange={e => setAssignData({...assignData, horas_refrigerio: e.target.value})} required={assignData.has_refrigerio && assignData.usar_personalizado} />
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-4 pt-4">
                                        <Button type="button" variant="secondary" onClick={() => setIsAssignModalOpen(false)}>Cancelar</Button>
                                        <Button type="submit">Guardar Asignación</Button>
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

export default Schedules;
