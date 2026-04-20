-- Actualizar esquema para soportar múltiples turnos (mañana/tarde) por día
-- Ejecutar en MySQL

-- 1. Agregar columna turno_id a la tabla de asistencias
ALTER TABLE asistencias 
ADD COLUMN turno_id INT NULL AFTER fecha,
ADD INDEX idx_asistencia_turno (empleado_id, fecha, turno_id);

-- 2. Agregar columna turno_id a empleado_turno para identificar tipo de turno
ALTER TABLE empleado_turno 
ADD COLUMN es_tarde BOOLEAN DEFAULT FALSE AFTER turno_id;

-- 3. Actualizar la tabla de empleados para mantener compatibilidad
-- No es necesario modificar

-- 4. Recalcular y reinsertar datos existentes (opcional)
-- Esto dependerá de los datos actuales