-- Actualización de Base de Datos para Empleados y Justificaciones
-- Script idempotente - puede ejecutarse múltiples veces

USE sistema_asistencia_nomina;

-- 1. Agregar columnas a empleados (solo si no existen)
-- Verificar y agregar area_id
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'area_id');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE empleados ADD COLUMN area_id INT DEFAULT NULL AFTER fecha_ingreso', 'SELECT ''area_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verificar y agregar cargo_id
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'cargo_id');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE empleados ADD COLUMN cargo_id INT DEFAULT NULL AFTER area_id', 'SELECT ''cargo_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verificar y agregar telefono
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'telefono');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE empleados ADD COLUMN telefono VARCHAR(20) AFTER cargo_id', 'SELECT ''telefono already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verificar y agregar direccion
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'direccion');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE empleados ADD COLUMN direccion VARCHAR(255) AFTER telefono', 'SELECT ''direccion already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verificar y agregar fecha_nacimiento
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'fecha_nacimiento');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE empleados ADD COLUMN fecha_nacimiento DATE AFTER direccion', 'SELECT ''fecha_nacimiento already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verificar y agregar genero
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'genero');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE empleados ADD COLUMN genero ENUM(''M'', ''F'', ''Otro'') AFTER fecha_nacimiento', 'SELECT ''genero already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verificar y agregar ubigeo_departamento_id
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'ubigeo_departamento_id');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE empleados ADD COLUMN ubigeo_departamento_id INT DEFAULT NULL AFTER genero', 'SELECT ''ubigeo_departamento_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verificar y agregar ubigeo_provincia_id
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'ubigeo_provincia_id');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE empleados ADD COLUMN ubigeo_provincia_id INT DEFAULT NULL AFTER ubigeo_departamento_id', 'SELECT ''ubigeo_provincia_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verificar y agregar ubigeo_distrito_id
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'ubigeo_distrito_id');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE empleados ADD COLUMN ubigeo_distrito_id INT DEFAULT NULL AFTER ubigeo_provincia_id', 'SELECT ''ubigeo_distrito_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Agregar foreign keys para area y cargo (solo si no existen)
-- Primero verificar si existen las columnas
SET @area_col = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'area_id');
SET @cargo_col = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'cargo_id');

-- Agregar FK si las columnas existen y la FK no existe
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'empleados' AND CONSTRAINT_NAME = 'fk_empleado_area');

SET @sql = IF(@area_col > 0 AND @fk_exists = 0, 
    'ALTER TABLE empleados ADD CONSTRAINT fk_empleado_area FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL ON UPDATE CASCADE', 
    'SELECT ''fk_empleado_area already exists or column missing''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'empleados' AND CONSTRAINT_NAME = 'fk_empleado_cargo');

SET @sql = IF(@cargo_col > 0 AND @fk_exists = 0, 
    'ALTER TABLE empleados ADD CONSTRAINT fk_empleado_cargo FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE SET NULL ON UPDATE CASCADE', 
    'SELECT ''fk_empleado_cargo already exists or column missing''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Agregar columnas a usuarios (solo si no existen)
-- Verificar y agregar dni
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'dni');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE usuarios ADD COLUMN dni VARCHAR(20) AFTER email', 'SELECT ''dni already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verificar y agregar telefono
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'telefono');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(20) AFTER dni', 'SELECT ''telefono already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verificar y agregar direccion
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'direccion');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE usuarios ADD COLUMN direccion VARCHAR(255) AFTER telefono', 'SELECT ''direccion already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verificar y agregar fecha_nacimiento
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'fecha_nacimiento');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE usuarios ADD COLUMN fecha_nacimiento DATE AFTER direccion', 'SELECT ''fecha_nacimiento already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verificar y agregar genero
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'genero');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE usuarios ADD COLUMN genero ENUM(''M'', ''F'', ''Otro'') AFTER fecha_nacimiento', 'SELECT ''genero already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verificar y agregar empleado_id
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'empleado_id');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE usuarios ADD COLUMN empleado_id INT DEFAULT NULL AFTER rol_id', 'SELECT ''empleado_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Agregar foreign key para empleado_id si no existe
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'usuarios' AND CONSTRAINT_NAME = 'fk_usuario_empleado');

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE usuarios ADD CONSTRAINT fk_usuario_empleado FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE SET NULL ON UPDATE CASCADE', 
    'SELECT ''fk_usuario_empleado already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Crear tabla: justificaciones
CREATE TABLE IF NOT EXISTS justificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    fecha_referencia DATE NOT NULL,
    tipo ENUM('falta', 'tardanza', 'omision_marcacion') NOT NULL,
    motivo TEXT NOT NULL,
    estado ENUM('pendiente', 'aprobada', 'rechazada') DEFAULT 'pendiente',
    revisado_por INT NULL,
    comentario_revisor TEXT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_revision TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_justificacion_empleado
        FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_justificacion_revisor
        FOREIGN KEY (revisado_por) REFERENCES usuarios(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. Agregar columnas a asistencias (solo si no existen)
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'asistencias' AND COLUMN_NAME = 'hora_entrada_2');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE asistenciaS ADD COLUMN hora_entrada_2 DATETIME NULL AFTER hora_salida', 'SELECT ''hora_entrada_2 already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'asistencias' AND COLUMN_NAME = 'hora_salida_2');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE asistenciaS ADD COLUMN hora_salida_2 DATETIME NULL AFTER hora_entrada_2', 'SELECT ''hora_salida_2 already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'asistencias' AND COLUMN_NAME = 'minutos_merienda');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE asistenciaS ADD COLUMN minutos_merienda INT DEFAULT 0 AFTER hora_salida_2', 'SELECT ''minutos_merienda already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'asistencias' AND COLUMN_NAME = 'minutos_trabajados');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE asistenciaS ADD COLUMN minutos_trabajados INT DEFAULT 0 AFTER minutos_merienda', 'SELECT ''minutos_trabajados already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'asistencias' AND COLUMN_NAME = 'estado_entrada');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE asistenciaS ADD COLUMN estado_entrada VARCHAR(20) DEFAULT ''Normal'' AFTER minutos_trabajados', 'SELECT ''estado_entrada already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. Crear tablas de ubigeo si no existen
CREATE TABLE IF NOT EXISTS ubigeo_peru_departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ubigeo_peru_provinces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ubigeo_peru_districts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    province_id INT NOT NULL,
    department_id INT NOT NULL,
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- 6. Agregar columna ip_whitelist a dispositivos
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'dispositivos' AND COLUMN_NAME = 'ip_whitelist');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE dispositivos ADD COLUMN ip_whitelist VARCHAR(500) NULL AFTER ip_local', 'SELECT ''ip_whitelist already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7. Agregar columna revision_automatica a justificaciones
SET @column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'justificaciones' AND COLUMN_NAME = 'revision_automatica');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE justificaciones ADD COLUMN revision_automatica BOOLEAN DEFAULT FALSE AFTER estado', 'SELECT ''revision_automatica already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Schema actualizado correctamente' AS mensaje;
