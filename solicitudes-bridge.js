/**
 * FondoUne — solicitudes-bridge.js
 * Convierte solicitudes del portal (creditApp) al formato de la bandeja del analista.
 * Incluir después de creditos-config.js y session.js.
 */

const FondouneSolicitudes = (() => {

  const LINEA_PORTAL_TO_CONFIG = {
    libre:         'libre_inversion',
    crediexpress:  'crediexpress',
    educativo:     'educativo',
    vivienda:      'vivienda',
    salud:         'salud',
    vehiculo:      'vehiculos',
    vacacional:    'vacacional',
    creditributo:  'creditributo',
    solidario:     'solidario',
    especial:      'especial',
    crediprima:    'crediprima',
  };

  const REC_COLORS = {
    APROBAR:  '#3B82F6',
    REVISAR:  '#F59E0B',
    RECHAZAR: '#EF4444',
  };

  /** Reglas de negocio prototipo (alineadas a política FondoUne) */
  const REGLAS = {
    LIMITE_COMPROMISO_PCT: 35,
    MONTO_GERENCIA:        15000000,
  };

  function fmtCOP(n) {
    return '$' + Number(n || 0).toLocaleString('es-CO');
  }

  function initials(nombre) {
    return (nombre || 'NA')
      .split(' ')
      .filter(Boolean)
      .map(p => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function nowTimeLabel() {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  }

  function tiempoRelativo(iso) {
    if (!iso) return 'Hace un momento';
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return 'Hace un momento';
    if (min < 60) return `Hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Hace ${h} h`;
    return `Hace ${Math.floor(h / 24)} d`;
  }

  function inferRec(score, pct) {
    if (pct > 50 || score < 550) return 'RECHAZAR';
    if (pct > 35 || score < 650) return 'REVISAR';
    return 'APROBAR';
  }

  function generarSolicitudId() {
    const y = new Date().getFullYear();
    const seq = String(Date.now()).slice(-4);
    return `SOL-${y}-${seq}`;
  }

  /**
   * Arma creditApp desde el portal (paso 5).
   */
  function buildFromPortal({ solicitud, asociado, lineaKey, destino, cedula }) {
    const s = solicitud || {};
    const d = asociado || {};
    const lineaId = LINEA_PORTAL_TO_CONFIG[lineaKey] || 'libre_inversion';
    const linea = typeof FondouneCreditos !== 'undefined'
      ? (FondouneCreditos.getLinea(lineaId)?.nombre || s.linea)
      : (s.linea || 'Libre inversión');

    const plazo = s.plazo || 24;
    const monto = s.monto || 0;
    let tasaEA = s.tasaEA;
    let cuota = s.cuota;

    if (typeof FondouneCreditos !== 'undefined') {
      tasaEA = FondouneCreditos.getTasaEA(lineaId, plazo) ?? tasaEA ?? 16.11;
      cuota = FondouneCreditos.calcularCuota(monto, plazo, tasaEA);
    }

    const tasaEM = typeof FondouneCreditos !== 'undefined'
      ? FondouneCreditos.eaAMensual(tasaEA) * 100
      : (s.tasaEM || 0) * 100;

    const neto = d.neto || 3000000;
    const pct = neto ? (cuota / neto) * 100 : 0;
    const score = d.score || d.scoreDataCredito || 720;
    const rec = inferRec(score, pct);

    const ced = d.cedula || cedula || '';
    const cedDigits = ced.replace(/\D/g, '');

    return {
      solicitudId: generarSolicitudId(),
      monto,
      plazo,
      plazoLabel: plazo + ' meses',
      tipo: linea,
      lineaId,
      destino: destino || 'Según declaración del asociado',
      tasaEA,
      tasaEM,
      cuota,
      totalPagar: cuota * plazo,
      score,
      rec,
      riesgo: rec === 'RECHAZAR' ? 'alto' : pct > 35 ? 'medio' : 'bajo',
      estado: 'pendiente',
      origen: 'portal_asociado',
      asociado: {
        nombre: d.nombre || 'Asociado',
        correo: d.correo || (cedDigits ? cedDigits + '@une.net.co' : 'asociado@une.net.co'),
        cedula: ced,
        empresa: d.empresa || '—',
        cargo: d.cargo || '—',
        neto,
        cuotaMaxima: d.cuotaMaxima || Math.max(0, Math.round(neto * 0.35)),
      },
      kyc: {
        cedula: 'ok',
        rnec: 'ok',
        liveness: 'ok',
        biometria: 'ok',
        sarlaft: 'ok',
        uiaf: 'ok',
      },
      nomina: {
        bas: d.salarioBasico || Math.round(neto * 0.9),
        dev: d.devengado || Math.round(neto * 1.1),
        ded: d.deducciones || Math.round(neto * 0.2),
        neto,
        lib: d.libranzas || 0,
        emp: d.empresa || '—',
        per: d.periodoNomina || 'Actual',
      },
      dc: {
        score,
        estado: d.scoreEstado || 'Sin novedad',
        obli: d.obligaciones ?? d.creditosActivos ?? 0,
        endeuda: d.endeudamiento || 0,
        comp: d.comportamientoPago || 'Evaluación automática · Portal asociado',
      },
      historial: d.historialFondo || 'Solicitud ingresada por portal',
      capacidadPago: d.cuotaMaxima || Math.max(0, Math.round(neto * 0.35 - cuota)),
      log: [
        {
          ts: nowTimeLabel(),
          txt: `Solicitud recibida · Portal asociado · ${linea} · ${fmtCOP(monto)} / ${plazo} meses`,
          dot: 'dot-blue',
        },
        {
          ts: nowTimeLabel(),
          txt: `Pre-aprobación IA · Tasa ${Number(tasaEA).toFixed(2)}% E.A. · Recomendación: <strong>${rec}</strong>`,
          dot: 'dot-gold',
        },
      ],
    };
  }

  /**
   * Convierte creditApp al registro de la bandeja del analista (modulo2).
   */
  function toAnalystRecord(app) {
    const a = app.asociado || {};
    const nom = app.nomina || {};
    const dc = app.dc || {};
    const neto = nom.neto || a.neto || 1;
    const cuota = app.cuota || 0;
    const pct = app.pctCompromiso != null
      ? Number(app.pctCompromiso)
      : parseFloat(((cuota / neto) * 100).toFixed(1));
    const score = dc.score ?? app.score ?? 700;
    const rec = app.rec || inferRec(score, pct);
    const sp = Math.min(99, Math.round((score / 900) * 100));

    return {
      id: app.solicitudId,
      nombre: a.nombre,
      ced: a.cedula,
      empresa: a.empresa || nom.emp || '—',
      cargo: a.cargo || '—',
      tiempo: tiempoRelativo(app._queuedAt),
      ts: nowTimeLabel(),
      monto: app.monto,
      plazo: app.plazo,
      tipo: app.tipo,
      destino: app.destino || '—',
      score,
      sp,
      riesgo: app.riesgo || (rec === 'RECHAZAR' ? 'alto' : pct > 35 ? 'medio' : 'bajo'),
      estado: app.estado || 'pendiente',
      kyc: app.kyc || {},
      dc: {
        score,
        estado: dc.estado || 'Sin novedad',
        obli: dc.obli ?? 0,
        endeuda: dc.endeuda ?? 0,
        comp: dc.comp || '—',
      },
      nom: {
        bas: nom.bas ?? neto,
        dev: nom.dev ?? neto,
        ded: nom.ded ?? 0,
        neto,
        lib: nom.lib ?? 0,
        emp: nom.emp || a.empresa,
        per: nom.per || 'Actual',
      },
      cap: app.capacidadPago ?? a.cuotaMaxima ?? Math.max(0, Math.round(neto * 0.35 - cuota)),
      cuota,
      pct,
      hist: app.historial || '—',
      rec,
      col: REC_COLORS[rec] || REC_COLORS.APROBAR,
      ini: initials(a.nombre),
      log: Array.isArray(app.log) ? app.log : [],
      _fromPortal: app.origen === 'portal_asociado',
      _queuedAt: app._queuedAt,
    };
  }

  function puedeAprobarDirecto(record) {
    const monto = record.monto || 0;
    const pct = record.pct != null ? record.pct : 0;
    return monto < REGLAS.MONTO_GERENCIA && pct <= REGLAS.LIMITE_COMPROMISO_PCT;
  }

  function requiereGerencia(record) {
    return !puedeAprobarDirecto(record);
  }

  function mensajeReglas(record) {
    const partes = [];
    if ((record.monto || 0) >= REGLAS.MONTO_GERENCIA) {
      partes.push(
        'monto ≥ ' + fmtCOP(REGLAS.MONTO_GERENCIA) + ' requiere gerencia'
      );
    }
    if ((record.pct || 0) > REGLAS.LIMITE_COMPROMISO_PCT) {
      partes.push(
        '% compromiso ' + record.pct + '% supera el límite del ' +
        REGLAS.LIMITE_COMPROMISO_PCT + '%'
      );
    }
    return partes.join(' · ');
  }

  /** Actualiza líneas de log con tasa vigente (creditos-config). */
  function normalizeLogHtml(record, txt, getTasaEA) {
    if (!txt || typeof getTasaEA !== 'function') return txt;
    const lower = txt.toLowerCase();
    if (
      lower.includes('tasa aplicable') ||
      lower.includes('% e.a.') ||
      lower.includes('tabla feb') ||
      lower.includes('tabla vigente')
    ) {
      const ea = getTasaEA(record.tipo, record.plazo).toFixed(2);
      return (
        'Tasa aplicable: <strong>' + ea + '% E.A.</strong> (tabla vigente · ' +
        record.tipo + ' · ' + record.plazo + ' meses)'
      );
    }
    return txt;
  }

  /** Registro analista → creditApp para colas de sesión. */
  function analystToCreditApp(record) {
    const lineaId = Object.entries(LINEA_PORTAL_TO_CONFIG).find(
      ([, id]) => {
        const cfg = typeof FondouneCreditos !== 'undefined'
          ? FondouneCreditos.getLinea(id)
          : null;
        return cfg && cfg.nombre === record.tipo;
      }
    )?.[1] || null;

    let tasaEA = record.tasaEA;
    if (tasaEA == null && lineaId && typeof FondouneCreditos !== 'undefined') {
      tasaEA = FondouneCreditos.getTasaEA(lineaId, record.plazo);
    }

    return {
      solicitudId: record.id,
      monto: record.monto,
      plazo: record.plazo,
      plazoLabel: record.plazo + ' meses',
      tipo: record.tipo,
      lineaId,
      destino: record.destino,
      tasaEA,
      tasaEM: tasaEA && typeof FondouneCreditos !== 'undefined'
        ? FondouneCreditos.eaAMensual(tasaEA) * 100
        : null,
      cuota: record.cuota,
      totalPagar: record.cuota * record.plazo,
      score: record.score,
      rec: record.rec,
      riesgo: record.riesgo,
      estado: record.estado,
      pctCompromiso: record.pct,
      asociado: {
        nombre: record.nombre,
        cedula: record.ced,
        empresa: record.empresa,
        cargo: record.cargo,
        neto: record.nom?.neto,
        cuotaMaxima: record.cap,
      },
      kyc: record.kyc,
      nomina: record.nom,
      dc: record.dc,
      historial: record.hist,
      log: record.log,
      origen: record._fromPortal ? 'portal_asociado' : 'bandeja_analista',
    };
  }

  return {
    LINEA_PORTAL_TO_CONFIG,
    REGLAS,
    buildFromPortal,
    toAnalystRecord,
    analystToCreditApp,
    puedeAprobarDirecto,
    requiereGerencia,
    mensajeReglas,
    normalizeLogHtml,
    generarSolicitudId,
    fmtCOP,
  };

})();
