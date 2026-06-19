/**
 * FondoUne — Generador de Pagaré PDF  v3.0
 * ─────────────────────────────────────────────────────────────────
 * - Texto 100% justificado (párrafos normales y mixtos bold/normal)
 * - Firma del canvas insertada correctamente sobre la línea
 * - Saltos de página automáticos con reserva de espacio para firma
 *
 * DEPENDENCIA: jsPDF 2.5.x (UMD)
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 *   <script src="pagare-pdf-generator.js"></script>
 *
 * USO:
 *   generarPagarePDF({ nombreDeudor, numIdDeudor, firmaBase64, ... });
 */

window.generarPagarePDF = function(datos) {

  if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
    console.error("jsPDF no está cargado."); return null;
  }
  const { jsPDF } = window.jspdf || { jsPDF: window.jsPDF };

  // ── Constantes de página y tipografía ──────────────────────────
  const PAGE_W  = 216;          // mm — Carta Colombia
  const PAGE_H  = 279;
  const MAR_L   = 20;           // margen izquierdo
  const MAR_R   = 20;           // margen derecho
  const MAR_TOP = 18;           // Y inicial del contenido
  const MAR_BOT = 15;           // espacio reservado al pie
  const COL_W   = PAGE_W - MAR_L - MAR_R;   // 176 mm — ancho útil
  const FS      = 8.5;          // tamaño cuerpo
  const FS_SM   = 7.5;          // tamaño pie/firmas
  const FS_TIT  = 11;           // tamaño títulos
  const LH      = 4.8;          // interlineado mm (ligeramente mayor para legibilidad)
  const FIRMA_H = 20;           // altura reservada para imagen de firma
  const BLACK   = [0, 0, 0];
  const GRAY    = [100, 100, 100];

  const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });

  // ── Ancho del espacio " " en fuente normal FS ──────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS);
  const SPACE_W = doc.getTextWidth(' ');

  // ══════════════════════════════════════════════════════════════
  // MOTOR JUSTIFICADO PARA TEXTO PURO (sin mezcla de estilos)
  // ══════════════════════════════════════════════════════════════
  function txtJ(text, x, y, maxW, bold) {
    bold = !!bold;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(FS);
    doc.setTextColor(...BLACK);

    const words = text.replace(/\s+/g, ' ').trim().split(' ');
    const lines = [];
    let cur = [];

    words.forEach(w => {
      const test = [...cur, w].join(' ');
      if (doc.getTextWidth(test) <= maxW + 0.01) {
        cur.push(w);
      } else {
        if (cur.length) lines.push(cur);
        cur = [w];
      }
    });
    if (cur.length) lines.push(cur);

    lines.forEach((lw, li) => {
      const isLast = li === lines.length - 1;
      if (isLast || lw.length === 1) {
        // última línea: alineada a la izquierda
        doc.text(lw.join(' '), x, y);
      } else {
        // líneas intermedias: justificado
        const textW = lw.reduce((a, w) => {
          doc.setFont('helvetica', bold ? 'bold' : 'normal');
          return a + doc.getTextWidth(w);
        }, 0);
        const gap = (maxW - textW) / (lw.length - 1);
        let cx = x;
        lw.forEach((w, wi) => {
          doc.setFont('helvetica', bold ? 'bold' : 'normal');
          doc.setFontSize(FS);
          doc.text(w, cx, y);
          cx += doc.getTextWidth(w) + (wi < lw.length - 1 ? gap : 0);
        });
      }
      y += LH;
    });
    return y;
  }

  // ══════════════════════════════════════════════════════════════
  // MOTOR JUSTIFICADO PARA TEXTO MIXTO BOLD/NORMAL
  // Recibe: [ {t: 'texto', b: true/false}, ... ]
  // ══════════════════════════════════════════════════════════════
  function renderMixto(segs, x, y, maxW) {

    // 1. Tokenizar en palabras con su estilo
    const words = [];
    segs.forEach(seg => {
      seg.t.split(/\s+/).forEach(tok => {
        if (!tok) return;
        words.push({ w: tok, b: !!seg.b });
      });
    });

    // Medir palabra según su estilo
    function ww(p) {
      doc.setFont('helvetica', p.b ? 'bold' : 'normal');
      doc.setFontSize(FS);
      return doc.getTextWidth(p.w);
    }

    // 2. Armar renglones respetando maxW y separadores reales
    const lines = [];
    let cur = [], curW = 0;

    words.forEach(p => {
      const pw   = ww(p);
      const need = cur.length === 0 ? pw : curW + SPACE_W + pw;
      if (need > maxW + 0.01 && cur.length > 0) {
        lines.push(cur);
        cur = []; curW = 0;
      }
      cur.push({ ...p, pw });
      curW = cur.length === 1 ? pw : curW + SPACE_W + pw;
    });
    if (cur.length) lines.push(cur);

    // 3. Dibujar con justificado
    lines.forEach((lw, li) => {
      const isLast = li === lines.length - 1;

      if (isLast || lw.length === 1) {
        // Última línea → izquierda
        let cx = x;
        lw.forEach((p, wi) => {
          doc.setFont('helvetica', p.b ? 'bold' : 'normal');
          doc.setFontSize(FS);
          doc.setTextColor(...BLACK);
          doc.text(p.w, cx, y);
          cx += p.pw + (wi < lw.length - 1 ? SPACE_W : 0);
        });
      } else {
        // Líneas intermedias → justificado
        const textW = lw.reduce((a, p) => a + p.pw, 0);
        const gap   = (maxW - textW) / (lw.length - 1);
        let cx = x;
        lw.forEach((p, wi) => {
          doc.setFont('helvetica', p.b ? 'bold' : 'normal');
          doc.setFontSize(FS);
          doc.setTextColor(...BLACK);
          doc.text(p.w, cx, y);
          cx += p.pw + (wi < lw.length - 1 ? gap : 0);
        });
      }
      y += LH;
    });

    // Restaurar normal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FS);
    return y;
  }

  // ── Helpers de estilo ──────────────────────────────────────────
  const n = t => ({ t, b: false });
  const b = t => ({ t, b: true  });

  // Cuántas líneas ocupa un bloque de texto (estimación)
  function estimarLineas(segs, maxW) {
    const txt = segs.map(s => s.t).join(' ');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(FS);
    return doc.splitTextToSize(txt, maxW).length;
  }

  // Salto de página si no cabe `needed` mm
  let pagActual = 1;
  function checkY(y, needed) {
    if (y + needed > PAGE_H - MAR_BOT) {
      doc.addPage();
      pagActual++;
      return MAR_TOP;
    }
    return y;
  }

  // ── Datos del crédito ──────────────────────────────────────────
  const D = {
    nombre:      datos.nombreDeudor       || '___________________________________',
    ciudad:      datos.ciudadDeudor       || '________________',
    valLetras:   datos.valorLetras        || '___________________________________________________',
    valNum:      datos.valorNumeros       || '________________',
    cuotas:      datos.numeroCuotas       || '___',
    period:      datos.periodicidad       || 'mensuales',
    cuotaLet:    datos.valorCuotaLetras   || '________________________________',
    cuotaNum:    datos.valorCuotaNumeros  || '________________',
    dia1:        datos.diaPrimeraCuota    || '___',
    mes1:        datos.mesPrimeraCuota    || '_________',
    anio1:       datos.anioPrimeraCuota   || '______',
    tasaEA:      datos.tasaEA             || '_____',
    tasaNA:      datos.tasaNA             || '_____',
    pagNro:      datos.numeroPagare       || '_______',
    ciudadOtorg: datos.ciudadOtorgamiento || 'Medellín',
    tipoId:      datos.tipoIdDeudor       || 'CC',
    numId:       datos.numIdDeudor        || '',
    nombreCode:  datos.nombreCodeudor     || '',
    tipoIdCode:  datos.tipoIdCodeudor     || '',
    numIdCode:   datos.numIdCodeudor      || '',
    nroTx:       datos.nroTransaccion     || '',
    firma64:     datos.firmaBase64        || null,
  };

  // Columnas de firma
  const COL1_X = MAR_L;
  const COL2_X = PAGE_W / 2 + 5;
  const FIRMA_W = COL_W / 2 - 5;

  // ── Función: dibujar bloque de firmas ──────────────────────────
  function dibujarFirmas(y) {
    // Reservar espacio: FIRMA_H para imagen + línea + datos
    y = checkY(y, FIRMA_H + 4 + LH * 4);

    // Imagen de firma del deudor (si existe)
    if (D.firma64) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.rect(COL1_X, y, FIRMA_W, FIRMA_H, 'F');
        doc.addImage(D.firma64, 'PNG', COL1_X, y, FIRMA_W, FIRMA_H);
      } catch(e) { /* sin imagen, solo se muestra la línea */ }
    }

    const lineY = y + FIRMA_H;

    doc.setLineWidth(0.2);
    doc.setDrawColor(...BLACK);
    doc.line(COL1_X, lineY, COL1_X + FIRMA_W, lineY);   // deudor
    doc.line(COL2_X, lineY, COL2_X + FIRMA_W, lineY);   // codeudor

    let yD = lineY + 4;   // Y datos deudor
    let yC = lineY + 4;   // Y datos codeudor

    doc.setFontSize(FS_SM);
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica', 'bold');
    doc.text('Deudor Principal',       COL1_X, yD);
    doc.text('Deudor(a) Solidario(a)', COL2_X, yC);
    yD += LH; yC += LH;

    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${D.nombre}`,                      COL1_X, yD);
    doc.text(`Nombre: ${D.nombreCode}`,                  COL2_X, yC);
    yD += LH; yC += LH;
    doc.text(`Tipo de Identificación: ${D.tipoId}`,      COL1_X, yD);
    doc.text(`Tipo de Identificación: ${D.tipoIdCode}`,  COL2_X, yC);
    yD += LH; yC += LH;
    doc.text(`Número de identificación: ${D.numId}`,     COL1_X, yD);
    doc.text(`Número de identificación: ${D.numIdCode}`, COL2_X, yC);
    yD += LH;

    return yD;
  }

  // ── Pie de página ──────────────────────────────────────────────
  function piePagina() {
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Firmado con Firma Plus, Nro. Transacción: ${D.nroTx}`, MAR_L, PAGE_H - 8);
    doc.setTextColor(...BLACK);
  }

  // ════════════════════════════════════════════════════════════════
  // PÁGINA 1 — PAGARÉ
  // ════════════════════════════════════════════════════════════════
  let y = MAR_TOP;

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_TIT);
  doc.setTextColor(...BLACK);
  doc.text('FONDO DE EMPLEADOS UNE - "FONDOUNE"', PAGE_W / 2, y, { align: 'center' });
  y += 6;
  doc.text(`PAGARÉ A LA ORDEN Nro. ${D.pagNro}`, PAGE_W / 2, y, { align: 'center' });
  y += 10;

  // Párrafo de identificación
  y = txtJ(
    `Yo(nosotros) ${D.nombre}, mayor(es) de edad y domiciliado(s) en la ciudad de ${D.ciudad}, ` +
    `identificado(s) como aparece al pie de mi(nuestras) firma(s), por medio del presente pagaré ` +
    `hago(hacemos) constar que pagare(mos) solidaria, incondicional e indivisiblemente a la orden del ` +
    `FONDO DE EMPLEADOS DE UNE "FONDOUNE", identificado con NIT 811018807-8, o a quien represente sus ` +
    `derechos, todos los valores estipulados en este título valor, en las cuentas bancarias dispuestas ` +
    `para ello o en la ciudad de Medellín o lugar que señale y de acuerdo al plan de amortización que más ` +
    `adelante se determina, para lo cual también manifestamos que de ella he(hemos) recibido a entera ` +
    `satisfacción a título de mutuo solidario, con intereses y de acuerdo a las siguientes cláusulas:`,
    MAR_L, y, COL_W
  );
  y += 3;

  // PRIMERA
  y = checkY(y, LH * 3);
  y = renderMixto([
    b('PRIMERA. Valor. '),
    n(`La suma de ${D.valLetras} `), b(`($ ${D.valNum})`),
    n(', la cual pagare(mos) solidariamente.'),
  ], MAR_L, y, COL_W);
  y += 3;

  // SEGUNDA
  y = checkY(y, LH * 7);
  y = renderMixto([
    b('SEGUNDA. Amortización. '),
    n(`El(los) deudor(es) se obliga(n) a pagar la suma descrita en `),
    b(D.cuotas), n(` cuotas `), b(D.period),
    n(` por un valor de `), b(D.cuotaLet), n(` (`), b(`$ ${D.cuotaNum}`), n(`) cada una, `),
    n(`la primera la pagare(mos) el día `), b(D.dia1),
    n(` del mes de `), b(D.mes1), n(` del año `), b(D.anio1),
    n(` y así sucesivamente y sin interrupción cada mes hasta completar las `),
    b(D.cuotas), n(` cuotas. `),
    n(`Todo pago que se reciba se aplicará, salvo pacto en contrario, a: impuestos, gastos, costas, `),
    n(`seguros, papelería, honorarios, intereses de mora, intereses corrientes y por último a capital, `),
    n(`todo esto según el caso. Doy(damos) instrucciones para que todos los pagos parciales `),
    n(`extraordinarios, anticipados, en exceso, o cualquier otro sobrante aun por reliquidación de `),
    n(`intereses, que no tenga expreso el destino de dicho pago, sean aplicados, en primer lugar, a `),
    n(`los intereses adeudados y, en segundo orden, a capital con destino a la disminución del plazo.`),
  ], MAR_L, y, COL_W);
  y += 3;

  // TERCERA
  y = checkY(y, LH * 3);
  y = renderMixto([
    b('TERCERA. Interés de Plazo. '),
    n(`Pagare(mos) interés mensual corriente a la tasa del `),
    b(D.tasaEA), n(` efectivo anual (E.A), equivalente a la tasa `),
    b(D.tasaNA), n(` nominal anual (N.A) los cuales serán cubiertos mes vencido.`),
  ], MAR_L, y, COL_W);
  y += 3;

  // CUARTA
  y = checkY(y, LH * 3);
  y = renderMixto([
    b('CUARTA. Interés de Mora. '),
    n(`En caso de mora pagare(mos) una tasa equivalente a la tasa máxima legal permitida `),
    n(`por la entidad competente y que rija al momento de verificarse la mora.`),
  ], MAR_L, y, COL_W);
  y += 3;

  // QUINTA
  y = checkY(y, LH * 8);
  y = renderMixto([
    b('QUINTA. Vencimiento Anticipado. '),
    n(`Autorizo(amos) al `), b('FONDO DE EMPLEADOS DE UNE "FONDOUNE"'),
    n(` o cualquier otro tenedor legítimo del presente título valor para extinguir el plazo o plazos `),
    n(`que se estipulen para el pago del crédito al cual se refiere este documento y exigir `),
    n(`extrajudicialmente o judicialmente el pago de la totalidad del saldo insoluto, más los intereses `),
    n(`y gastos de cobranza, incluyendo honorarios del abogado, si ocurriere cualquiera de los siguientes `),
    n(`eventos: `), b('A)'), n(` Si hubiere mora en una o más cuotas de capital o de intereses del `),
    n(`crédito otorgado; `), b('B)'), n(` Por la pérdida de la calidad de asociado del deudor en el `),
    b('FONDO DE EMPLEADOS DE UNE "FONDOUNE"'), n(`; `),
    b('C)'), n(` Por las causales previstas en el Reglamento de Crédito o en los Estatutos del `),
    b('FONDO DE EMPLEADOS DE UNE "FONDOUNE"'), n(` en el momento de la suscripción del pagaré; `),
    b('D)'), n(` En caso de que el deudor sea demandado o le sean embargados bienes por persona `),
    n(`distinta al `), b('FONDO DE EMPLEADOS DE UNE "FONDOUNE"'), n(`; `),
    b('E)'), n(` En caso de desmejorar las garantías por mí(nosotros) constituida(s); `),
    b('F)'), n(` En caso de no pagar las pólizas de seguro todo riesgo de las garantías; `),
    b('G)'), n(` En caso de no destinar los desembolsos de crédito para los fines solicitados.`),
  ], MAR_L, y, COL_W);
  y += 3;

  // SEXTA
  y = checkY(y, LH * 8);
  y = renderMixto([
    b('SEXTA. Autorización de descuentos. '),
    n(`El(los) obligado(s) en el presente título autorizo(amos) irrevocablemente al pagador de la `),
    n(`empresa en la cual laboro(amos) o llegara(mos) a laborar, para que descuente del salario mensual `),
    n(`la cuota establecida en la cláusula segunda de este pagaré, y en caso de presentarse alguna(s) de `),
    n(`la(s) causal(es) previstas para la extinción del plazo y exigirse la totalidad de la suma adeudada `),
    n(`en este pagaré, igualmente autorizo(amos) irrevocablemente para que se descuente de mi(nuestro) `),
    n(`salario, mis(nuestras) prestaciones sociales o de cualquier suma que me(nos) llegara a corresponder `),
    n(`en virtud del contrato de trabajo y su liquidación, así también por conceptos como bonificaciones y `),
    n(`todo concepto constitutivo de salario, bonificaciones no constitutivas de salario, comisiones, `),
    n(`honorarios, vacaciones, liquidación, y cualquier otro concepto pagadero con ocasión de la prestación `),
    n(`de sus servicios y las mismas sean entregadas al `), b('FONDO DE EMPLEADOS DE UNE "FONDOUNE"'),
    n(` o su tenedor legítimo para que sean abonadas al presente pagaré.`),
  ], MAR_L, y, COL_W);
  y += 3;

  // SÉPTIMA
  y = checkY(y, LH * 6);
  y = renderMixto([
    b('SÉPTIMA. Costos. '),
    n(`Los gastos que se ocasionen por el otorgamiento de este pagaré, así como las costas y gastos de `),
    n(`cobranza en caso de cobro judicial o extrajudicial, serán a cargo del(los) deudor(es). En todo caso, `),
    n(`el(los) deudor(es) asumirán(n) los honorarios de abogado que corresponderán al `),
    b('30%'), n(` del saldo insoluto `),
    n(`de la presente obligación, es decir, el valor de capital pretendido en la respectiva demanda, los `),
    n(`cuales serán exigibles a partir de la fecha de vencimiento de este pagaré y ocasionarán intereses de `),
    n(`mora a la tasa máxima legal permitida a partir de la fecha en que sean exigibles.`),
  ], MAR_L, y, COL_W);
  y += 3;

  // OCTAVA
  y = checkY(y, LH * 5);
  y = renderMixto([
    b('OCTAVA. '),
    n(`En el caso de presentarse alguna(s) de la(s) causal(es) previstas para la extinción del plazo y `),
    n(`exigirse la totalidad de la suma adeudada en este pagaré, el recibo de abonos parciales no implica `),
    n(`novación. Además, entre los distintos suscriptores nos conferimos poder recíprocamente en caso de que `),
    n(`se acuerde una refinanciación, prórroga del plazo, reestructuración de la deuda, o modificación o `),
    n(`aclaración de las condiciones pactadas, manteniéndose la solidaridad, para lo cual cualquiera nosotros `),
    n(`podrá suscribir nuevos acuerdos en nombre y representación de los demás.`),
  ], MAR_L, y, COL_W);
  y += 3;

  // NOVENA
  y = checkY(y, LH * 3);
  y = renderMixto([
    b('NOVENA. '),
    n(`El presente pagaré respalda y garantiza obligaciones pasadas, presentes y futuras por mí(nosotros) `),
    n(`constituidas con el `), b('FONDO DE EMPLEADOS DE UNE "FONDOUNE"'), n('.'),
  ], MAR_L, y, COL_W);
  y += 5;

  // Lugar y fecha de firma
  y = checkY(y, LH * 2 + FIRMA_H + 4 + LH * 4 + 10);
  y = txtJ(
    `En constancia se firma en la ciudad de ${D.ciudadOtorg} a los días del mes de ` +
    `${D.mes1} del año ${D.anio1}.`,
    MAR_L, y, COL_W
  );
  y += 8;

  // Bloque de firmas — Página 1
  y = dibujarFirmas(y);

  // Pie página 1
  piePagina();

  // ════════════════════════════════════════════════════════════════
  // PÁGINA 2 — CARTA DE INSTRUCCIONES
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  y = MAR_TOP;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_TIT);
  doc.setTextColor(...BLACK);
  doc.text('FONDO DE EMPLEADOS UNE - "FONDOUNE"', PAGE_W / 2, y, { align: 'center' });
  y += 6;
  doc.text(`CARTA DE INSTRUCCIONES PARA DILIGENCIAR PAGARÉ No. ${D.pagNro}`, PAGE_W / 2, y, { align: 'center' });
  y += 10;

  // Párrafo introductorio
  y = renderMixto([
    n(`Yo(nosotros) `), b(D.nombre),
    n(`, identificado(s) como aparece al pie de mi(nuestras) firma(s), obrando en calidad de deudor y `),
    n(`codeudor(es) solidario(s) autorizo(amos) al `),
    b('FONDO DE EMPLEADOS DE UNE "FONDOUNE"'),
    n(`, identificado con NIT `), b('811018807-8'),
    n(` o cualquier otro tenedor legítimo del pagaré que hemos suscrito a favor del `),
    b('FONDO DE EMPLEADOS DE UNE "FONDOUNE"'),
    n(`, para que, haciendo uso de las facultades conferidas en el `),
    b('Artículo 622 del Código de Comercio'),
    n(`, diligencie los espacios en blanco del respectivo pagaré, para lo cual debe ceñirse a las `),
    n(`siguientes instrucciones:`),
  ], MAR_L, y, COL_W);
  y += 5;

  // Lista numerada
  const instrucciones = [
    [ n(`El `), b('FONDO DE EMPLEADOS DE UNE "FONDOUNE"'),
      n(` o su tenedor legítimo podrá llenar los espacios en blanco del Pagaré identificado anteriormente, `),
      n(`cuando se presente una o varias de las circunstancias de exigibilidad contenidas en la `),
      b('Cláusula Quinta'), n(` del texto del Pagaré objeto de esta autorización.`) ],
    [ n(`El número del pagare será el que determine el `), b('FONDO DE EMPLEADOS DE UNE "FONDOUNE"'), n('.') ],
    [ n(`El espacio correspondiente a nombres de(l) (los) deudor(es) será diligenciado con el nombre de los suscribientes.`) ],
    [ n(`El espacio en blanco correspondiente a la ciudad de domicilio de(l) (los) deudor(es) será diligenciado `),
      n(`con la ciudad que haya informado el deudor principal del crédito en el formulario de afiliación al Fondo de `),
      n(`Empleados o en otro documento en el cual se pueda observar el lugar de residencia del mencionado deudor. `),
      n(`A falta de información relacionada, será la ciudad de `), b('Medellín'), n('.') ],
    [ n(`En el espacio correspondiente al valor del pagaré, en la `), b('cláusula primera'),
      n(`, se debe diligenciar el valor desembolsado al deudor por el `),
      b('FONDO DE EMPLEADOS DE UNE "FONDOUNE"'),
      n(` o con el valor de la refinanciación, si éste último fuere mayor a la suma desembolsada inicialmente.`) ],
    [ n(`La `), b('cláusula segunda'), n(` será diligenciada en su orden así: número de cuotas pactadas en el `),
      n(`crédito o en la refinanciación, si a ello hubiere lugar; periodicidad de la cuota si es quincenal o `),
      n(`mensual, pactadas en el crédito o en la refinanciación, si a ello hubiere lugar; valor de la cuota en `),
      n(`letras pactadas en el crédito o en la refinanciación, si a ello hubiere lugar; valor de la cuota en `),
      n(`números; día, mes y año de pago de la primera cuota pactada en el crédito o en la refinanciación, `),
      n(`si a ello hubiere lugar; el último espacio se diligenciará con el número total de cuotas pactadas `),
      n(`en el crédito o en la refinanciación, si a ello hubiere lugar.`) ],
    [ n(`Los espacios correspondientes a las tasas de interés determinados en la `), b('cláusula tercera'),
      n(` serán diligenciados conforme a las tasas con las que se haya aprobado el crédito o sus respectivas `),
      n(`modificaciones acordadas por las partes.`) ],
    [ n(`El espacio en blanco correspondiente a la ciudad de otorgamiento del pagaré será diligenciado en la `),
      n(`ciudad donde tenga domicilio principal el `), b('FONDO DE EMPLEADOS DE UNE "FONDOUNE"'), n('.') ],
    [ n(`Para llenar el Pagaré, el `), b('FONDO DE EMPLEADOS DE UNE "FONDOUNE"'),
      n(` no requiere dar aviso a los firmantes del mismo.`) ],
    [ n(`Hago(hacemos) expreso reconocimiento de que conservo copia de estas instrucciones y documentos, `),
      n(`y conozco plenamente el contenido de los mismos.`) ],
  ];

  instrucciones.forEach((segs, idx) => {
    const lineas = estimarLineas(segs, COL_W - 7);
    y = checkY(y, lineas * LH + 4);

    // Número del ítem
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FS);
    doc.setTextColor(...BLACK);
    const numeral = `${idx + 1}.  `;
    const nW = doc.getTextWidth(numeral);
    doc.text(numeral, MAR_L, y);

    // Texto justificado del ítem, indentado bajo el número
    const yFin = renderMixto(segs, MAR_L + nW, y, COL_W - nW);
    y = yFin + 3;
  });

  // Cierre carta
  y += 3;
  y = checkY(y, LH * 2 + FIRMA_H + 4 + LH * 4 + 10);
  y = txtJ(
    `En constancia de lo anterior se firma esta carta de instrucciones en duplicado a los ` +
    `días del mes de ${D.mes1} del año ${D.anio1}.`,
    MAR_L, y, COL_W
  );
  y += 8;

  // Bloque de firmas — Página 2
  dibujarFirmas(y);

  // Pie página 2
  piePagina();

  // ── Guardar ───────────────────────────────────────────────────
  const archivo = `Pagare_FondoUne_${(D.numId || 'asociado').replace(/\s/g, '_')}.pdf`;
  doc.save(archivo);
  return doc;
};

// ── Carga dinámica de jsPDF si no está en la página ─────────────
window.cargarJsPDFSiNecesario = function(callback) {
  if (typeof window.jspdf !== 'undefined' || typeof window.jsPDF !== 'undefined') {
    callback(); return;
  }
  const s = document.createElement('script');
  s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.onload  = callback;
  s.onerror = () => console.error('No se pudo cargar jsPDF desde CDN.');
  document.head.appendChild(s);
};
