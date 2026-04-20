import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, 
    Mail, 
    Shield, 
    UserPlus, 
    Trash2, 
    Plus, 
    Search, 
    Loader2,
    Lock,
    UserCheck
} from 'lucide-react';
import client from '../api/client';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import InputField from '../components/ui/InputField';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        rol_id: '',
        empleado_id: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes, empRes] = await Promise.all([
                client.get('/usuarios'),
                client.get('/usuarios/roles'),
                client.get('/empleados')
            ]);
            setUsers(usersRes.data);
            setRoles(rolesRes.data);
            setEmployees(empRes.data);
        } catch (error) {
            console.error('Error fetching users data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await client.post('/usuarios', formData);
            fetchData();
            setIsModalOpen(false);
            setFormData({ nombre: '', email: '', password: '', rol_id: '', empleado_id: '' });
        } catch (error) {
            alert(error.response?.data?.error || 'Error al crear usuario');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            await client.delete(`/usuarios/${id}`);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al eliminar usuario');
        }
    };

    const filteredUsers = users.filter(u => 
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Gestión de Usuarios</h1>
                    <p className="text-slate-400 font-bold text-sm">Administra los accesos y vínculos de los colaboradores al sistema</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <UserPlus size={20} />
                    Crear Nueva Cuenta
                </Button>
            </header>

            <Card className="p-4 bg-slate-900/40 border-white/5">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o email..." 
                        className="w-full bg-transparent pl-12 pr-4 py-2 text-white focus:outline-none font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </Card>

            {loading ? (
                <div className="p-20 text-center text-indigo-400">
                    <Loader2 className="animate-spin mx-auto mb-4" size={48} />
                    <p className="font-bold">Cargando cuentas...</p>
                </div>
            ) : (
                <Card className="p-0 overflow-hidden border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900/80 border-b border-white/5">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Usuario</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rol</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Empleado Vinculado</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha Registro</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-indigo-400 font-black">
                                                    {u.nombre.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white group-hover:text-indigo-400 transition-colors">{u.nombre}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                                                {u.rol_nombre}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            {u.empleado_id ? (
                                                <div className="flex items-center gap-2 text-emerald-400">
                                                    <UserCheck size={14} />
                                                    <span className="text-sm font-bold italic">{u.empleado_nombres} {u.empleado_apellidos}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-600 text-xs font-bold italic">No vinculado</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-slate-500 text-xs font-bold">
                                            {new Date(u.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button 
                                                onClick={() => handleDelete(u.id)}
                                                className="p-2.5 rounded-xl hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 transition-all"
                                                title="Eliminar Cuenta"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Modal de Creación */}
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
                            className="relative w-full max-w-xl"
                        >
                            <Card className="p-8 md:p-10">
                                <h2 className="text-3xl font-black text-white italic uppercase mb-8">Nueva Cuenta</h2>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <InputField 
                                        label="Nombre del Usuario" 
                                        icon={User}
                                        value={formData.nombre} 
                                        onChange={e => setFormData({...formData, nombre: e.target.value})} 
                                        required 
                                        placeholder="Ej. Juan Pérez"
                                    />
                                    <InputField 
                                        label="Email de Acceso" 
                                        type="email"
                                        icon={Mail}
                                        value={formData.email} 
                                        onChange={e => setFormData({...formData, email: e.target.value})} 
                                        required 
                                        placeholder="correo@empresa.com"
                                    />
                                    <InputField 
                                        label="Contraseña" 
                                        type="password"
                                        icon={Lock}
                                        value={formData.password} 
                                        onChange={e => setFormData({...formData, password: e.target.value})} 
                                        required 
                                        placeholder="********"
                                    />
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Rol de Sistema</label>
                                            <select 
                                                className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold text-sm focus:border-indigo-500/50 outline-none transition-all"
                                                value={formData.rol_id} 
                                                onChange={e => setFormData({...formData, rol_id: e.target.value})}
                                                required
                                            >
                                                <option value="">Seleccionar rol...</option>
                                                {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Vincular a Empleado</label>
                                            <select 
                                                className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold text-sm focus:border-indigo-500/50 outline-none transition-all italic"
                                                value={formData.empleado_id} 
                                                onChange={e => setFormData({...formData, empleado_id: e.target.value})}
                                            >
                                                <option value="">Ninguno (Solo acceso admin)</option>
                                                {employees.map(e => <option key={e.id} value={e.id}>{e.nombres} {e.apellidos}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-4 pt-4">
                                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                        <Button type="submit">Crear Usuario</Button>
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

export default Users;
