import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    UserPlus,
    Search,
    Filter,
    Pencil,
    Trash2,
    Building2,
    Briefcase,
    Shield,
    X,
    Save,
    Loader2,
    Clock,
    Banknote,
    KeyRound
} from 'lucide-react';
import client from '../api/client';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import InputField from '../components/ui/InputField';

const Employees = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [areas, setAreas] = useState([]);
    const [cargos, setCargos] = useState([]);
    const [loadingDni, setLoadingDni] = useState(false);

    // Estados para Ubigeo
    const [departments, setDepartments] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);


    const [formData, setFormData] = useState({
        codigo_interno: '',
        nombres: '',
        apellidos: '',
        dni: '',
        telefono: '',
        email: '',
        direccion: '',
        genero: 'M',
        fecha_nacimiento: '',
        salario_base: 0,
        tipo_empleado: 'TC', // Tiempo Completo 
        fecha_ingreso: new Date().toISOString().split('T')[0],
        area_id: '',
        cargo_id: '',
        rol: 'empleado',
        estado: 'activo',
        tipo_documento: 'dni',
        ubigeo_departamento_id: '',
        ubigeo_provincia_id: '',
        ubigeo_distrito_id: ''
    });

    // Estados para Asignación de Horario
    const [schedules, setSchedules] = useState([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [assignData, setAssignData] = useState({
        turno_id: '',
        fecha_inicio: new Date().toISOString().split('T')[0],
        usar_personalizado: false,
        hora_inicio: '',
        hora_fin: '',
        refrigerio: 1.00
    });

    // Estados para gestión de PIN Kiosco
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pinEmployee, setPinEmployee] = useState(null);
    const [pinValue, setPinValue] = useState('');
    const [pinLoading, setPinLoading] = useState(false);
    const [pinMsg, setPinMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [empRes, areaRes, cargoRes, schedRes, deptRes] = await Promise.all([
                client.get('/empleados'),
                client.get('/areas'),
                client.get('/cargos'),
                client.get('/turnos'),
                client.get('/ubigeo/departments')
            ]);
            setEmployees(empRes.data);
            setAreas(areaRes.data);
            setCargos(cargoRes.data);
            setSchedules(schedRes.data);
            setDepartments(deptRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = async (employee = null) => {
        if (employee) {
            setEditingEmployee(employee);
            setFormData({
                codigo_interno: employee.codigo_interno || '',
                nombres: employee.nombres || '',
                apellidos: employee.apellidos || '',
                dni: employee.dni || '',
                telefono: employee.telefono || '',
                email: employee.email || '',
                direccion: employee.direccion || '',
                genero: employee.genero || 'M',
                fecha_nacimiento: employee.fecha_nacimiento ? employee.fecha_nacimiento.slice(0, 10) : '',
                salario_base: employee.salario_base || 0,
                tipo_empleado: employee.tipo_empleado || 'TC',
                fecha_ingreso: employee.fecha_ingreso ? employee.fecha_ingreso.slice(0, 10) : new Date().toISOString().split('T')[0],
                area_id: employee.area_id,
                cargo_id: employee.cargo_id,
                rol: employee.rol || 'empleado',
                estado: employee.estado || 'activo',
                tipo_documento: employee.tipo_documento || 'dni',
                ubigeo_departamento_id: employee.ubigeo_departamento_id || '',
                ubigeo_provincia_id: employee.ubigeo_provincia_id || '',
                ubigeo_distrito_id: employee.ubigeo_distrito_id || ''
            });

            // Cargar datos dependientes si existen
            if (employee.ubigeo_departamento_id) {
                const provs = await client.get(`/ubigeo/provinces/${employee.ubigeo_departamento_id}`);
                setProvinces(provs.data);
            }
            if (employee.ubigeo_provincia_id) {
                const dists = await client.get(`/ubigeo/districts/${employee.ubigeo_provincia_id}`);
                setDistricts(dists.data);
            }

        } else {
            setEditingEmployee(null);
            setFormData({
                codigo_interno: `EMP-${Date.now().toString().slice(-4)}`,
                nombres: '',
                apellidos: '',
                dni: '',
                telefono: '',
                email: '',
                direccion: '',
                genero: 'M',
                fecha_nacimiento: '',
                salario_base: 0,
                tipo_empleado: 'TC',
                fecha_ingreso: new Date().toISOString().split('T')[0],
                area_id: '',
                cargo_id: '',
                rol: 'empleado',
                estado: 'activo',
                tipo_documento: 'dni',
                ubigeo_departamento_id: '',
                ubigeo_provincia_id: '',
                ubigeo_distrito_id: ''
            });
            setProvinces([]);
            setDistricts([]);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingEmployee) {
                await client.put(`/empleados/${editingEmployee.id}`, formData);
            } else {
                await client.post('/empleados', formData);
            }
            fetchData();
            setIsModalOpen(false);
        } catch (error) {
            alert('Error al guardar empleado');
        }
    };

    const handleDniLookup = async (dniToLookup) => {
        const dni = dniToLookup || formData.dni;
        const tipo = formData.tipo_documento || 'dni';

        if (!dni) {
            alert('Ingrese un número de documento');
            return;
        }

        setLoadingDni(true);
        try {
            const response = await client.get(`/dni/${dni}?tipo=${tipo}`);
            const data = response.data;

            if (data.success) {
                setFormData(prev => ({
                    ...prev,
                    nombres: data.nombres || '',
                    apellidos: `${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`.trim()
                }));
            }
        } catch (error) {
            console.error(`[${tipo.toUpperCase()}] Error:`, error);
            alert(error.response?.data?.message || 'No se pudo encontrar información para este documento.');
        } finally {
            setLoadingDni(false);
        }
    };




    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este empleado?')) {
            try {
                await client.delete(`/empleados/${id}`);
                fetchData();
            } catch (error) {
                alert('Error al eliminar');
            }
        }
    };

    const handleOpenAssignModal = (employee) => {
        setSelectedEmployee(employee);
        setAssignData({
            turno_id: '',
            fecha_inicio: new Date().toISOString().split('T')[0],
            usar_personalizado: false,
            hora_inicio: '',
            hora_fin: '',
            refrigerio: 1.00
        });
        setIsAssignModalOpen(true);
    };

    const handleAssignSchedule = async (e) => {
        e.preventDefault();
        try {
            const dataToSubmit = {
                empleado_id: selectedEmployee.id,
                ...assignData
            };
            await client.post('/turnos/asignar', dataToSubmit);
            setIsAssignModalOpen(false);
            alert('Horario asignado correctamente');
        } catch (error) {
            alert('Error al asignar horario');
        }
    };

    const filteredEmployees = employees.filter(emp =>
        `${emp.nombres} ${emp.apellidos} ${emp.email}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ── PIN Kiosco handlers ──────────────────────────────────
    const handleOpenPinModal = (emp) => {
        setPinEmployee(emp);
        setPinValue('');
        setPinMsg({ type: '', text: '' });
        setIsPinModalOpen(true);
    };

    const handleSavePin = async () => {
        if (!/^\d{5}$/.test(pinValue)) {
            setPinMsg({ type: 'error', text: 'El PIN debe ser exactamente 5 dígitos numéricos.' });
            return;
        }
        setPinLoading(true);
        try {
            await client.put(`/kiosco/pin/${pinEmployee.id}`, { pin: pinValue });
            setPinMsg({ type: 'success', text: '✅ PIN guardado correctamente.' });
            fetchData();
            setTimeout(() => setIsPinModalOpen(false), 1200);
        } catch (err) {
            setPinMsg({ type: 'error', text: err.response?.data?.error || 'Error al guardar PIN.' });
        } finally {
            setPinLoading(false);
        }
    };

    const handleDeletePin = async () => {
        if (!window.confirm(`¿Eliminar el PIN de ${pinEmployee.nombres}? El empleado no podrá marcar en el kiosco.`)) return;
        setPinLoading(true);
        try {
            await client.delete(`/kiosco/pin/${pinEmployee.id}`);
            setPinMsg({ type: 'success', text: '🗑️ PIN eliminado.' });
            fetchData();
            setTimeout(() => setIsPinModalOpen(false), 1200);
        } catch (err) {
            setPinMsg({ type: 'error', text: 'Error al eliminar PIN.' });
        } finally {
            setPinLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Gestión de Personal</h1>
                    <p className="text-slate-400 font-bold text-sm">Administra los empleados y sus roles en la organización</p>
                </div>
                <Button onClick={() => handleOpenModal()} className="px-8 py-4 uppercase tracking-[0.2em]">
                    <UserPlus size={20} />
                    Nuevo Empleado
                </Button>
            </header>

            <Card className="p-4 bg-slate-900/40 border-white/5">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, apellido o email..."
                            className="w-full bg-slate-950/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center p-20 text-indigo-400">
                    <Loader2 className="animate-spin" size={48} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence mode='popLayout'>
                        {filteredEmployees.map((emp) => (
                            <motion.div
                                key={emp.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card className="p-6 group relative overflow-hidden h-full flex flex-col justify-between">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

                                    <div>
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xl">
                                                {(emp.nombres || '?')[0]}{(emp.apellidos || '?')[0]}
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenAssignModal(emp)} className="p-2 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all shadow-lg shadow-amber-500/10" title="Asignar Horario">
                                                    <Clock size={16} />
                                                </button>
                                                <button onClick={() => handleOpenPinModal(emp)} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all" title="PIN Kiosco">
                                                    <KeyRound size={16} />
                                                </button>
                                                <button onClick={() => handleOpenModal(emp)} className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all">
                                                    <Pencil size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(emp.id)} className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-black text-white mb-1">{emp.nombres} {emp.apellidos}</h3>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-6">{emp.email}</p>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-slate-400">
                                                <Building2 size={16} className="text-indigo-500/50" />
                                                <span className="text-sm font-bold">{emp.area_nombre || 'Sin Área'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-400">
                                                <Briefcase size={16} className="text-indigo-500/50" />
                                                <span className="text-sm font-bold">{emp.cargo_nombre || 'Sin Cargo'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-emerald-400/80">
                                                <Banknote size={16} className="text-emerald-500/50" />
                                                <span className="text-sm font-black italic">S/ {parseFloat(emp.salario_base || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-white/5">
                                                <Shield size={12} className="text-indigo-400" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{emp.rol}</span>
                                            </div>
                                            {emp.pin_kiosco ? (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                    <KeyRound size={10} className="text-emerald-400" />
                                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">PIN</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                                                    <KeyRound size={10} className="text-rose-400" />
                                                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Sin PIN</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">ID: #{emp.id}</span>
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
                            className="relative w-full max-w-2xl"
                        >
                            <Card className="p-0 overflow-hidden max-h-[90vh] flex flex-col">
                                <div className="p-10 pb-0 flex-shrink-0">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                            {editingEmployee ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
                                        </h2>
                                        <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
                                    <div className="p-10 pt-4 overflow-y-auto flex-grow space-y-8 custom-scrollbar">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputField
                                                label="Nombres"
                                                placeholder="Ej. Saul"
                                                value={formData.nombres}
                                                onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                                                required
                                            />
                                            <InputField
                                                label="Apellidos"
                                                placeholder="Ej. Mercado"
                                                value={formData.apellidos}
                                                onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                                                required
                                            />
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Tipo de Documento</label>
                                                <select
                                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-bold"
                                                    value={formData.tipo_documento}
                                                    onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value, dni: '' })}
                                                >
                                                    <option value="dni">DNI (Peruano)</option>
                                                    <option value="ce">Carné de Extranjería</option>
                                                </select>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <InputField
                                                        label={formData.tipo_documento === 'dni' ? "DNI" : "Número de Carné"}
                                                        placeholder={formData.tipo_documento === 'dni' ? "8 dígitos" : "10 a 12 dígitos"}
                                                        value={formData.dni}
                                                        onChange={(e) => {
                                                            const val = formData.tipo_documento === 'dni' ? e.target.value.replace(/\D/g, '').slice(0, 8) : e.target.value.slice(0, 12);
                                                            setFormData({ ...formData, dni: val });
                                                        }}
                                                        required
                                                    />
                                                    {loadingDni && (
                                                        <div className="absolute right-4 top-[38px]">
                                                            <Loader2 className="animate-spin text-indigo-500" size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="pt-6">
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleDniLookup(formData.dni)}
                                                        disabled={loadingDni || !formData.dni}
                                                        className="h-[58px] px-4"
                                                        variant="secondary"
                                                        title="Buscar datos"
                                                    >
                                                        <Search size={20} />
                                                    </Button>
                                                </div>
                                            </div>
                                            <InputField
                                                label="Email Corporativo"
                                                type="email"
                                                placeholder="saul@empresa.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                            <InputField
                                                label="Teléfono"
                                                placeholder="Ej. 987654321"
                                                value={formData.telefono}
                                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                            />
                                            <InputField
                                                label="Dirección"
                                                placeholder="Ej. Av. Principal 123"
                                                value={formData.direccion}
                                                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                            />

                                            {/* Ubigeo Selects */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Departamento</label>
                                                <select
                                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-bold"
                                                    value={formData.ubigeo_departamento_id}
                                                    onChange={async (e) => {
                                                        const deptId = e.target.value;
                                                        setFormData({ ...formData, ubigeo_departamento_id: deptId, ubigeo_provincia_id: '', ubigeo_distrito_id: '' });
                                                        setDistricts([]);
                                                        if (deptId) {
                                                            const res = await client.get(`/ubigeo/provinces/${deptId}`);
                                                            setProvinces(res.data);
                                                        } else {
                                                            setProvinces([]);
                                                        }
                                                    }}
                                                >
                                                    <option value="">Seleccionar Departamento</option>
                                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Provincia</label>
                                                <select
                                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-bold"
                                                    value={formData.ubigeo_provincia_id}
                                                    disabled={!formData.ubigeo_departamento_id}
                                                    onChange={async (e) => {
                                                        const provId = e.target.value;
                                                        setFormData({ ...formData, ubigeo_provincia_id: provId, ubigeo_distrito_id: '' });
                                                        if (provId) {
                                                            const res = await client.get(`/ubigeo/districts/${provId}`);
                                                            setDistricts(res.data);
                                                        } else {
                                                            setDistricts([]);
                                                        }
                                                    }}
                                                >
                                                    <option value="">Seleccionar Provincia</option>
                                                    {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Distrito</label>
                                                <select
                                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-bold"
                                                    value={formData.ubigeo_distrito_id}
                                                    disabled={!formData.ubigeo_provincia_id}
                                                    onChange={(e) => setFormData({ ...formData, ubigeo_distrito_id: e.target.value })}
                                                >
                                                    <option value="">Seleccionar Distrito</option>
                                                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                </select>
                                            </div>
                                            <InputField
                                                label="Fecha de Nacimiento"
                                                type="date"
                                                value={formData.fecha_nacimiento}
                                                onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                                            />
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Género</label>
                                                <select
                                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-bold"
                                                    value={formData.genero}
                                                    onChange={(e) => setFormData({ ...formData, genero: e.target.value })}
                                                >
                                                    <option value="M">Masculino</option>
                                                    <option value="F">Femenino</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Rol del Sistema</label>
                                                <select
                                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-bold"
                                                    value={formData.rol}
                                                    onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                                                >
                                                    <option value="empleado">Empleado</option>
                                                    <option value="moderador">Moderador</option>
                                                    <option value="admin">Administrador</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Tipo de Colaborador</label>
                                                <select
                                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-bold"
                                                    value={formData.tipo_empleado}
                                                    onChange={(e) => setFormData({ ...formData, tipo_empleado: e.target.value })}
                                                >
                                                    <option value="TC">Tiempo Completo (Oficina)</option>
                                                    <option value="TP">Tiempo Parcial</option>
                                                    <option value="PR">Practicante</option>
                                                    <option value="EX">Externo / Tercero</option>
                                                </select>
                                            </div>
                                            <InputField
                                                label="Salario Base (Mensual)"
                                                type="number"
                                                placeholder="Ej. 1300"
                                                value={formData.salario_base}
                                                onChange={(e) => setFormData({ ...formData, salario_base: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Departamento / Área</label>
                                                <select
                                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-bold"
                                                    value={formData.area_id}
                                                    onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                                                    required
                                                >
                                                    <option value="">Seleccionar Área</option>
                                                    {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Cargo / Puesto</label>
                                                <select
                                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-bold"
                                                    value={formData.cargo_id}
                                                    onChange={(e) => setFormData({ ...formData, cargo_id: e.target.value })}
                                                    required
                                                >
                                                    <option value="">Seleccionar Cargo</option>
                                                    {cargos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-10 pt-6 border-t border-white/5 bg-slate-950/30 flex justify-end gap-4 flex-shrink-0">
                                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="px-8">
                                            Cancelar
                                        </Button>
                                        <Button type="submit" className="px-10">
                                            <Save size={20} />
                                            {editingEmployee ? 'Actualizar' : 'Guardar'}
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Modal PIN Kiosco ─────────────────────────── */}
            <AnimatePresence>
                {isPinModalOpen && pinEmployee && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            onClick={() => setIsPinModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md"
                        >
                            <Card className="p-8 overflow-hidden">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                                            <KeyRound size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-white uppercase tracking-tight">PIN Kiosco</h2>
                                            <p className="text-xs text-slate-500 font-bold">{pinEmployee.nombres} {pinEmployee.apellidos}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsPinModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-5">
                                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5">
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                            Este PIN de <strong className="text-white">5 dígitos</strong> es el que el empleado usará para identificarse en el <strong className="text-emerald-400">Kiosco de Marcación</strong>.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">
                                            {pinEmployee.pin_kiosco ? 'Cambiar PIN (5 dígitos)' : 'Nuevo PIN (5 dígitos)'}
                                        </label>
                                        <input
                                            type="password"
                                            inputMode="numeric"
                                            pattern="[0-9]{5}"
                                            maxLength={5}
                                            placeholder="● ● ● ● ●"
                                            value={pinValue}
                                            onChange={e => {
                                                const v = e.target.value.replace(/\D/g, '').slice(0, 5);
                                                setPinValue(v);
                                                setPinMsg({ type: '', text: '' });
                                            }}
                                            className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white text-center text-2xl tracking-[0.5em] font-black focus:outline-none focus:border-emerald-500/50 transition-all"
                                        />
                                        <p className="text-[10px] text-slate-600 font-medium text-center">
                                            {pinValue.length}/5 dígitos
                                        </p>
                                    </div>

                                    {pinMsg.text && (
                                        <div className={`p-3 rounded-xl text-sm font-bold ${
                                            pinMsg.type === 'success'
                                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                                        }`}>
                                            {pinMsg.text}
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        {pinEmployee.pin_kiosco && (
                                            <button
                                                type="button"
                                                onClick={handleDeletePin}
                                                disabled={pinLoading}
                                                className="flex-1 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white font-black text-sm uppercase tracking-wide transition-all disabled:opacity-50"
                                            >
                                                Quitar PIN
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleSavePin}
                                            disabled={pinLoading || pinValue.length !== 5}
                                            className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wide transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {pinLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                            Guardar PIN
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de Asignación de Horario */}
            <AnimatePresence>
                {isAssignModalOpen && selectedEmployee && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsAssignModalOpen(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-2xl px-4">
                            <Card className="p-8 md:p-12 overflow-y-auto max-h-[90vh]">
                                <h2 className="text-3xl font-black text-white italic uppercase mb-2">Asignar Horario</h2>
                                <p className="text-slate-500 font-bold text-sm mb-10">
                                    Configurando horario para: <span className="text-white">{selectedEmployee.nombres} {selectedEmployee.apellidos}</span>
                                </p>

                                <form onSubmit={handleAssignSchedule} className="space-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Seleccionar Turno Base</label>
                                        <select
                                            className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-white font-bold text-sm"
                                            value={assignData.turno_id}
                                            onChange={e => setAssignData({ ...assignData, turno_id: e.target.value })}
                                            required
                                        >
                                            <option value="">Elegir turno...</option>
                                            {schedules.map(s => <option key={s.id} value={s.id}>{s.nombre_turno}</option>)}
                                        </select>
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

export default Employees;
