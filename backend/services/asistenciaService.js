const pool = require('../config/db');

class AsistenciaService {
    async resolverFechaYTurno(empleado_id, fecha_hora) {
        // 1. Obtener la fecha en formato YYYY-MM-DD para hoy y ayer
        const fechaHoy = fecha_hora.toISOString().split('T')[0];
        const fechaAyerObj = new Date(fecha_hora);
        fechaAyerObj.setDate(fechaAyerObj.getDate() - 1);
        const fechaAyer = fechaAyerObj.toISOString().split('T')[0];

        // 2. Obtener turnos de ayer y hoy para ver si encajan en un turno nocturno
        // Priorizamos asignaciones específicas (dia_semana IS NOT NULL) sobre generales
        const queryTurnos = `
            SELECT 
                t.id as turno_id,
                t.nombre_turno,
                COALESCE(et.hora_inicio, t.hora_inicio) as hora_inicio, 
                COALESCE(et.hora_fin, t.hora_fin) as hora_fin, 
                COALESCE(et.horas_refrigerio, t.horas_refrigerio) as horas_refrigerio,
                et.dia_semana
            FROM turnos t
            JOIN empleado_turno et ON t.id = et.turno_id
            WHERE et.empleado_id = ? 
              AND et.fecha_inicio <= ? 
              AND (et.fecha_fin >= ? OR et.fecha_fin IS NULL)
              AND (et.dia_semana IS NULL OR et.dia_semana = DAYOFWEEK(?))
            ORDER BY 
              CASE WHEN et.dia_semana IS NOT NULL THEN 0 ELSE 1 END,
              t.hora_inicio ASC
        `;

        // Turnos asignados para ayer
        const [turnosAyer] = await pool.execute(queryTurnos, [empleado_id, fechaAyer, fechaAyer, fechaAyer]);
        
        // Verificar si la marcación pertenece al turno nocturno de ayer
        for (const t of turnosAyer) {
            const horaInicioStr = t.hora_inicio;
            const horaFinStr = t.hora_fin;
            
            const [hIni, mIni] = horaInicioStr.split(':').map(Number);
            const [hFin, mFin] = horaFinStr.split(':').map(Number);
            
            // Si el turno cruza la medianoche (nocturno)
            if (hFin < hIni) {
                const expectedStart = new Date(fechaAyer + 'T00:00:00');
                expectedStart.setHours(hIni, mIni, 0, 0);
                
                const expectedEnd = new Date(fechaHoy + 'T00:00:00');
                expectedEnd.setHours(hFin, mFin, 0, 0);
                
                // Ventana de tolerancia: desde 2 horas antes de iniciar hasta 4 horas después del fin
                const windowStart = new Date(expectedStart);
                windowStart.setHours(windowStart.getHours() - 2);
                
                const windowEnd = new Date(expectedEnd);
                windowEnd.setHours(windowEnd.getHours() + 4);
                
                if (fecha_hora >= windowStart && fecha_hora <= windowEnd) {
                    return { fecha: fechaAyer, turno: t };
                }
            }
        }

        // Si no coincide con ningún turno nocturno de ayer, buscamos en los turnos de hoy
        const [turnosHoy] = await pool.execute(queryTurnos, [empleado_id, fechaHoy, fechaHoy, fechaHoy]);
        
        if (turnosHoy.length === 0) {
            return { fecha: fechaHoy, turno: null };
        }

        // Determinar el turno correspondiente según rango horario
        const horaMarcacion = fecha_hora.getHours();
        let turnoAsignado = null;
        
        for (const t of turnosHoy) {
            const [hIni] = t.hora_inicio.split(':').map(Number);
            const [hFin] = t.hora_fin.split(':').map(Number);
            const finOffset = hFin < hIni ? 24 : 0;
            
            if (horaMarcacion >= hIni && horaMarcacion < hFin + finOffset) {
                turnoAsignado = t;
                break;
            }
        }
        
        if (!turnoAsignado) {
            turnoAsignado = turnosHoy[0];
        }
        
        return { fecha: fechaHoy, turno: turnoAsignado };
    }

    async splitMinutosExtra(desde, hasta) {
        let horaInicioNocturnaStr = '21:00';
        try {
            const [configs] = await pool.execute(
                'SELECT valor FROM configuraciones WHERE clave = "hora_inicio_nocturna"'
            );
            if (configs && configs.length > 0) {
                horaInicioNocturnaStr = configs[0].valor;
            }
        } catch (err) {
            console.error('[Asistencia] Error al leer config hora_inicio_nocturna:', err.message);
        }

        const [hNoc, mNoc] = horaInicioNocturnaStr.split(':').map(Number);
        
        let minutosDiurna = 0;
        let minutosNocturna = 0;
        
        let current = new Date(desde);
        current.setSeconds(0, 0);
        const limit = new Date(hasta);
        limit.setSeconds(0, 0);
        
        while (current < limit) {
            const h = current.getHours();
            // Consideramos horario nocturno desde la hora configurada (ej. 21:00) hasta las 06:00
            if (h >= hNoc || h < 6) {
                minutosNocturna++;
            } else {
                minutosDiurna++;
            }
            current.setMinutes(current.getMinutes() + 1);
        }
        
        return { minutosDiurna, minutosNocturna };
    }

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

            // 1. Resolver fecha de asistencia real y el turno correspondiente
            const { fecha, turno } = await this.resolverFechaYTurno(empleado_id, fecha_hora);

            if (!turno) {
                console.warn(`[Asistencia] Sin turno para empleado ${empleado_id} en ${fecha}. Evento ignorado.`);
                return;
            }

            // 2. Obtener tolerancia configurada
            const [configs] = await pool.execute(
                'SELECT valor FROM configuraciones WHERE clave = "tolerancia_minutos"'
            );
            const tolerancia = parseInt(configs[0]?.valor || '0');

            // 3. Buscar registro existente para esta fecha
            const [asistencias] = await pool.execute(
                'SELECT id, hora_entrada, hora_salida, hora_entrada_2, hora_salida_2, turno_id FROM asistencias WHERE empleado_id = ? AND fecha = ?',
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
                    // Fallback
                    asisFields.push('hora_entrada', 'minutos_tardanza');
                    asisValues.push(fecha_hora, minutosTardanza);
                }

                const placeholders = asisFields.map(() => '?').join(', ');
                await pool.execute(
                    `INSERT INTO asistencias (${asisFields.join(', ')}) VALUES (${placeholders})`,
                    asisValues
                );
                console.log(`[Asistencia] ${tipo} registrada (Nuevo registro) para emp ${empleado_id} en fecha ${fecha}`);
            } else {
                const id = registroExistente.id;
                
                // Determinar el flujo de actualización
                let esEntrada1 = tipo === 'entrada' && !registroExistente.hora_entrada;
                let esSalida1 = tipo === 'salida' && !registroExistente.hora_salida;
                let esEntrada2 = tipo === 'entrada2' && !registroExistente.hora_entrada_2;
                let esSalida2 = tipo === 'salida2' && !registroExistente.hora_salida_2;

                // Fallback secuencial si tipo no es explícito
                if (tipo !== 'entrada' && tipo !== 'salida' && tipo !== 'entrada2' && tipo !== 'salida2') {
                    if (!registroExistente.hora_salida) {
                        esSalida1 = true;
                    } else if (!registroExistente.hora_entrada_2) {
                        esEntrada2 = true;
                    } else {
                        esSalida2 = true;
                    }
                }

                if (esEntrada1) {
                    const minutosTardanza = this.calcularTardanza(fecha_hora, turno, tolerancia);
                    const estado = minutosTardanza > 0 ? 'tardanza' : 'normal';
                    await pool.execute(
                        'UPDATE asistencias SET hora_entrada = ?, minutos_tardanza = ?, estado = ? WHERE id = ?', 
                        [fecha_hora, minutosTardanza, estado, id]
                    );
                    console.log(`[Asistencia] Entrada 1 registrada para emp ${empleado_id} en fecha ${fecha}`);
                }
                else if (esSalida1) {
                    let minutosTrabajados = 0;
                    let minutosExtraDiurna = 0;
                    let minutosExtraNocturna = 0;

                    if (registroExistente.hora_entrada) {
                        const ent1 = new Date(registroExistente.hora_entrada);
                        const elapsed = Math.floor((fecha_hora - ent1) / 60000);
                        
                        // Restar el refrigerio general del turno
                        const refrigerioMins = parseFloat(turno.horas_refrigerio || 0) * 60;
                        minutosTrabajados = Math.max(0, elapsed - refrigerioMins);

                        // Calcular horas extras
                        const expectedEnd = new Date(fecha + 'T' + turno.hora_fin);
                        const [hIni] = turno.hora_inicio.split(':').map(Number);
                        const [hFin] = turno.hora_fin.split(':').map(Number);
                        if (hFin < hIni) {
                            expectedEnd.setDate(expectedEnd.getDate() + 1);
                        }

                        if (fecha_hora > expectedEnd) {
                            const extras = await this.splitMinutosExtra(expectedEnd, fecha_hora);
                            minutosExtraDiurna = extras.minutosDiurna;
                            minutosExtraNocturna = extras.minutosNocturna;
                        }
                    }

                    await pool.execute(
                        `UPDATE asistencias 
                         SET hora_salida = ?, minutos_trabajados = ?, minutos_extra_diurna = ?, minutos_extra_nocturna = ? 
                         WHERE id = ?`, 
                        [fecha_hora, minutosTrabajados, minutosExtraDiurna, minutosExtraNocturna, id]
                    );
                    console.log(`[Asistencia] Salida 1 registrada para emp ${empleado_id} en fecha ${fecha}. Horas trabajadas: ${Math.round(minutosTrabajados/60*100)/100}`);
                }
                else if (esEntrada2) {
                    let merienda = 0;
                    let tardanzaExtra = 0;
                    if (registroExistente.hora_salida) {
                        const salida1 = new Date(registroExistente.hora_salida);
                        merienda = Math.floor((fecha_hora - salida1) / 60000);
                        
                        if (turno.turno_id !== registroExistente.turno_id) {
                            // Está iniciando un turno distinto (horario flexible)
                            tardanzaExtra = this.calcularTardanza(fecha_hora, turno, tolerancia);
                        } else {
                            // Retorno de refrigerio ordinario
                            const limiteMinutos = parseFloat(turno.horas_refrigerio || 0) * 60;
                            if (limiteMinutos > 0 && merienda > limiteMinutos) {
                                tardanzaExtra = merienda - limiteMinutos;
                            }
                        }
                    }
                    
                    // Al entrar en sesión 2, reseteamos las horas trabajadas acumuladas de la sesión 1
                    // para recalcularlas todas al marcar Salida 2
                    await pool.execute(
                        `UPDATE asistencias 
                         SET hora_entrada_2 = ?, minutos_merienda = ?, minutos_tardanza = minutos_tardanza + ?, 
                             minutos_trabajados = 0, minutos_extra_diurna = 0, minutos_extra_nocturna = 0, estado = "tardanza" 
                         WHERE id = ?`, 
                        [fecha_hora, merienda, tardanzaExtra, id]
                    );
                    console.log(`[Asistencia] Entrada 2 registrada para emp ${empleado_id} en fecha ${fecha}. Merienda: ${merienda}m. Tardanza extra: ${tardanzaExtra}m.`);
                }
                else if (esSalida2) {
                    let minutosTrabajados = 0;
                    let minutosExtraDiurna = 0;
                    let minutosExtraNocturna = 0;

                    if (registroExistente.hora_entrada && registroExistente.hora_salida && registroExistente.hora_entrada_2) {
                        const ent1 = new Date(registroExistente.hora_entrada);
                        const sal1 = new Date(registroExistente.hora_salida);
                        const ent2 = new Date(registroExistente.hora_entrada_2);
                        
                        const diff1 = Math.floor((sal1 - ent1) / 60000);
                        const diff2 = Math.floor((fecha_hora - ent2) / 60000);
                        minutosTrabajados = Math.max(0, diff1 + diff2);

                        // Calcular horas extras comparando contra la salida oficial
                        const expectedEnd = new Date(fecha + 'T' + turno.hora_fin);
                        const [hIni] = turno.hora_inicio.split(':').map(Number);
                        const [hFin] = turno.hora_fin.split(':').map(Number);
                        if (hFin < hIni) {
                            expectedEnd.setDate(expectedEnd.getDate() + 1);
                        }

                        if (fecha_hora > expectedEnd) {
                            const extras = await this.splitMinutosExtra(expectedEnd, fecha_hora);
                            minutosExtraDiurna = extras.minutosDiurna;
                            minutosExtraNocturna = extras.minutosNocturna;
                        }
                    }

                    await pool.execute(
                        `UPDATE asistencias 
                         SET hora_salida_2 = ?, minutos_trabajados = ?, minutos_extra_diurna = ?, minutos_extra_nocturna = ? 
                         WHERE id = ?`, 
                        [fecha_hora, minutosTrabajados, minutosExtraDiurna, minutosExtraNocturna, id]
                    );
                    console.log(`[Asistencia] Salida 2 registrada para emp ${empleado_id} en fecha ${fecha}. Horas totales: ${Math.round(minutosTrabajados/60*100)/100}`);
                }
            }

        } catch (error) {
            console.error(`[Asistencia] Error en procesarEvento:`, error.message);
            throw error;
        }
    }

    async recalcularValoresAsistencia(registro, turno, tolerancia) {
        const fecha = registro.fecha instanceof Date ? registro.fecha.toISOString().split('T')[0] : String(registro.fecha).split('T')[0];
        
        let hora_entrada = registro.hora_entrada ? new Date(registro.hora_entrada) : null;
        let hora_salida = registro.hora_salida ? new Date(registro.hora_salida) : null;
        let hora_entrada_2 = registro.hora_entrada_2 ? new Date(registro.hora_entrada_2) : null;
        let hora_salida_2 = registro.hora_salida_2 ? new Date(registro.hora_salida_2) : null;

        let minutos_tardanza = 0;
        let minutos_merienda = null;
        let minutos_trabajados = 0;
        let minutos_extra_diurna = 0;
        let minutos_extra_nocturna = 0;

        // 1. Calcular tardanza de Entrada 1
        if (hora_entrada) {
            minutos_tardanza = this.calcularTardanza(hora_entrada, turno, tolerancia);
        }

        // 2. Calcular merienda y tardanza de Entrada 2
        if (hora_entrada_2 && hora_salida) {
            minutos_merienda = Math.floor((hora_entrada_2 - hora_salida) / 60000);
            
            let tardanzaExtra = 0;
            if (turno.turno_id !== registro.turno_id) {
                tardanzaExtra = this.calcularTardanza(hora_entrada_2, turno, tolerancia);
            } else {
                const limiteMinutos = parseFloat(turno.horas_refrigerio || 0) * 60;
                if (limiteMinutos > 0 && minutos_merienda > limiteMinutos) {
                    tardanzaExtra = minutos_merienda - limiteMinutos;
                }
            }
            minutos_tardanza += tardanzaExtra;
        }

        // 3. Calcular minutos trabajados y extras
        if (hora_entrada && hora_salida && hora_entrada_2 && hora_salida_2) {
            // Caso completo: Dos sesiones
            const diff1 = Math.floor((hora_salida - hora_entrada) / 60000);
            const diff2 = Math.floor((hora_salida_2 - hora_entrada_2) / 60000);
            minutos_trabajados = Math.max(0, diff1 + diff2);

            // Extras al finalizar el día
            const expectedEnd = new Date(fecha + 'T' + turno.hora_fin);
            const [hIni] = turno.hora_inicio.split(':').map(Number);
            const [hFin] = turno.hora_fin.split(':').map(Number);
            if (hFin < hIni) {
                expectedEnd.setDate(expectedEnd.getDate() + 1);
            }

            if (hora_salida_2 > expectedEnd) {
                const extras = await this.splitMinutosExtra(expectedEnd, hora_salida_2);
                minutosExtraDiurna = extras.minutosDiurna;
                minutosExtraNocturna = extras.minutosNocturna;
            }
        } else if (hora_entrada && hora_salida) {
            // Solo primera sesión completada
            const elapsed = Math.floor((hora_salida - hora_entrada) / 60000);
            const refrigerioMins = parseFloat(turno.horas_refrigerio || 0) * 60;
            minutos_trabajados = Math.max(0, elapsed - refrigerioMins);

            // Extras tras salida 1
            const expectedEnd = new Date(fecha + 'T' + turno.hora_fin);
            const [hIni] = turno.hora_inicio.split(':').map(Number);
            const [hFin] = turno.hora_fin.split(':').map(Number);
            if (hFin < hIni) {
                expectedEnd.setDate(expectedEnd.getDate() + 1);
            }

            if (hora_salida > expectedEnd) {
                const extras = await this.splitMinutosExtra(expectedEnd, hora_salida);
                minutosExtraDiurna = extras.minutosDiurna;
                minutosExtraNocturna = extras.minutosNocturna;
            }
        }

        const estado = minutos_tardanza > 0 ? 'tardanza' : 'normal';

        return {
            minutos_tardanza,
            minutos_merienda,
            minutos_trabajados,
            minutos_extra_diurna,
            minutos_extra_nocturna,
            estado
        };
    }

    async recalcularAsistencia(empleadoId, fecha, turno, tolerancia) {
        // Obtener el registro actual
        const [asistencias] = await pool.execute(
            'SELECT * FROM asistencias WHERE empleado_id = ? AND fecha = ?',
            [empleadoId, fecha]
        );

        if (asistencias.length === 0) return;

        const registro = asistencias[0];

        // Si todas las horas son null, eliminar el registro
        if (!registro.hora_entrada && !registro.hora_salida && !registro.hora_entrada_2 && !registro.hora_salida_2) {
            // Eliminar las justificaciones de esa asistencia
            await pool.execute(
                'DELETE FROM justificaciones WHERE asistencia_id = ?',
                [registro.id]
            );
            // Eliminar la asistencia
            await pool.execute(
                'DELETE FROM asistencias WHERE id = ?',
                [registro.id]
            );
            console.log(`[Asistencia] Registro eliminado por completo para emp ${empleadoId} en fecha ${fecha}`);
            return;
        }

        // Recalcular valores
        const nuevosValores = await this.recalcularValoresAsistencia(registro, turno, tolerancia);

        // Actualizar la fila en base de datos
        await pool.execute(
            `UPDATE asistencias 
             SET minutos_tardanza = ?, minutos_merienda = ?, minutos_trabajados = ?, 
                 minutos_extra_diurna = ?, minutos_extra_nocturna = ?, estado = ? 
             WHERE id = ?`,
            [
                nuevosValores.minutos_tardanza,
                nuevosValores.minutos_merienda,
                nuevosValores.minutos_trabajados,
                nuevosValores.minutos_extra_diurna,
                nuevosValores.minutos_extra_nocturna,
                nuevosValores.estado,
                registro.id
            ]
        );
        console.log(`[Asistencia] Registro recalculado para emp ${empleadoId} en fecha ${fecha}`);
    }

    // Métodos heredados/auxiliares para compatibilidad
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

    async calcularTiempoEfectivo(id, hora_salida, turno, hora_entrada_override = null) {
        try {
            const [rows] = await pool.execute('SELECT hora_entrada FROM asistencias WHERE id = ?', [id]);
            const hora_entrada = hora_entrada_override || (rows[0] ? rows[0].hora_entrada : null);
            if (!hora_entrada) return 0;
            const elapsed = Math.floor((new Date(hora_salida) - new Date(hora_entrada)) / 60000);
            const refrigerio = parseFloat(turno.horas_refrigerio || 0) * 60;
            return Math.max(0, elapsed - refrigerio);
        } catch (e) {
            return 0;
        }
    }

    calcularTardanza(hora_marcacion, turno, tolerancia) {
        if (!turno?.hora_inicio) return 0;
        const [h, m] = turno.hora_inicio.split(':').map(Number);
        
        const horaInicioTurno = new Date(hora_marcacion);
        horaInicioTurno.setHours(h, m, 0, 0);

        // Ajustar fecha si cruza la medianoche (se marca después de medianoche)
        if (horaInicioTurno - hora_marcacion > 12 * 60 * 60 * 1000) {
            horaInicioTurno.setDate(horaInicioTurno.getDate() - 1);
        } else if (hora_marcacion - horaInicioTurno > 12 * 60 * 60 * 1000) {
            horaInicioTurno.setDate(horaInicioTurno.getDate() + 1);
        }

        const diffMins = Math.floor((hora_marcacion - horaInicioTurno) / 60000);
        return diffMins > tolerancia ? diffMins : 0;
    }

    calcularExtras(hora_marcacion, turno) {
        if (!turno?.hora_fin) return 0;
        const [h, m] = turno.hora_fin.split(':').map(Number);
        const horaFinTurno = new Date(hora_marcacion);
        horaFinTurno.setHours(h, m, 0, 0);

        // Ajuste por cruce de medianoche en la salida
        if (horaFinTurno - hora_marcacion > 12 * 60 * 60 * 1000) {
            horaFinTurno.setDate(horaFinTurno.getDate() - 1);
        } else if (hora_marcacion - horaFinTurno > 12 * 60 * 60 * 1000) {
            horaFinTurno.setDate(horaFinTurno.getDate() + 1);
        }

        const diffMins = Math.floor((hora_marcacion - horaFinTurno) / 60000);
        return diffMins > 0 ? diffMins : 0;
    }

    async calcularTiempoEfectivoTotal(registro, hora_salida_2, turno) {
        const ent1 = new Date(registro.hora_entrada);
        const sal1 = new Date(registro.hora_salida);
        const ent2 = new Date(registro.hora_entrada_2);
        const sal2 = new Date(hora_salida_2);

        const diff1 = Math.floor((sal1 - ent1) / 60000);
        const diff2 = Math.floor((sal2 - ent2) / 60000);

        const totalMins = diff1 + diff2;
        return totalMins > 0 ? totalMins : 0;
    }
}

module.exports = new AsistenciaService();