USE sistema_asistencia_nomina;

-- Insertar un rol administrador si no existe
INSERT IGNORE INTO roles (nombre, descripcion) VALUES ('Administrador', 'Acceso total al sistema');

-- Insertar un dispositivo de prueba
INSERT IGNORE INTO dispositivos (device_uid, nombre, ubicacion, ip_local, estado) 
VALUES ('SN-C308-TEST', 'Biométrico Oficina 1', 'Entrada Principal', '192.168.1.50', 'activo');

-- Insertar un empleado de prueba
INSERT IGNORE INTO empleados (codigo_interno, nombres, apellidos, dni, salario_base, tipo_empleado, estado)
VALUES ('E001', 'Juan', 'Perez', '12345678', 1500.00, 'empleado', 'activo');
