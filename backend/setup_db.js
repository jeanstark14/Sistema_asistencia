const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function setup() {
    try {
        console.log('Iniciando carga de datos de prueba...');

        // 1. Insertar Roles del Sistema
        const roles = [
            ['Administrador', 'Acceso total al sistema'],
            ['Gerente', 'Gestión general y reportes'],
            ['Jefe', 'Supervisión de personal y nómina'],
            ['Monitor', 'Monitoreo de asistencia en tiempo real'],
            ['Empleado', 'Acceso personal a sus marcas'],
            ['Practicante', 'Acceso personal limitado']
        ];
        for (const [nombre, descripcion] of roles) {
            await pool.execute(
                'INSERT IGNORE INTO roles (nombre, descripcion) VALUES (?, ?)',
                [nombre, descripcion]
            );
        }
        console.log('✓ Roles del sistema verificados.');

        // 1.1 Insertar Usuario Administrador por defecto
        const [adminRole] = await pool.execute('SELECT id FROM roles WHERE nombre = "Administrador"');
        const rolId = adminRole[0].id;
        const passHash = await bcrypt.hash('admin123', 10);
        
        await pool.execute(
            'INSERT IGNORE INTO usuarios (nombre, email, password_hash, rol_id, estado) VALUES (?, ?, ?, ?, ?)',
            ['Admin', 'admin@sistema.com', passHash, rolId, 'activo']
        );
        console.log('✓ Usuario Administrador (admin@sistema.com / admin123) verificado.');

        // 2. Insertar Dispositivos de Prueba
        await pool.execute(
            'INSERT IGNORE INTO dispositivos (device_uid, nombre, ubicacion, ip_local, estado) VALUES (?, ?, ?, ?, ?)',
            ['SN-C308-TEST', 'Biométrico Oficina 1', 'Entrada Principal', '192.168.1.50', 'activo']
        );
        await pool.execute(
            'INSERT IGNORE INTO dispositivos (device_uid, nombre, ubicacion, ip_local, estado) VALUES (?, ?, ?, ?, ?)',
            ['SN-C308-TEST-2', 'Biométrico Sede Norte', 'Puerta Posterior', '192.168.10.51', 'activo']
        );
        console.log('✓ Dispositivos de prueba verificados.');

        // 3. Insertar Empleado de Prueba
        await pool.execute(
            'INSERT IGNORE INTO empleados (codigo_interno, nombres, apellidos, dni, salario_base, tipo_empleado, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['E001', 'Juan', 'Perez', '12345678', 1500.00, 'empleado', 'activo']
        );
        console.log('✓ Empleado "E001" verificado.');

        const [empleado] = await pool.execute('SELECT id FROM empleados WHERE codigo_interno = "E001"');
        const empleado_id = empleado[0].id;

        // 4. Insertar Turno de Prueba (9:00 AM - 6:30 PM)
        await pool.execute(
            'INSERT IGNORE INTO turnos (id, nombre_turno, hora_inicio, hora_fin, horas_refrigerio, estado) VALUES (?, ?, ?, ?, ?, ?)',
            [1, 'Oficina General (Rotativo)', '09:00:00', '18:30:00', 1.00, 'activo']
        );
        console.log('✓ Turno "Oficina General" (9:00 - 18:30) verificado.');

        // 5. Asignar Turno al Empleado (Ejemplo de inicio de rotación)
        await pool.execute(
            'INSERT IGNORE INTO empleado_turno (empleado_id, turno_id, fecha_inicio) VALUES (?, ?, ?)',
            [empleado_id, 1, '2024-01-01']
        );
        console.log('✓ Asignación de turno rotativo verificada.');

        console.log('\n¡Datos de prueba cargados correctamente!');
        process.exit(0);
    } catch (error) {
        console.error('Error durante la configuración:', error);
        process.exit(1);
    }
}

setup();
