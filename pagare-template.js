/**
 * pagare-template.js
 * FondoUne — Generador dinámico de Pagaré y Carta de Instrucciones
 * Basado en formato oficial Formato_Pagare_Fondoune-def
 *
 * USO EN modulo4-firma.html:
 *   <script src="pagare-template.js"></script>
 *   renderizarPagare('id-contenedor', datosAsociado);
 *   descargarPagarePDF(datosAsociado);
 */

// ─────────────────────────────────────────────
//  UTILIDADES
// ─────────────────────────────────────────────

function numeroALetras(num) {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
    'DIECIS\u00c9IS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenas  = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA',
    'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
    'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function miles(n) {
    if (n === 0)    return '';
    if (n < 20)     return unidades[n];
    if (n < 100) {
      const d = Math.floor(n / 10), u = n % 10;
      if (d === 2 && u > 0) return 'VEINTI' + unidades[u];
      return decenas[d] + (u > 0 ? ' Y ' + unidades[u] : '');
    }
    if (n < 1000) {
      const c = Math.floor(n / 100), r = n % 100;
      if (n === 100) return 'CIEN';
      return centenas[c] + (r > 0 ? ' ' + miles(r) : '');
    }
    if (n < 1000000) {
      const m = Math.floor(n / 1000), r = n % 1000;
      return (m === 1 ? 'MIL' : miles(m) + ' MIL') + (r > 0 ? ' ' + miles(r) : '');
    }
    if (n < 1000000000) {
      const m = Math.floor(n / 1000000), r = n % 1000000;
      return (m === 1 ? 'UN MILL\u00d3N' : miles(m) + ' MILLONES') + (r > 0 ? ' ' + miles(r) : '');
    }
    return n.toString();
  }

  return miles(Math.floor(num)) + ' DE PESOS COLOMBIANOS';
}

function formatCOP(num) {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

// ─────────────────────────────────────────────
//  GENERADOR PRINCIPAL
// ─────────────────────────────────────────────

/**
 * generarPagare(d)
 *
 * @param {Object}  d
 * @param {string}  d.nombreCompleto     Nombre en mayúsculas: "NICOLÁS ALEJANDRO RAMOS ACOSTA"
 * @param {string}  d.ciudad             Ciudad de domicilio: "Medellín"
 * @param {string}  d.tipoDoc            Tipo de documento: "CC"
 * @param {string}  d.numDoc             Número de documento: "750024"
 * @param {number}  d.monto              Monto aprobado: 8000000
 * @param {number}  d.cuotas             Número de cuotas: 24
 * @param {string}  d.periodicidad       "mensuales" | "quincenales"
 * @param {number}  d.valorCuota         Valor cuota: 391800
 * @param {string}  d.fechaPrimeraCuota  "12 de junio de 2025"
 * @param {number}  d.tasaEA             Tasa E.A.: 14.03
 * @param {number}  d.tasaNA             Tasa N.A.: 13.15
 * @param {string}  d.fechaFirma         "05 de junio de 2026" (opcional, usa hoy si no se pasa)
 * @param {string}  d.numPagare          "PAG-2025-0847" (opcional)
 * @param {string}  d.hashFirma          Hash / Nro transacción (opcional)
 * @param {string}  d.firmaBase64        dataURL del canvas de firma (opcional)
 *
 * @returns {string} HTML completo del pagaré (3 páginas)
 */
function generarPagare(d) {
  const montoLetras = numeroALetras(d.monto);
  const cuotaLetras = numeroALetras(d.valorCuota);
  const montoNum    = formatCOP(d.monto);
  const cuotaNum    = formatCOP(d.valorCuota);
  const ahora       = new Date();
  const fechaHoy    = d.fechaFirma || ahora.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const horaHoy     = ahora.toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }) + ' UTC-5';
  const hash        = d.hashFirma || '—';
  const firmaImg    = d.firmaBase64
    ? `<img src="${d.firmaBase64}" style="max-width:200px;max-height:60px;margin-top:8px;display:block;" alt="Firma electrónica">`
    : '<div style="height:50px;"></div>';

  return `
<div id="pagare-oficial" style="
  font-family: 'Times New Roman', Times, serif;
  font-size: 11.5pt;
  color: #000;
  background: #fff;
  max-width: 740px;
  margin: 0 auto;
  padding: 0;
  line-height: 1.6;
">

<!-- ═══════════════════════════════════════════
     PÁGINA 1 — PAGARÉ A LA ORDEN
═══════════════════════════════════════════ -->
<div style="padding:52px 60px; page-break-after:always;">

  <div style="text-align:center;font-weight:bold;margin-bottom:28px;line-height:1.5;">
    FONDO DE EMPLEADOS UNE - "FONDOUNE"<br>
    PAGARÉ A LA ORDEN Nro. <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>
  </div>

  <p style="margin-bottom:12px;text-align:justify;">
    Yo(nosotros) <strong>${d.nombreCompleto}</strong>, mayor(es) de edad y
    domiciliado(s) en la ciudad de <strong>${d.ciudad}</strong>, identificado(s) como aparece al pie de
    mi(nuestras) firma(s), por medio del presente pagaré hago(hacemos) constar que pagaré(mos) solidaria,
    incondicional e indivisiblemente a la orden del <strong>FONDO DE EMPLEADOS DE UNE "FONDOUNE"</strong>,
    identificado con <strong>NIT 811018807-8</strong>, o a quien represente sus derechos, todos los valores
    estipulados en este título valor, en las cuentas bancarias dispuestas para ello o en la ciudad de
    Medellín o lugar que señale y de acuerdo al plan de amortización que más adelante se determina, para lo
    cual también manifestamos que de ella he(hemos) recibido a entera satisfacción a título de mutuo
    solidario, con intereses y de acuerdo a las siguientes cláusulas:
  </p>

  <p style="margin-bottom:12px;text-align:justify;">
    <strong>PRIMERA. Valor.</strong> La suma de (<strong>$ ${montoNum}</strong>),
    <em>${montoLetras}</em>, la cual pagaré(mos) solidariamente.
  </p>

  <p style="margin-bottom:12px;text-align:justify;">
    <strong>SEGUNDA. Amortización.</strong> El(los) deudor(es) se obliga(n) a pagar la suma descrita en
    <strong>${d.cuotas} cuotas ${d.periodicidad}</strong> por un valor de
    <strong>$ ${cuotaNum}</strong> (<em>${cuotaLetras}</em>) cada una, la primera el día
    <strong>${d.fechaPrimeraCuota}</strong> y así sucesivamente y sin interrupción cada mes hasta completar
    las <strong>${d.cuotas}</strong> cuotas. Todo pago que se reciba se aplicará, salvo pacto en contrario,
    a: impuestos, gastos, costas, seguros, papelería, honorarios, intereses de mora, intereses corrientes y
    por último a capital. Doy(damos) instrucciones para que todos los pagos parciales extraordinarios,
    anticipados, en exceso, o cualquier otro sobrante aún por reliquidación de intereses, que no tenga
    expreso el destino de dicho pago, sean aplicados, en primer lugar, a los intereses adeudados y, en
    segundo orden, a capital con destino a la disminución del plazo.
  </p>

  <p style="margin-bottom:12px;text-align:justify;">
    <strong>TERCERA. Interés de Plazo.</strong> Pagaré(mos) interés mensual corriente a la tasa del
    <strong>${d.tasaEA}% efectivo anual (E.A.)</strong>, equivalente a la tasa
    <strong>${d.tasaNA}% nominal anual (N.A.)</strong>, los cuales serán cubiertos mes vencido.
  </p>

  <p style="margin-bottom:12px;text-align:justify;">
    <strong>CUARTA. Interés de Mora.</strong> En caso de mora pagaré(mos) una tasa equivalente a la tasa
    máxima legal permitida por la entidad competente y que rija al momento de verificarse la mora.
  </p>

  <p style="margin-bottom:12px;text-align:justify;">
    <strong>QUINTA. Vencimiento Anticipado.</strong> Autorizo(amos) al
    <strong>FONDO DE EMPLEADOS DE UNE "FONDOUNE"</strong> o cualquier otro tenedor legítimo del presente
    título valor para extinguir el plazo o plazos que se estipulen para el pago del crédito al cual se
    refiere este documento y exigir extrajudicialmente o judicialmente el pago de la totalidad del saldo
    insoluto, más los intereses y gastos de cobranza, incluyendo honorarios del abogado, si ocurriere
    cualquiera de los siguientes eventos: <strong>A)</strong> Si hubiere mora en una o más cuotas de capital
    o de intereses del crédito otorgado; <strong>B)</strong> Por la pérdida de la calidad de asociado del
    deudor en el <strong>FONDO DE EMPLEADOS DE UNE "FONDOUNE"</strong>; <strong>C)</strong> Por las causales
    previstas en el Reglamento de Crédito o en los Estatutos del
    <strong>FONDO DE EMPLEADOS DE UNE "FONDOUNE"</strong> en el momento de la suscripción del pagaré y las
    cuales declaro(amos) conocer expresamente el deudor y deudores solidarios, y para los efectos de este
    título valor formará parte integrante del mismo; <strong>D)</strong> En caso de que el deudor sea
    demandado o le sean embargados bienes por persona distinta al
    <strong>FONDO DE EMPLEADOS DE UNE "FONDOUNE"</strong>; <strong>E)</strong> En caso de desmejorar las
    garantías por mí(nosotros) constituida(s); <strong>F)</strong> En caso de no pagar las pólizas de seguro
    todo riesgo de las garantías por mí(nosotros) constituida(s); <strong>G)</strong> En caso de no destinar
    los desembolsos de crédito para los fines solicitados en las solicitudes de crédito.
  </p>

  <p style="margin-bottom:12px;text-align:justify;">
    <strong>SEXTA. Autorización de descuentos.</strong> El(los) obligado(s) en el presente título
    autorizo(amos) irrevocablemente al pagador de la empresa en la cual laboro(amos) o llegara(mos) a
    laborar, para que descuente del salario mensual la cuota establecida en la cláusula segunda de este
    pagaré, y en caso de presentarse alguna(s) de la(s) causal(es) previstas para la extinción del plazo y
    exigirse la totalidad de la suma adeudada en este pagaré, igualmente autorizo(amos) irrevocablemente
    para que se descuente de mi(nuestro) salario, mis(nuestras) prestaciones sociales o de cualquier suma
    que me(nos) llegara a corresponder en virtud del contrato de trabajo y su liquidación, así también por
    conceptos como bonificaciones, comisiones, honorarios, vacaciones, liquidación, y cualquier otro concepto
    pagadero con ocasión de la prestación de sus servicios y las mismas sean entregadas al
    <strong>FONDO DE EMPLEADOS DE UNE "FONDOUNE"</strong> o su tenedor legítimo para que sean abonadas al
    presente pagaré.
  </p>

  <p style="margin-bottom:12px;text-align:justify;">
    <strong>SÉPTIMA. Costos.</strong> Los gastos que se ocasionen por el otorgamiento de este pagaré, así
    como las costas y gastos de cobranza en caso de cobro judicial o extrajudicial, serán a cargo del(los)
    deudor(es). En todo caso, el(los) deudor(es) asumirá(n) los honorarios de abogado que corresponderán al
    <strong>30% del saldo insoluto</strong> de la presente obligación, es decir, el valor de capital
    pretendido en la respectiva demanda, los cuales serán exigibles a partir de la fecha de vencimiento de
    este pagaré y ocasionarán intereses de mora a la tasa máxima legal permitida a partir de la fecha en que
    sean exigibles.
  </p>

  <p style="margin-bottom:12px;text-align:justify;">
    <strong>OCTAVA.</strong> En el caso de presentarse alguna(s) de la(s) causal(es) previstas para la
    extinción del plazo y exigirse la totalidad de la suma adeudada en este pagaré, el recibo de abonos
    parciales no implica novación. Además, entre los distintos suscriptores nos conferimos poder
    recíprocamente en caso de que se acuerde una refinanciación, prórroga del plazo, reestructuración de la
    deuda, o modificación o aclaración de las condiciones pactadas, manteniéndose la solidaridad, para lo
    cual cualquiera de nosotros podrá suscribir nuevos acuerdos en nombre y representación de los demás.
  </p>

  <p style="margin-bottom:24px;text-align:justify;">
    <strong>NOVENA.</strong> El presente pagaré respalda y garantiza obligaciones pasadas, presentes y
    futuras por mí(nosotros) constituidas con el <strong>FONDO DE EMPLEADOS DE UNE "FONDOUNE"</strong>.
  </p>

  <p style="margin-bottom:36px;">
    En constancia se firma en la ciudad de <strong>${d.ciudad}</strong> a los <strong>${fechaHoy}</strong>.
  </p>

  <!-- Bloque firmas pagaré -->
  <div style="display:flex;justify-content:space-between;gap:48px;margin-top:16px;">
    <div style="flex:1;border-top:1px solid #000;padding-top:10px;">
      <strong>Deudor Principal</strong><br>
      Nombre: <strong>${d.nombreCompleto}</strong><br>
      Tipo de Identificación: <strong>${d.tipoDoc}</strong><br>
      Número de identificación: <strong>${d.numDoc}</strong>
      ${firmaImg}
    </div>
    <div style="flex:1;border-top:1px solid #000;padding-top:10px;">
      <strong>Deudor(a) Solidario(a)</strong><br>
      Nombre:<br>
      Tipo de Identificación:<br>
      Número de identificación:
      <div style="height:50px;"></div>
    </div>
  </div>

  <div style="margin-top:20px;font-size:9pt;color:#555;border-top:1px solid #ccc;padding-top:8px;">
    Firmado electrónicamente | Hash: <strong>${hash}</strong> | Timestamp: ${horaHoy}
  </div>
</div>


<!-- ═══════════════════════════════════════════
     PÁGINA 2 — CARTA DE INSTRUCCIONES
═══════════════════════════════════════════ -->
<div style="padding:52px 60px; page-break-after:always;">

  <div style="text-align:center;font-weight:bold;margin-bottom:28px;line-height:1.5;">
    FONDO DE EMPLEADOS UNE - "FONDOUNE"<br>
    CARTA DE INSTRUCCIONES PARA DILIGENCIAR PAGARÉ No.
    <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>
  </div>

  <p style="margin-bottom:14px;text-align:justify;">
    Yo(nosotros) <strong>${d.nombreCompleto}</strong>, identificado(s) como aparece al pie de
    mi(nuestras) firma(s), obrando en calidad de deudor y codeudor(es) solidario(s) autorizo(amos) al
    <strong>FONDO DE EMPLEADOS DE UNE "FONDOUNE"</strong>, identificado con NIT
    <strong>811018807-8</strong> o cualquier otro tenedor legítimo del pagaré que hemos suscrito a favor
    del <strong>FONDO DE EMPLEADOS DE UNE "FONDOUNE"</strong>, para que, haciendo uso de las facultades
    conferidas en el <strong>Artículo 622 del Código de Comercio</strong>, diligencie los espacios en
    blanco del respectivo pagaré, para lo cual debe ceñirse a las siguientes instrucciones:
  </p>

  <ol style="margin-left:22px;margin-bottom:20px;line-height:1.75;">
    <li style="margin-bottom:10px;text-align:justify;">
      El <strong>FONDO DE EMPLEADOS DE UNE "FONDOUNE"</strong> o su tenedor legítimo podrá llenar los
      espacios en blanco del Pagaré identificado anteriormente, cuando se presente una o varias de las
      circunstancias de exigibilidad contenidas en la Cláusula Quinta del texto del Pagaré objeto de esta
      autorización.
    </li>
    <li style="margin-bottom:10px;text-align:justify;">
      El número del pagaré será el que determine el
      <strong>FONDO DE EMPLEADOS DE UNE "FONDOUNE"</strong>.
    </li>
    <li style="margin-bottom:10px;text-align:justify;">
      El espacio correspondiente a nombres del(los) deudor(es) será diligenciado con el nombre de los
      suscribientes.
    </li>
    <li style="margin-bottom:10px;text-align:justify;">
      El espacio en blanco correspondiente a la ciudad de domicilio del(los) deudor(es) será diligenciado
      con la ciudad que haya informado el deudor principal del crédito en el formulario de afiliación al
      Fondo de Empleados o en otro documento en el cual se pueda observar el lugar de residencia del
      mencionado deudor. A falta de información relacionada, será la ciudad de Medellín.
    </li>
    <li style="margin-bottom:10px;text-align:justify;">
      En el espacio correspondiente al valor del pagaré, en la cláusula primera, se debe diligenciar el
      valor desembolsado al deudor por el <strong>FONDO DE EMPLEADOS DE UNE "FONDOUNE"</strong> o con el
      valor de la refinanciación, si éste último fuere mayor a la suma desembolsada inicialmente.
    </li>
    <li style="margin-bottom:10px;text-align:justify;">
      La cláusula segunda será diligenciada en su orden así: número de cuotas pactadas en el crédito o en
      la refinanciación, si a ello hubiere lugar; periodicidad de la cuota si es quincenal o mensual,
      pactadas en el crédito o en la refinanciación, si a ello hubiere lugar; valor de la cuota en letras
      pactadas en el crédito o en la refinanciación, si a ello hubiere lugar; día, mes y año de pago de la
      primera cuota pactada en el crédito o en la refinanciación, si a ello hubiere lugar; el último
      espacio se diligenciará con el número total de cuotas pactadas en el crédito o en la refinanciación,
      si a ello hubiere lugar.
    </li>
    <li style="margin-bottom:10px;text-align:justify;">
      Los espacios correspondientes a las tasas de interés determinadas en la cláusula tercera serán
      diligenciados conforme a las tasas con las que se haya aprobado el crédito o sus respectivas
      modificaciones acordadas por las partes.
    </li>
    <li style="margin-bottom:10px;text-align:justify;">
      El espacio en blanco correspondiente a la ciudad de otorgamiento del pagaré será diligenciado con la
      ciudad donde tenga domicilio principal el
      <strong>FONDO DE EMPLEADOS DE UNE "FONDOUNE"</strong>.
    </li>
    <li style="margin-bottom:10px;text-align:justify;">
      Para llenar el Pagaré, el <strong>FONDO DE EMPLEADOS DE UNE "FONDOUNE"</strong> no requiere dar
      aviso a los firmantes del mismo.
    </li>
    <li style="margin-bottom:10px;text-align:justify;">
      Hago(hacemos) expreso reconocimiento de que conservo copia de estas instrucciones y documentos,
      y conozco plenamente el contenido de los mismos.
    </li>
  </ol>

  <p style="margin-bottom:36px;text-align:justify;">
    En constancia de lo anterior se firma esta carta de instrucciones en duplicado a los
    <strong>${fechaHoy}</strong>.
  </p>

  <!-- Bloque firmas carta -->
  <div style="display:flex;justify-content:space-between;gap:48px;margin-top:16px;">
    <div style="flex:1;border-top:1px solid #000;padding-top:10px;">
      <strong>Deudor Principal</strong><br>
      Nombre: <strong>${d.nombreCompleto}</strong><br>
      Tipo de Identificación: <strong>${d.tipoDoc}</strong><br>
      Número de identificación: <strong>${d.numDoc}</strong>
      ${firmaImg}
    </div>
    <div style="flex:1;border-top:1px solid #000;padding-top:10px;">
      <strong>Deudor(a) Solidario(a)</strong><br>
      Nombre:<br>
      Tipo de Identificación:<br>
      Número de identificación:
      <div style="height:50px;"></div>
    </div>
  </div>

  <div style="margin-top:20px;font-size:9pt;color:#555;border-top:1px solid #ccc;padding-top:8px;">
    Firmado con Firma Plus, Nro. Transacción: ${hash}
  </div>
</div>


<!-- ═══════════════════════════════════════════
     PÁGINA 3 — FIRMAS ELECTRÓNICAS
═══════════════════════════════════════════ -->
<div style="padding:52px 60px;">

  <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:28px;">
    <div style="width:8px;background:#C9963B;min-height:64px;border-radius:2px;flex-shrink:0;"></div>
    <div>
      <h1 style="font-family:Arial,sans-serif;font-size:26pt;font-weight:300;color:#000;margin:0 0 6px;">
        Firmas Electrónicas
      </h1>
      <p style="font-family:Arial,sans-serif;font-size:11pt;color:#444;margin:0;">
        Firmado electrónicamente por:
      </p>
    </div>
    <div style="margin-left:auto;flex-shrink:0;">
      <div style="
        background:#e8c02a;padding:7px 11px;border-radius:4px;
        text-align:center;font-family:Arial,sans-serif;
        font-weight:900;font-size:12pt;color:#000;line-height:1.2;
      ">FIRMA<br><span style="font-size:8pt;font-weight:400;">PLUS</span></div>
    </div>
  </div>

  <div style="border-top:1px solid #ddd;padding-top:20px;">
    <p style="font-family:Arial,sans-serif;font-size:13pt;font-weight:bold;margin-bottom:14px;">
      ${d.nombreCompleto}
    </p>
    <table style="font-family:'Courier New',monospace;font-size:10.5pt;line-height:2;border-collapse:collapse;">
      <tr>
        <td style="color:#666;padding-right:28px;">Tipo de documento:</td>
        <td><strong>${d.tipoDoc}</strong></td>
      </tr>
      <tr>
        <td style="color:#666;">Nro. de documento:</td>
        <td><strong>${d.numDoc}</strong></td>
      </tr>
      <tr>
        <td style="color:#666;">Efirma-ID:</td>
        <td>${hash}</td>
      </tr>
      <tr>
        <td style="color:#666;">Fecha y Hora:</td>
        <td>${fechaHoy} ${horaHoy}</td>
      </tr>
      <tr>
        <td style="color:#666;">Nro. Transacción:</td>
        <td>${hash}</td>
      </tr>
    </table>
  </div>

  <p style="
    font-size:8.5pt;color:#666;margin-top:48px;
    border-top:1px solid #eee;padding-top:14px;
    text-align:justify;font-family:Arial,sans-serif;line-height:1.6;
  ">
    Mensaje de datos firmado digitalmente para conservar la integridad y el no repudio. Las partes acuerdan
    el uso de firmas electrónicas. Consulte este documento con el código QR, cada firma cuenta con un
    certificado digital que permite verificar su rastro electrónico, disponible en Firma Plus.
    La hora legal (UTC – 5).
  </p>
</div>

</div>`;
}


// ─────────────────────────────────────────────
//  FUNCIONES PÚBLICAS
// ─────────────────────────────────────────────

/**
 * Inyecta el pagaré generado dentro del elemento con el ID indicado.
 * @param {string} containerId   ID del div destino, ej: 'pagare-contenedor'
 * @param {Object} datosAsociado Ver JSDoc de generarPagare()
 */
function renderizarPagare(containerId, datosAsociado) {
  const el = document.getElementById(containerId);
  if (!el) {
    console.error('[pagare-template] Contenedor no encontrado: #' + containerId);
    return;
  }
  el.innerHTML = generarPagare(datosAsociado);
}

/**
 * Genera y descarga el pagaré como PDF usando html2pdf.js (se carga automáticamente).
 * El archivo se nombra: Pagare_FondoUne_{numDoc}_{NombreCompleto}.pdf
 * @param {Object} datosAsociado Ver JSDoc de generarPagare()
 */
function descargarPagarePDF(datosAsociado) {
  const d        = datosAsociado;
  const filename = 'Pagare_FondoUne_' + d.numDoc + '_'
                 + d.nombreCompleto.replace(/\s+/g, '-').toUpperCase()
                 + '.pdf';

  function _export() {
    const el = document.getElementById('pagare-oficial');
    if (!el) {
      console.error('[pagare-template] No se encontró #pagare-oficial para exportar. ' +
                    'Llama primero a renderizarPagare().');
      return;
    }
    html2pdf().set({
      margin:     [10, 0, 10, 0],
      filename:   filename,
      image:      { type: 'jpeg', quality: 0.98 },
      html2canvas:{ scale: 2, useCORS: true, scrollY: 0 },
      jsPDF:      { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:  { mode: ['css', 'legacy'] }
    }).from(el).save();
  }

  // Carga html2pdf.js bajo demanda (evita doble carga)
  if (window.html2pdf) {
    _export();
    return;
  }
  const s   = document.createElement('script');
  s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  s.onload  = _export;
  s.onerror = () => console.error('[pagare-template] No se pudo cargar html2pdf.js');
  document.head.appendChild(s);
}

// Exponer en window para uso desde módulo4-firma.html
window.generarPagare      = generarPagare;
window.renderizarPagare   = renderizarPagare;
window.descargarPagarePDF = descargarPagarePDF;
window.numeroALetras      = numeroALetras;
