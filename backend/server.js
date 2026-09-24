require('dotenv').config();

// Validar variables de entorno críticas
if (!process.env.JWT_SECRET) {
    console.error('❌ ERROR CRÍTICO: JWT_SECRET no está definido en el archivo .env');
    console.error('🔧 Solución: Agregue JWT_SECRET=su_clave_segura en el archivo .env');
    process.exit(1);
}

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const biometricoRoutes = require('./routes/biometrico');
const nominaRoutes = require('./routes/nomina');
const cierreRoutes = require('./routes/cierre');
const dashboardRoutes = require('./routes/dashboard');
const areaRoutes = require('./routes/area');
const cargoRoutes = require('./routes/cargo');
const dispositivoRoutes = require('./routes/dispositivo');
const configRoutes = require('./routes/config');
const feriadoRoutes = require('./routes/feriado');
const empleadoRoutes = require('./routes/empleado');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middlewares/authMiddleware');
const roleMiddleware = require('./middlewares/roleMiddleware');

// Importar servicios para cierre automático
const cierreService = require('./services/cierreService');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Rutas Públicas
app.use('/api/auth', authRoutes);

// Rutas (Protección interna en cada archivo de rutas)
app.use('/api/biometrico', biometricoRoutes); 
app.use('/api/kiosco', require('./routes/kiosco'));
app.use('/api/nomina', nominaRoutes);
app.use('/api/cierre', cierreRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/cargos', cargoRoutes);
app.use('/api/dispositivos', dispositivoRoutes);
app.use('/api/configuraciones', configRoutes);
app.use('/api/feriados', feriadoRoutes);
app.use('/api/empleados', empleadoRoutes);
app.use('/api/turnos', require('./routes/turno'));
app.use('/api/justificaciones', require('./routes/justificacion'));
app.use('/api/usuarios', require('./routes/usuario'));
app.use('/api/dni', require('./routes/dni'));
app.use('/api/ubigeo', require('./routes/ubigeo'));


// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'UP', timestamp: new Date() });
});

// Configurar cierre diario automático a las 23:59
cron.schedule('59 23 * * *', async () => {
    console.log('[Cierre Automático] Iniciando procesamiento diario...');
    try {
        const resultado = await cierreService.procesarCierre();
        console.log('[Cierre Automático] Completado exitosamente:', resultado);
    } catch (error) {
        console.error('[Cierre Automático] Error en procesamiento:', error.message);
        // TODO: Implementar notificación por email al administrador
    }
});

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 SERVIDOR ASISTENCIA - PUERTO ${PORT}`);
    console.log(`=========================================`);
    console.log(`📅 Cierre diario automático configurado: 23:59 diariamente`);
});
