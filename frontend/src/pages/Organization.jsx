import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Briefcase, 
    Building2, 
    Plus, 
    Pencil, 
    Trash2, 
    Save, 
    X,
    Loader2
} from 'lucide-react';
import client from '../api/client';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import InputField from '../components/ui/InputField';

const Organization = () => {
    const [areas, setAreas] = useState([]);
    const [cargos, setCargos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('areas');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', descripcion: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [areaRes, cargoRes] = await Promise.all([
                client.get('/areas'),
                client.get('/cargos')
            ]);
            setAreas(areaRes.data);
            setCargos(cargoRes.data);
        } catch (error) {
            console.error('Error fetching organization data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({ nombre: item.nombre, descripcion: item.descripcion || '' });
        } else {
            setEditingItem(null);
            setFormData({ nombre: '', descripcion: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoint = activeTab === 'areas' ? '/areas' : '/cargos';
            if (editingItem) {
                await client.put(`${endpoint}/${editingItem.id}`, formData);
            } else {
                await client.post(endpoint, formData);
            }
            fetchData();
            setIsModalOpen(false);
        } catch (error) {
            alert('Error al guardar');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro? Esta acción no se puede deshacer.')) {
            try {
                const endpoint = activeTab === 'areas' ? '/areas' : '/cargos';
                await client.delete(`${endpoint}/${id}`);
                fetchData();
            } catch (error) {
                alert('Error al eliminar. Verifique que no haya empleados asociados.');
            }
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Estructura Organizativa</h1>
                    <p className="text-slate-400 font-bold text-sm">Gestiona los departamentos y puestos de trabajo</p>
                </div>
                <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                    <button 
                        onClick={() => setActiveTab('areas')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'areas' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Áreas
                    </button>
                    <button 
                        onClick={() => setActiveTab('cargos')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'cargos' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Cargos
                    </button>
                </div>
            </header>

            <div className="flex justify-end">
                <Button onClick={() => handleOpenModal()} className="px-8 py-4 uppercase tracking-widest">
                    <Plus size={20} />
                    {activeTab === 'areas' ? 'Nueva Área' : 'Nuevo Cargo'}
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-20 text-indigo-400">
                    <Loader2 className="animate-spin" size={48} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode='popLayout'>
                        {(activeTab === 'areas' ? areas : cargos).map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                            >
                                <Card className="p-6 group relative overflow-hidden h-full flex flex-col">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-4 rounded-2xl ${activeTab === 'areas' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'} border flex items-center justify-center`}>
                                            {activeTab === 'areas' ? <Building2 size={24} /> : <Briefcase size={24} />}
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal(item)} className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all">
                                                <Pencil size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-white italic mb-2 tracking-tight">{item.nombre}</h3>
                                    <p className="text-sm text-slate-500 font-bold mb-6 flex-1">{item.descripcion || 'Sin descripción disponible.'}</p>
                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                        <span>Sistema Central</span>
                                        <span className="italic">ID: #{item.id}</span>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Modal CRUD */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="relative w-full max-w-lg"
                        >
                            <Card className="p-10">
                                <div className="flex items-center justify-between mb-10">
                                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                        {editingItem ? `Editar ${activeTab === 'areas' ? 'Área' : 'Cargo'}` : `Nueva ${activeTab === 'areas' ? 'Área' : 'Cargo'}`}
                                    </h2>
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-500 hover:text-white">
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <InputField label="Nombre" placeholder={`Nombre de la ${activeTab === 'areas' ? 'Área' : 'Cargo'}`} value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Descripción</label>
                                        <textarea className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-bold min-h-[100px]" placeholder="Breve descripción..." value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
                                    </div>
                                    <div className="flex justify-end gap-4">
                                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                        <Button type="submit"><Save size={18} /> Guardar</Button>
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

export default Organization;
