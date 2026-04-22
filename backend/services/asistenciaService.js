const pool = require('../config/db');

class AsistenciaService {
    async procesarEvento(evento) {
        try {
            let { empleado_id, fecha_hora, tipo, evento_id } = evento;

            if (!(fecha_hora instanceof Date)) {
                fecha_hora = new Date(fecha_hora);
            }

            if (isNaN(fecha_hora.getTime())) {
                console.warn(`[Asistencia] Fecha inválida para evento_id ${evento_id}, ignorando.`);
                return;
            }

            const fecha = fecha_hora.toISOString().split('T')[0];
            const horaMarcacion = fecha_hora.getHours();

            // 1. Obtener todos los turnos del empleado para el día
            const [turnos] = await pool.execute(
                `SELECT 
                    t.id as turno_id,
                    t.nombre_turno,
                    COALESCE(et.hora_inicio, t.hora_inicio) as hora_inicio, 
                    COALESCE(et.hora_fin, t.hora_fin) as hora_fin, 
                    COALESCE(et.horas_refrigerio, t.horas_refrigerio) as horas_refrigerio,
                    COALESCE(et.es_tarde, FALSE) as es_tarde
                 FROM turnos t
                 JOIN empleado_turno et ON t.id = et.turno_id
                 WHERE et.empleado_id = ? 
                   AND et.fecha_inicio <= ? 
                   AND (et.fecha_fin >= ? OR et.fecha_fin IS NULL)
                   AND (et.dia_semana IS NULL OR et.dia_semana = DAYOFWEEK(?))
                 ORDER BY t.hora_inicio ASC`,
                [empleado_id, fecha, fecha, fecha]
            );

            if (turnos.length === 0) {
                console.warn(`[Asistencia] Sin turno para empleado ${empleado_id} en ${fecha}. Evento ignorado.`);
                return;
            }

            // 2. Determinar a qué turno pertenece la marcación
            let turnoAsignado = null;
            for (const t of turnos) {
                const horaInicio = parseInt(t.hora_inicio.split(':')[0]);
                const horaFin = parseInt(t.hora_fin.split(':')[0]);
                
                if (horaMarcacion >= horaInicio && horaMarcacion < horaFin + (horaFin < horaInicio ? 24 : 0)) {
                    turnoAsignado = t;
                    break;
                }
            }

            if (!turnoAsignado) {
                turnoAsignado = turnos[0];
            }

            const turno = turnoAsignado;

            // 3. Tolerancia configurada
            const [configs] = await pool.execute(
                'SELECT valor FROM configuraciones WHERE clave = "tolerancia_minutos"'
            );
            const tolerancia = parseInt(configs[0]?.valor || '0');

            // 4. Buscar registro existente para este empleado y fecha
            const [asistencias] = await pool.execute(
                'SELECT id, hora_entrada, hora_salida, hora_entrada_2, hora_salida_2, turno_id FROM asistenciaS WHERE empleado_id = ? AND fecha = ?',
                [empleado_id, fecha]
            );

            const registroExistente = asistencias[0];

            if (!registroExistente) {
                // Nuevo registro del día
                const minutosTardanza = tipo === 'entrada' ? this.calcularTardanza(fecha_hora, turno, tolerancia) : 0;
                const estado = minutosTardanza > 0 ? 'tardanza' : 'normal';

                const asisFields = ['empleado_id', 'fecha', 'estado', 'turno_id'];
                const asisValues = [empleado_id, fecha, estado, turno.turno_id];

                if (tipo === 'entrada') {
                    asisFields.push('hora_entrada', 'minutos_tardanza');
                    asisValues.push(fecha_hora, minutosTardanza);
                } else if (tipo === 'salida') {
                    asisFields.push('hora_salida');
                    asisValues.push(fecha_hora);
                } else if (tipo === 'entrada2') {
                    asisFields.push('hora_entrada_2');
                    asisValues.push(fecha_hora);
                } else if (tipo === 'salida2') {
                    asisFields.push('hora_salida_2');
                    asisValues.push(fecha_hora);
                } else {
                    // Fallback to sequential
                    asisFields.push('hora_entrada', 'minutos_tardanza');
                    asisValues.push(fecha_hora, minutosTardanza);
                }

                const placeholders = asisFields.map(() => '?').join(', ');
                await pool.execute(
                    `INSERT INTO asistencias (${asisFields.join(', ')}) VALUES (${placeholders})`,
                    asisValues
                );
                console.log(`[Asistencia] ${tipo} registrada (Nuevo registro) para emp ${empleado_id}`);
            } else {
                const id = registroExistente.id;
                
                // Si el tipo viene de manera explícita (entrada2, salida2, entrada, salida) por normalizacionService
                if (tipo === 'entrada' && !registroExistente.hora_entrada) {
                    const minutosTardanza = this.calcularTardanza(fecha_hora, turno, tolerancia);
                    const estado = minutosTardanza > 0 ? 'tardanza' : 'normal';
                    await pool.execute('UPDATE asistencias SET hora_entrada = ?, minutos_tardanza = ?, estado = ? WHERE id = ?', [fecha_hora, minutosTardanza, estado, id]);
                    console.log(`[Asistencia] Entrada 1 registrada explícita para emp ${empleado_id}`);
                }
                else if (tipo === 'salida' && !registroExistente.hora_salida) {
                    await pool.execute('UPDATE asistencias SET hora_salida = ? WHERE id = ?', [fecha_hora, id]);
                    console.log(`[Asistencia] Salida 1 registrada explícita para emp ${empleado_id}`);
                }
                else if (tipo === 'entrada2' && !registroExistente.hora_entrada_2) {
                    let merienda = 0;
                    let tardanzaExtra = 0;
                    if (registroExistente.hora_salida) {
                        const salida1 = new Date(registroExistente.hora_salida);
                        merienda = Math.floor((fecha_hora - salida1) / 60000);
                        
                        if (turno.turno_id !== registroExistente.turno_id) {
                            // Está iniciando un turno distinto en el mismo día (Horario Partido / Flexible)
                            tardanzaExtra = this.calcularTardanza(fecha_hora, turno, tolerancia);
                        } else {
                            // Está regresando de refrigerio del mismo turno
                            const limiteMinutos = parseFloat(turno.horas_refrigerio || 0) * 60;
                            if (limiteMinutos > 0 && merienda > limiteMinutos) {
                                tardanzaExtra = merienda - limiteMinutos;
                            }
                        }
                    }
                    
                    if (tardanzaExtra > 0) {
                        await pool.execute('UPDATE asistencias SET hora_entrada_2 = ?, minutos_merienda = ?, minutos_tardanza = minutos_tardanza + ?, estado = "tardanza" WHERE id = ?', [fecha_hora, merienda > 0 ? merienda : 0, tardanzaExtra, id]);
                    } else {
                        await pool.execute('UPDATE asistencias SET hora_entrada_2 = ?, minutos_merienda = ? WHERE id = ?', [fecha_hora, merienda > 0 ? merienda : 0, id]);
                    }
                    console.log(`[Asistencia] Entrada 2 registrada explícita para emp ${empleado_id}. Merienda: ${merienda}m. Tardanza extra: ${tardanzaExtra}m.`);
                }
                else if (tipo === 'salida2') {
                    const minutosTrabajados = await this.calcularTiempoEfectivoTotal(registroExistente, fecha_hora, turno);
                    await pool.execute('UPDATE asistencias SET hora_salida_2 = ?, minutos_trabajados = ? WHERE id = ?', [fecha_hora, minutosTrabajados, id]);
                    console.log(`[Asistencia] Salida 2 registrada explícita para emp ${empleado_id}. Horas totales: ${Math.round(minutosTrabajados/60*100)/100}`);
                }
                else {
                    // SEAMLESS FALLBACK SEQUENTIAL (SI TIPO = OTROS, o si la columna ya esta llena y forzamos secuencia)
                    if (!registroExistente.hora_salida) {
                        await pool.execute('UPDATE asistencias SET hora_salida = ? WHERE id = ?', [fecha_hora, id]);
                        console.log(`[Asistencia] Salida 1 registrada (Secuencial) para emp ${empleado_id}`);
                    } 
                    else if (!registroExistente.hora_entrada_2) {
                        const salida1 = new Date(registroExistente.hora_salida);
                        const merienda = Math.floor((fecha_hora - salida1) / 60000);
                        let tardanzaExtra = 0;
                        
                        if (turno.turno_id !== registroExistente.turno_id) {
                            // Está iniciando un turno distinto en el mismo día (Horario Partido / Flexible)
                            tardanzaExtra = this.calcularTardanza(fecha_hora, turno, tolerancia);
                        } else {
                            // Está regresando de refrigerio del mismo turno
                            const limiteMinutos = parseFloat(turno.horas_refrigerio || 0) * 60;
                            if (limiteMinutos > 0 && merienda > limiteMinutos) {
                                tardanzaExtra = merienda - limiteMinutos;
                            }
                        }

                        if (tardanzaExtra > 0) {
                            await pool.execute('UPDATE asistencias SET hora_entrada_2 = ?, minutos_merienda = ?, minutos_tardanza = minutos_tardanza + ?, estado = "tardanza" WHERE id = ?', [fecha_hora, merienda > 0 ? merienda : 0, tardanzaExtra, id]);
                        } else {
                            await pool.execute('UPDATE asistencias SET hora_entrada_2 = ?, minutos_merienda = ? WHERE id = ?', [fecha_hora, merienda > 0 ? merienda : 0, id]);
                        }
                        
                        console.log(`[Asistencia] Entrada 2 registrada (Secuencial) para emp ${empleado_id}. Merienda: ${merienda}m. Tardanza extra: ${tardanzaExtra}m.`);
                    }
                    else {
                        const minutosTrabajados = await this.calcularTiempoEfectivoTotal(registroExistente, fecha_hora, turno);
                        await pool.execute('UPDATE asistencias SET hora_salida_2 = ?, minutos_trabajados = ? WHERE id = ?', [fecha_hora, minutosTrabajados, id]);
                        console.log(`[Asistencia] Salida 2 registrada (Secuencial) para emp ${empleado_id}. Horas totales: ${Math.round(minutosTrabajados/60*100)/100}`);
                    }
                }
            }

        } catch (error) {
            console.error(`[Asistencia] Error en procesarEvento:`, error.message);
            throw error;
        }
    }

    async registrarEntrada(empleado_id, fecha, hora_marcacion, turno, tolerancia) {
        const minutosTardanza = this.calcularTardanza(hora_marcacion, turno, tolerancia);
        const estado = minutosTardanza > 0 ? 'tardanza' : 'normal';

        await pool.execute(
            `INSERT INTO asistencias (empleado_id, fecha, hora_entrada, minutos_tardanza, estado, turno_id) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [empleado_id, fecha, hora_marcacion, minutosTardanza, estado, turno.turno_id]
        );
    }

    async actualizarSalida(id, hora_marcacion, turno) {
        const minutosExtraDiurna = this.calcularExtras(hora_marcacion, turno);
        const minutosTrabajados = await this.calcularTiempoEfectivo(id, hora_marcacion, turno);

        await pool.execute(
            `UPDATE asistencias 
             SET hora_salida = ?, minutos_extra_diurna = ?, minutos_trabajados = ? 
             WHERE id = ?`,
            [hora_marcacion, minutosExtraDiurna, minutosTrabajados, id]
        );
    }

    async corregirEntradaTemprana(id, empleado_id, fecha, nueva_entrada, vieja_entrada, turno, tolerancia) {
        const minutosTardanza = this.calcularTardanza(nueva_entrada, turno, tolerancia);
        const estado = minutosTardanza > 0 ? 'tardanza' : 'normal';
        const minutosExtraDiurna = this.calcularExtras(new Date(vieja_entrada), turno);
        const minutosTrabajados = await this.calcularTiempoEfectivo(id, new Date(vieja_entrada), turno, nueva_entrada);

        await pool.execute(
            `UPDATE asistencias 
             SET hora_entrada = ?, hora_salida = ?, minutos_tardanza = ?, 
                 minutos_extra_diurna = ?, minutos_trabajados = ?, estado = ?, turno_id = ?
             WHERE id = ?`,
            [nueva_entrada, vieja_entrada, minutosTardanza, minutosExtraDiurna, minutosTrabajados, estado, turno.turno_id, id]
        );
    }

    calcularTardanza(hora_marcacion, turno, tolerancia) {
        if (!turno?.hora_inicio) return 0;
        const [h, m] = turno.hora_inicio.split(':').map(Number);
        const horaInicioTurno = new Date(hora_marcacion);
        horaInicioTurno.setHours(h, m, 0, 0);

        const diffMins = Math.floor((hora_marcacion - horaInicioTurno) / 60000);
        return diffMins > tolerancia ? diffMins : 0;
    }

    calcularExtras(hora_marcacion, turno) {
        if (!turno?.hora_fin) return 0;
        const [h, m] = turno.hora_fin.split(':').map(Number);
        const horaFinTurno = new Date(hora_marcacion);
        horaFinTurno.setHours(h, m, 0, 0);

        const diffMins = Math.floor((hora_marcacion - horaFinTurno) / 60000);
        return diffMins > 0 ? diffMins : 0;
    }

    async calcularTiempoEfectivoTotal(registro, hora_salida_2, turno) {
        const ent1 = new Date(registro.hora_entrada);
        const sal1 = new Date(registro.hora_salida);
        const ent2 = new Date(registro.hora_entrada_2);
        const sal2 = new Date(hora_salida_2);

        // Sesión 1
        const diff1 = Math.floor((sal1 - ent1) / 60000);
        // Sesión 2
        const diff2 = Math.floor((sal2 - ent2) / 60000);

        // Sumar ambas y restar refrigerio general si no se restó ya por la brecha natural
        const totalMins = diff1 + diff2;
        return totalMins > 0 ? totalMins : 0;
    }
}

module.exports = new AsistenciaService();