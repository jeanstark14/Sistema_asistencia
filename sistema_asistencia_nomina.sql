-- ======================================================
-- BASE DE DATOS
-- ======================================================

CREATE DATABASE IF NOT EXISTS sistema_asistencia_nomina
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE sistema_asistencia_nomina;

-- ======================================================
-- TABLA: roles
-- ======================================================

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ======================================================
-- TABLA: usuarios
-- ======================================================

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL,
    estado ENUM('activo','inactivo') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (rol_id) REFERENCES roles(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- TABLA: empleados
-- ======================================================

CREATE TABLE empleados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_interno VARCHAR(50) UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    dni VARCHAR(20) UNIQUE,
    salario_base DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tipo_empleado ENUM('empleado','practicante') DEFAULT 'empleado',
    estado ENUM('activo','inactivo') DEFAULT 'activo',
    fecha_ingreso DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ======================================================
-- TABLA: dispositivos
-- ======================================================

CREATE TABLE dispositivos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_uid VARCHAR(100) NOT NULL UNIQUE,
    nombre VARCHAR(100),
    ubicacion VARCHAR(150),
    ip_local VARCHAR(50),
    estado ENUM('activo','inactivo') DEFAULT 'activo',
    ultimo_evento_recibido DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ======================================================
-- TABLA: asistencia_raw (INMUTABLE)
-- ======================================================

CREATE TABLE asistencia_raw (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,
    empleado_id INT NOT NULL,
    fecha_hora_marcacion DATETIME NOT NULL,
    tipo_marcacion VARCHAR(20) NULL,
    payload_json JSON NULL,
    procesado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_raw_fecha (fecha_hora_marcacion),
    INDEX idx_raw_empleado (empleado_id),

    CONSTRAINT fk_raw_device
        FOREIGN KEY (device_id) REFERENCES dispositivos(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_raw_empleado
        FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- TABLA: turnos
-- ======================================================

CREATE TABLE turnos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_turno VARCHAR(100) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    horas_refrigerio DECIMAL(4,2) DEFAULT 1.00,
    estado ENUM('activo','inactivo') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ======================================================
-- TABLA: empleado_turno (HORARIOS ROTATIVOS)
-- ======================================================

CREATE TABLE empleado_turno (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    turno_id INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NULL,

    INDEX idx_emp_turno_fecha (empleado_id, fecha_inicio, fecha_fin),

    CONSTRAINT fk_emp_turno_empleado
        FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_emp_turno_turno
        FOREIGN KEY (turno_id) REFERENCES turnos(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- TABLA: asistencia_eventos (NORMALIZADO INTERMEDIO)
-- ======================================================

CREATE TABLE asistencia_eventos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    dispositivo_id INT NOT NULL,
    fecha_hora DATETIME NOT NULL,
    tipo ENUM('entrada', 'salida', 'otros') NOT NULL,
    metodo VARCHAR(50),
    raw_id BIGINT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_evento_empleado (empleado_id),
    INDEX idx_evento_fecha (fecha_hora),

    CONSTRAINT fk_evento_empleado
        FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_evento_dispositivo
        FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_evento_raw
        FOREIGN KEY (raw_id) REFERENCES asistencia_raw(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- TABLA: asistencias (PROCESADAS)
-- ======================================================

CREATE TABLE asistencias (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora_entrada DATETIME NULL,
    hora_salida DATETIME NULL,
    minutos_tardanza INT DEFAULT 0,
    minutos_extra_diurna INT DEFAULT 0,
    minutos_extra_nocturna INT DEFAULT 0,
    estado ENUM('normal','tardanza','falta','inconsistente') DEFAULT 'normal',
    revisado_por INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_empleado_fecha (empleado_id, fecha),

    CONSTRAINT fk_asistencia_empleado
        FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_asistencia_revisado
        FOREIGN KEY (revisado_por) REFERENCES usuarios(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- TABLA: ausencias
-- ======================================================

CREATE TABLE ausencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    fecha DATE NOT NULL,
    tipo ENUM('permiso','licencia','vacaciones') NOT NULL,
    justificado_por INT NOT NULL,
    documento_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ausencia_empleado
        FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_ausencia_usuario
        FOREIGN KEY (justificado_por) REFERENCES usuarios(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- TABLA: feriados
-- ======================================================

CREATE TABLE feriados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    descripcion VARCHAR(150),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ======================================================
-- TABLA: nominas
-- ======================================================

CREATE TABLE nominas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL,
    periodo VARCHAR(7) NOT NULL, -- YYYY-MM
    total_base DECIMAL(10,2) DEFAULT 0.00,
    total_descuentos DECIMAL(10,2) DEFAULT 0.00,
    total_horas_extra DECIMAL(10,2) DEFAULT 0.00,
    total_pagar DECIMAL(10,2) DEFAULT 0.00,
    estado ENUM('calculado','pagado') DEFAULT 'calculado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_empleado_periodo (empleado_id, periodo),

    CONSTRAINT fk_nomina_empleado
        FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- TABLA: nomina_detalle
-- ======================================================

CREATE TABLE nomina_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nomina_id INT NOT NULL,
    concepto VARCHAR(100) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    tipo ENUM('ingreso','descuento') NOT NULL,

    CONSTRAINT fk_nomina_detalle
        FOREIGN KEY (nomina_id) REFERENCES nominas(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- TABLA: configuraciones
-- ======================================================

CREATE TABLE configuraciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ======================================================
-- TABLA: auditoria (INMUTABLE)
-- ======================================================

CREATE TABLE auditoria (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id BIGINT NOT NULL,
    accion ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    valor_anterior JSON NULL,
    valor_nuevo JSON NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_auditoria_tabla (tabla_afectada),
    INDEX idx_auditoria_fecha (fecha),

    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ======================================================
-- CONFIGURACIONES INICIALES
-- ======================================================

INSERT INTO configuraciones (clave, valor, descripcion) VALUES
('tolerancia_minutos', '5', 'Minutos de tolerancia para tardanza'),
('factor_extra_diurna', '1.25', 'Multiplicador horas extra diurna'),
('factor_extra_nocturna', '1.50', 'Multiplicador horas extra nocturna'),
('hora_inicio_nocturna', '21:00', 'Hora desde la cual se considera extra nocturna');