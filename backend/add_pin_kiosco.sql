-- ============================================================
-- Script: Agregar columna PIN para Kiosco de Marcación
-- Ejecutar en: sistema_asistencia_nomina
-- ============================================================

USE sistema_asistencia_nomina;

-- Agregar columna pin_kiosco a empleados (idempotente)
SET @column_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'sistema_asistencia_nomina' 
    AND TABLE_NAME = 'empleados' 
    AND COLUMN_NAME = 'pin_kiosco'
);

SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE empleados ADD COLUMN pin_kiosco CHAR(5) NULL COMMENT ''PIN de 5 dígitos para marcación en kiosco'' AFTER estado',
    'SELECT ''pin_kiosco ya existe'' AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'PIN kiosco agregado correctamente (o ya existía)' AS resultado;
