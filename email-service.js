/**
 * FondoUne — email-service.js
 * ─────────────────────────────────────────────────────────────────
 * Envía correos transaccionales a través de un proxy seguro en
 * Google Apps Script (el mismo proyecto que ya usas para Sheets).
 *
 * POR QUÉ ASÍ: la API key de Resend NUNCA debe vivir en el HTML/JS
 * que se sube a GitHub Pages, porque el repo es público y cualquiera
 * puede leer el código fuente. En vez de llamar a Resend directo
 * desde el navegador, este archivo le pide a tu Apps Script (que
 * vive en script.google.com, invisible para el navegador) que envíe
 * el correo. La key queda guardada solo ahí, en Script Properties.
 *
 * Requiere: agregar la función enviarEmailProxy() a tu Code.gs
 * existente (ver archivo AGREGAR-a-CodeGS.gs).
 *
 * Uso (sin cambios desde el resto del portal):
 *   await EmailService.enviarAprobacion({ solicitud, linkFirma });
 *   await EmailService.enviarRechazo({ solicitud, motivo });
 *   await EmailService.enviarConfirmacionFirma({ solicitud });
 * ─────────────────────────────────────────────────────────────────
 */

const EmailService = (() => {

  // URL de tu Web App de Apps Script — LA MISMA que usas en
  // sheets-connector.js. Si no la tienes a la mano, en el editor
  // de Apps Script: Implementar → Administrar implementaciones →
  // copiar la "URL de la app web".
  const APPS_SCRIPT_URL = 'PEGA_AQUI_LA_MISMA_URL_DE_TU_APPS_SCRIPT_DE_SHEETS';

  // Remitente — mientras no tengas dominio verificado en Resend
  // usa onboarding@resend.dev (solo puede enviar a tu propio email)
  // Cuando verifiques tu dominio, cambia esto en Code.gs (no aquí)
  // por: 'FondoUne <notificaciones@fondoune.com>'

  // URL base del portal (donde viven los módulos)
  const BASE_URL = 'https://fondoune-portal.github.io/Creditos';

  // ── Helper principal — ahora llama al proxy, no a Resend directo ─
  async function _enviar({ to, subject, html }) {
    try {
      const resp = await fetch(APPS_SCRIPT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        // Apps Script doPost(e) lee esto desde e.postData.contents
        body: JSON.stringify({ action: 'enviarEmail', to, subject, html }),
      });

      const data = await resp.json();

      if (!data.ok) {
        console.error('[EmailService] ❌ Error vía proxy:', data.error);
        return { ok: false, error: data.error || 'Error desconocido del proxy.' };
      }

      console.log('[EmailService] ✅ Correo enviado a:', to, '| ID:', data.id);
      return { ok: true, id: data.id };

    } catch (e) {
      console.error('[EmailService] ❌ Error de red:', e);
      return { ok: false, error: e.message };
    }
  }

  // ── Helpers de formato ─────────────────────────────────────────
  function _fmtCOP(n) {
    return '$' + Number(n).toLocaleString('es-CO');
  }

  function _fmtFecha(date) {
    if (!date) return '—';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  // ── Plantilla base compartida ──────────────────────────────────
  function _plantillaBase(contenido) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FondoUne</title>
</head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px;background:#ffffff;border-radius:12px;
                      overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:#0B2545;padding:28px 32px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;background:#C9963B;border-radius:8px;
                            display:inline-block;vertical-align:middle;"></div>
                <span style="font-size:20px;font-weight:700;color:#ffffff;
                             vertical-align:middle;letter-spacing:-0.3px;">FondoUne</span>
              </div>
              <p style="margin:6px 0 0;font-size:11px;color:#7A9CC0;letter-spacing:0.05em;
                        text-transform:uppercase;">Fondo de Empleados UNE</p>
            </td>
          </tr>

          <!-- CONTENIDO DINÁMICO -->
          ${contenido}

          <!-- FOOTER -->
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E8EFF6;
                       padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#8A9BB5;line-height:1.6;">
                NIT 811018807-8 · FondoUne © ${new Date().getFullYear()}<br>
                Este correo fue generado automáticamente, no responder directamente.<br>
                <a href="${BASE_URL}" style="color:#1A6BAD;text-decoration:none;">
                  Acceder al portal
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // 1. CORREO DE APROBACIÓN — al asociado
  //    Se envía cuando el analista aprueba la solicitud.
  //    Incluye el link único de un solo uso para ir a firmar.
  // ═══════════════════════════════════════════════════════════════
  async function enviarAprobacion({ solicitud, linkFirma }) {
    const primerNombre = solicitud.nombre.split(' ')[0];

    const contenido = `
          <!-- ICONO DE ESTADO -->
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <div style="width:60px;height:60px;background:#EAF5EE;border-radius:50%;
                          margin:0 auto 16px;display:flex;align-items:center;
                          justify-content:center;font-size:28px;line-height:60px;">
                ✅
              </div>
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0B2545;">
                ¡Tu crédito fue aprobado!
              </h1>
              <p style="margin:0;font-size:14px;color:#5A6E8C;">
                Hola <strong>${primerNombre}</strong>, tenemos una buena noticia para ti.
              </p>
            </td>
          </tr>

          <!-- DETALLES DEL CRÉDITO -->
          <tr>
            <td style="padding:24px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#F0F4F8;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #E2EAF4;">
                    <span style="font-size:11px;color:#8A9BB5;text-transform:uppercase;
                                 letter-spacing:0.05em;">Monto aprobado</span><br>
                    <strong style="font-size:20px;color:#0B2545;">
                      ${_fmtCOP(solicitud.monto)}
                    </strong>
                  </td>
                  <td style="padding:16px 20px;border-bottom:1px solid #E2EAF4;">
                    <span style="font-size:11px;color:#8A9BB5;text-transform:uppercase;
                                 letter-spacing:0.05em;">Cuota mensual</span><br>
                    <strong style="font-size:20px;color:#0B2545;">
                      ${_fmtCOP(solicitud.cuota)}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;">
                    <span style="font-size:11px;color:#8A9BB5;text-transform:uppercase;
                                 letter-spacing:0.05em;">Plazo</span><br>
                    <span style="font-size:14px;color:#1A3558;font-weight:600;">
                      ${solicitud.plazo} meses
                    </span>
                  </td>
                  <td style="padding:14px 20px;">
                    <span style="font-size:11px;color:#8A9BB5;text-transform:uppercase;
                                 letter-spacing:0.05em;">Número de pagaré</span><br>
                    <span style="font-size:13px;color:#1A3558;font-weight:600;
                                 font-family:monospace;">
                      ${solicitud.numeroPagare || '—'}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- INSTRUCCIÓN -->
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="margin:0;font-size:14px;color:#3A4E6A;line-height:1.7;">
                Para completar el proceso y recibir el desembolso, necesitas
                <strong>firmar el pagaré electrónicamente</strong>. Haz clic en el
                botón de abajo — el link es de un solo uso y expira en
                <strong>48 horas</strong>.
              </p>
            </td>
          </tr>

          <!-- BOTÓN CTA -->
          <tr>
            <td style="padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${linkFirma}"
                       style="display:inline-block;background:#0B2545;color:#ffffff;
                              text-decoration:none;padding:14px 36px;border-radius:8px;
                              font-size:15px;font-weight:600;letter-spacing:0.01em;">
                      ✍️ &nbsp;Firmar el pagaré ahora
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:11px;color:#8A9BB5;text-align:center;">
                Si el botón no funciona, copia este link en tu navegador:<br>
                <a href="${linkFirma}" style="color:#1A6BAD;word-break:break-all;font-size:11px;">
                  ${linkFirma}
                </a>
              </p>
            </td>
          </tr>

          <!-- AVISO DE SEGURIDAD -->
          <tr>
            <td style="padding:0 32px 28px;">
              <div style="background:#FEF6E6;border:1px solid rgba(201,150,59,0.3);
                          border-radius:8px;padding:12px 16px;">
                <p style="margin:0;font-size:12px;color:#A06000;line-height:1.6;">
                  🔒 <strong>Seguridad:</strong> este link es personal e intransferible.
                  No lo compartas con nadie. Solo funciona una vez y queda
                  invalidado automáticamente después de firmar.
                </p>
              </div>
            </td>
          </tr>`;

    return _enviar({
      to:      solicitud.email,
      subject: `✅ Tu crédito fue aprobado — ${_fmtCOP(solicitud.monto)} · FondoUne`,
      html:    _plantillaBase(contenido),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. CORREO DE RECHAZO — al asociado
  //    Se envía cuando el analista rechaza la solicitud.
  // ═══════════════════════════════════════════════════════════════
  async function enviarRechazo({ solicitud, motivo }) {
    const primerNombre = solicitud.nombre.split(' ')[0];

    const contenido = `
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <div style="font-size:40px;margin-bottom:16px;">📋</div>
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0B2545;">
                Resultado de tu solicitud de crédito
              </h1>
              <p style="margin:0;font-size:14px;color:#5A6E8C;">
                Hola <strong>${primerNombre}</strong>, te informamos sobre el
                estado de tu solicitud.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 0;">
              <div style="background:#FDECEA;border:1px solid rgba(192,57,43,0.2);
                          border-radius:10px;padding:20px 24px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#C0392B;">
                  Solicitud no aprobada
                </p>
                <p style="margin:0;font-size:13px;color:#7B2D26;line-height:1.7;">
                  Lamentablemente tu solicitud de
                  <strong>${_fmtCOP(solicitud.monto)}</strong> a
                  <strong>${solicitud.plazo} meses</strong> no fue aprobada
                  en esta oportunidad.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 0;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#8A9BB5;
                        text-transform:uppercase;letter-spacing:0.05em;">
                Motivo informado por el analista
              </p>
              <div style="background:#F8FAFC;border-left:3px solid #C0392B;
                          border-radius:0 8px 8px 0;padding:14px 18px;">
                <p style="margin:0;font-size:13px;color:#3A4E6A;line-height:1.7;">
                  ${motivo}
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 28px;">
              <p style="margin:0;font-size:13px;color:#5A6E8C;line-height:1.7;">
                Si tienes dudas sobre esta decisión o deseas conocer las condiciones
                para futuras solicitudes, puedes comunicarte directamente con el
                equipo de crédito de FondoUne.
              </p>
            </td>
          </tr>`;

    return _enviar({
      to:      solicitud.email,
      subject: `📋 Resultado de tu solicitud de crédito · FondoUne`,
      html:    _plantillaBase(contenido),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. CORREO DE CONFIRMACIÓN DE FIRMA — al asociado
  //    Se envía cuando el asociado firma exitosamente en módulo 4.
  // ═══════════════════════════════════════════════════════════════
  async function enviarConfirmacionFirma({ solicitud }) {
    const primerNombre = solicitud.nombre.split(' ')[0];

    const contenido = `
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <div style="width:60px;height:60px;background:#EAF5EE;border-radius:50%;
                          margin:0 auto 16px;line-height:60px;font-size:28px;">🎉</div>
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0B2545;">
                Pagaré firmado exitosamente
              </h1>
              <p style="margin:0;font-size:14px;color:#5A6E8C;">
                <strong>${primerNombre}</strong>, tu proceso de crédito está completo.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#EAF5EE;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #C8E6C9;">
                    <span style="font-size:11px;color:#5A8C6A;text-transform:uppercase;
                                 letter-spacing:0.05em;">Monto desembolsado</span><br>
                    <strong style="font-size:20px;color:#0B2545;">
                      ${_fmtCOP(solicitud.monto)}
                    </strong>
                  </td>
                  <td style="padding:16px 20px;border-bottom:1px solid #C8E6C9;">
                    <span style="font-size:11px;color:#5A8C6A;text-transform:uppercase;
                                 letter-spacing:0.05em;">Cuota mensual</span><br>
                    <strong style="font-size:20px;color:#0B2545;">
                      ${_fmtCOP(solicitud.cuota)}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;" colspan="2">
                    <span style="font-size:11px;color:#5A8C6A;text-transform:uppercase;
                                 letter-spacing:0.05em;">Número de pagaré</span><br>
                    <span style="font-size:14px;color:#1A3558;font-weight:700;
                                 font-family:monospace;">
                      ${solicitud.numeroPagare}
                    </span>
                    <span style="font-size:11px;color:#5A8C6A;margin-left:8px;">
                      · Fecha: ${_fmtFecha(solicitud.fechaDecision)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px 28px;">
              <p style="margin:0;font-size:13px;color:#3A4E6A;line-height:1.7;">
                El desembolso será procesado en las próximas horas hábiles.
                Guarda este correo como comprobante de tu crédito con FondoUne.
              </p>
            </td>
          </tr>`;

    return _enviar({
      to:      solicitud.email,
      subject: `🎉 Pagaré firmado — ${solicitud.numeroPagare} · FondoUne`,
      html:    _plantillaBase(contenido),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. CONSTRUIR EL LINK DE FIRMA
  //    Helper que arma la URL completa con el token.
  //    Llamar desde el módulo 2 antes de enviarAprobacion().
  // ═══════════════════════════════════════════════════════════════
  function construirLinkFirma(token) {
    return `${BASE_URL}/modulo4-firma.html?token=${token}`;
  }

  // ── API pública ────────────────────────────────────────────────
  return {
    enviarAprobacion,
    enviarRechazo,
    enviarConfirmacionFirma,
    construirLinkFirma,
  };

})();
