import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Settings as SettingsIcon, 
    Cpu, 
    Clock, 
    Calendar,
    ShieldCheck, 
    Save, 
    Plus,
    Trash2,
    Activity,
    Loader2,
    AlertCircle
} from 'lucide-react';
import client from '../api/client';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import InputField from '../components/ui/InputField';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('parameters');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // States for different sections
    const [config, setConfig] = useState({});
    const [devices, setDevices] = useState([]);
    const [holidays, setHolidays] = useState([]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const [configRes, deviceRes, holidayRes] = await Promise.all([
                client.get('/configuraciones'),
                client.get('/dispositivos'),
                client.get('/feriados')
            ]);
            
            // Transform config array to object
            const configObj = {};
            configRes.data.forEach(item => {
                configObj[item.clave] = item.valor;
            });
            
            setConfig(configObj);
            setDevices(deviceRes.data);
            setHolidays(holidayRes.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const configArray = Object.entries(config).map(([clave, valor]) => ({ clave, valor }));
            await client.put('/configuraciones', { configuraciones: configArray });
            alert('Configuración guardada correctamente');
        } catch (error) {
            alert('Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    };


    const handleAddDevice = async () => {
        const nombre = prompt('Nombre del dispositivo:');
        const ip = prompt('Dirección IP (opcional):');
        if (nombre) {
            try {
                await client.post('/dispositivos', { nombre, ip, estado: 'activo' });
                fetchSettings();
            } catch (error) {
                alert('Error al agregar dispositivo');
            }
        }
    };

    const handleDeleteDevice = async (id) => {
        if (window.confirm('¿Eliminar dispositivo?')) {
            try {
                await client.delete(`/dispositivos/${id}`);
                fetchSettings();
            } catch (error) {
                alert('Error al eliminar');
            }
        }
    };

    const handleAddHoliday = async () => {
        const fecha = prompt('Fecha (YYYY-MM-DD):');
        const descripcion = prompt('Motivo / Festividad:');
        if (fecha && descripcion) {
            try {
                await client.post('/feriados', { fecha, descripcion });
                fetchSettings();
            } catch (error) {
                alert('Error al agregar feriado');
            }
        }
    };

    if (loading) return <div className="p-8 text-indigo-400 font-bold animate-pulse">Cargando configuración del sistema...</div>;

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Configuración</h1>
                    <p className="text-slate-400 font-bold text-sm">Parámetros técnicos y reglas de negocio del sistema</p>
                </div>
                <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 overflow-x-auto max-w-full">
                    {[
                        { id: 'parameters', label: 'Parámetros', icon: SettingsIcon },
                        { id: 'devices', label: 'Biométricos', icon: Cpu },
                        { id: 'holidays', label: 'Feriados', icon: Calendar }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            <AnimatePresence mode="wait">
                {activeTab === 'parameters' && (
                    <motion.div key="params" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <Card className="p-10 max-w-4xl">
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tight mb-8 flex items-center gap-3">
                                <Clock className="text-indigo-500" />
                                Parámetros Laborales
                            </h2>
                            <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                <InputField label="Hora Inicio Jornada" type="time" value={config.hora_inicio || ''} onChange={e => setConfig({...config, hora_inicio: e.target.value})} />
                                <InputField label="Hora Fin Jornada" type="time" value={config.hora_fin || ''} onChange={e => setConfig({...config, hora_fin: e.target.value})} />
                                <InputField label="Tolerancia (Minutos)" type="number" value={config.tolerancia_minutos || ''} onChange={e => setConfig({...config, tolerancia_minutos: e.target.value})} />
                                <InputField label="Factor Extra Diurna" type="number" step="0.01" value={config.factor_extra_diurna || ''} onChange={e => setConfig({...config, factor_extra_diurna: e.target.value})} />
                                <InputField label="Factor Extra Nocturna" type="number" step="0.01" value={config.factor_extra_nocturna || ''} onChange={e => setConfig({...config, factor_extra_nocturna: e.target.value})} />
                                
                                <div className="md:col-span-2 pt-6 flex justify-end">
                                    <Button type="submit" className="px-12 py-4" disabled={saving}>
                                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                        Guardar Parámetros
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </motion.div>
                )}

                {activeTab === 'devices' && (
                    <motion.div key="devices" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                        <div className="flex justify-end">
                            <Button onClick={handleAddDevice} variant="secondary"><Plus size={18} /> Registrar Dispositivo</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {devices.map(device => (
                                <Card key={device.id} className="p-6 group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 rounded-2xl bg-slate-800 text-indigo-400">
                                            <Cpu size={24} />
                                        </div>
                                        <button onClick={() => handleDeleteDevice(device.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <h3 className="font-black text-lg text-white mb-1 uppercase tracking-tight">{device.nombre}</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">IP: {device.ip || 'DHCP Dynamic'}</p>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${device.estado === 'activo' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-600'}`} />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{device.estado}</span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'holidays' && (
                    <motion.div key="holidays" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                        <div className="flex justify-end">
                            <Button onClick={handleAddHoliday} variant="secondary"><Plus size={18} /> Agregar Feriado</Button>
                        </div>
                        <Card className="p-0 overflow-hidden border-white/5">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900 border-b border-white/5">
                                    <tr>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descripción / Motivo</th>
                                        <th className="px-8 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02]">
                                    {holidays.map(h => (
                                        <tr key={h.id} className="hover:bg-white/[0.01]">
                                            <td className="px-8 py-4 font-black text-indigo-400 text-sm">
                                                {new Date(h.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}
                                            </td>
                                            <td className="px-8 py-4 text-sm font-bold text-slate-300">{h.descripcion}</td>
                                            <td className="px-8 py-4 text-right">
                                                <button onClick={() => client.delete(`/feriados/${h.id}`).then(fetchSettings)} className="p-2 text-slate-700 hover:text-rose-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <footer className="mt-12 p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-4">
                <ShieldCheck className="text-indigo-500" size={24} />
                <p className="text-xs font-bold text-slate-400">
                    <span className="text-indigo-400">Nota de Seguridad:</span> Cualquier cambio en los parámetros afectará retroactivamente a los cálculos de nómina pendientes de cierre.
                </p>
            </footer>
        </div>
    );
};

export default Settings;
