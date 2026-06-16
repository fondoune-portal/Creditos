/**
 * FondoUne — Generador de Pagaré PDF
 * Usa jsPDF (cargado vía CDN) para generar las páginas 1 y 2 del pagaré
 * con los datos del asociado diligenciados.
 *
 * USO:
 *   1. Agregar al <head> del HTML:
 *      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 *
 *   2. Incluir este archivo:
 *      <script src="pagare-pdf-generator.js"></script>
 *
 *   3. Llamar la función con los datos del crédito:
 *      generarPagarePDF(datosPagare);
 *
 * OBJETO datosPagare (todos los campos que llena el portal):
 * {
 *   // Datos del deudor principal
 *   nombreDeudor:        "NICOLAS ALEJANDRO RAMOS ACOSTA",
 *   tipoIdDeudor:        "CC",
 *   numIdDeudor:         "2045993",
 *   ciudadDeudor:        "Medellín",
 *
 *   // Datos del codeudor (opcional — dejar vacío si no aplica)
 *   nombreCodudor:       "",
 *   tipoIdCodeudor:      "",
 *   numIdCodeudor:       "",
 *
 *   // Condiciones del crédito
 *   valorLetras:         "OCHO MILLONES DE PESOS MONEDA CORRIENTE",
 *   valorNumeros:        "8.000.000",
 *   numeroCuotas:        "24",
 *   periodicidad:        "mensuales",
 *   valorCuotaLetras:    "TRESCIENTOS OCHENTA Y UN MIL OCHENTA Y SIETE PESOS",
 *   valorCuotaNumeros:   "381.087",
 *   diaPrimeraCuota:     "16",
 *   mesPrimeraCuota:     "julio",
 *   anioPrimeraCuota:    "2026",
 *   tasaEA:              "18.90%",
 *   tasaNA:              "17.28%",
 *
 *   // Datos del pagaré
 *   numeroPagare:        "PAG-2026-8189",
 *   ciudadOtorgamiento:  "Medellín",
 *   hashFirma:           "d0427829faf0ca39...",
 *   nroTransaccion:      "d2d4d382-8442-4807-82a8-fee7e98f679c",
 *   fechaFirma:          "16/06/2026",
 *   horaDia:             "30/04/2026 15:53:50",
 * }
 */

window.generarPagarePDF = function(datos) {

  // ── Guardia: verificar que jsPDF esté cargado ──────────────────────────────
  if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
    console.error("jsPDF no está cargado. Agrega la CDN antes de este script.");
    return null;
  }

  const { jsPDF } = window.jspdf || { jsPDF: window.jsPDF };

  // ── Constantes de diseño ───────────────────────────────────────────────────
  const PAGE_W   = 216;   // mm — carta
  const PAGE_H   = 279;   // mm — carta
  const MAR_L    = 20;    // margen izquierdo
  const MAR_R    = 20;    // margen derecho
  const COL_W    = PAGE_W - MAR_L - MAR_R;  // ancho útil

  const FONT_NORMAL = 8.5;
  const FONT_SMALL  = 7.5;
  const FONT_TITLE  = 11;
  const LINE_H      = 4.5; // altura de línea base

  // Colores
  const COLOR_BLACK = [0,   0,   0];
  const COLOR_GRAY  = [100, 100, 100];

  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });

  // ── Helper: texto justificado con salto de línea automático ───────────────
  function wrappedText(doc, text, x, y, maxW, lineH, opts = {}) {
    const lines = doc.splitTextToSize(text, maxW);
    lines.forEach((line, i) => {
      doc.text(line, x, y + i * lineH, opts);
    });
    return y + lines.length * lineH;
  }

  // ── Helper: texto con valor subrayado inline ───────────────────────────────
  function lineWithValue(doc, label, value, x, y, totalW) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_NORMAL);
    const labelW = doc.getTextWidth(label);
    doc.text(label, x, y);
    // línea subrayada para el valor
    const valX   = x + labelW + 1;
    const valW   = totalW - labelW - 2;
    doc.setLineWidth(0.1);
    doc.line(valX, y + 0.5, valX + valW, y + 0.5);
    doc.setFont("helvetica", "bold");
    doc.text(value, valX + 1, y);
    doc.setFont("helvetica", "normal");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PÁGINA 1 — PAGARÉ
  // ══════════════════════════════════════════════════════════════════════════

  let y = 18;

  // ── Encabezado ────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_TITLE);
  doc.setTextColor(...COLOR_BLACK);
  doc.text("FONDO DE EMPLEADOS UNE - \"FONDOUNE\"", PAGE_W / 2, y, { align: "center" });
  y += 6;
  doc.text(`PAGARÉ A LA ORDEN Nro. ${datos.numeroPagare || "_______"}`, PAGE_W / 2, y, { align: "center" });
  y += 10;

  // ── Párrafo de identificación ─────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_NORMAL);

  const textoId =
    `Yo(nosotros) ${datos.nombreDeudor || "_______________________________________________"}, ` +
    `mayor(es) de edad y domiciliado(s) en la ciudad de ${datos.ciudadDeudor || "________________"}, ` +
    `identificado(s) como aparece al pie de mi(nuestras) firma(s), por medio del presente pagaré hago(hacemos) ` +
    `constar que pagare(mos) solidaria, incondicional e indivisiblemente a la orden del FONDO DE EMPLEADOS DE UNE ` +
    `"FONDOUNE", identificado con NIT 811018807-8, o a quien represente sus derechos, todos los valores estipulados ` +
    `en este título valor, en las cuentas bancarias dispuestas para ello o en la ciudad de Medellín o lugar que señale ` +
    `y de acuerdo al plan de amortización que más adelante se determina, para lo cual también manifestamos que de ella ` +
    `he(hemos) recibido a entera satisfacción a título de mutuo solidario, con intereses y de acuerdo a las siguientes ` +
    `cláusulas:`;
  y = wrappedText(doc, textoId, MAR_L, y, COL_W, LINE_H);
  y += 2;

  // ── PRIMERA. Valor ─────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.text("PRIMERA. Valor.", MAR_L, y);
  const p1Lbl = "PRIMERA. Valor.";
  const p1LblW = doc.getTextWidth(p1Lbl);
  doc.setFont("helvetica", "normal");
  const p1Resto =
    ` La suma de ${datos.valorLetras || "_____________________________"} ` +
    `($ ${datos.valorNumeros || "________________"}), la cual pagare(mos) solidariamente.`;
  y = wrappedText(doc, doc.splitTextToSize(p1LblW + p1Resto, COL_W).join(""), MAR_L, y, COL_W, LINE_H);

  // texto limpio con bold intercalado
  doc.setFont("helvetica", "normal");
  const p1Text = ` La suma de ${datos.valorLetras || "___________________________________________________"} ($ ${datos.valorNumeros || "________________"}), la cual pagare(mos) solidariamente.`;
  y = wrappedText(doc, "PRIMERA. Valor." + p1Text, MAR_L, y - LINE_H, COL_W, LINE_H);
  y += 2;

  // ── SEGUNDA. Amortización ──────────────────────────────────────────────────
  const p2Text =
    `SEGUNDA. Amortización. El(los) deudor(es) se obliga(n) a pagar la suma descrita en ` +
    `${datos.numeroCuotas || "___"} cuotas ${datos.periodicidad || "___________"} por un valor de ` +
    `${datos.valorCuotaLetras || "________________________________"} ` +
    `($ ${datos.valorCuotaNumeros || "________________"}) cada una, ` +
    `la primera la pagare(mos) el día ${datos.diaPrimeraCuota || "___"} del mes de ` +
    `${datos.mesPrimeraCuota || "_________"} del año ${datos.anioPrimeraCuota || "______"} y así ` +
    `sucesivamente y sin interrupción cada mes hasta completar las ${datos.numeroCuotas || "___"} cuotas. ` +
    `Todo pago que se reciba se aplicará, salvo pacto en contrario, a: impuestos, gastos, costas, seguros, ` +
    `papelería, honorarios, intereses de mora, intereses corrientes y por último a capital, todo esto según el caso. ` +
    `Doy(damos) instrucciones para que todos los pagos parciales extraordinarios, anticipados, en exceso, o cualquier ` +
    `otro sobrante aun por reliquidación de intereses, que no tenga expreso el destino de dicho pago, sean aplicados, ` +
    `en primer lugar, a los intereses adeudados y, en segundo orden, a capital con destino a la disminución del plazo.`;
  y = wrappedText(doc, p2Text, MAR_L, y, COL_W, LINE_H);
  y += 2;

  // ── TERCERA. Interés de Plazo ──────────────────────────────────────────────
  const p3Text =
    `TERCERA. Interés de Plazo. Pagare(mos) interés mensual corriente a la tasa del ` +
    `${datos.tasaEA || "_____"} efectivo anual (E.A), equivalente a la tasa ` +
    `${datos.tasaNA || "_____"} nominal anual (N.A) los cuales serán cubiertos mes vencido.`;
  y = wrappedText(doc, p3Text, MAR_L, y, COL_W, LINE_H);
  y += 2;

  // ── CUARTA — NOVENA (texto fijo compacto) ──────────────────────────────────
  const clausulasFijas = [
    `CUARTA. Interés de Mora. En caso de mora pagare(mos) una tasa equivalente a la tasa máxima legal permitida ` +
    `por la entidad competente y que rija al momento de verificarse la mora.`,

    `QUINTA. Vencimiento Anticipado. Autorizo(amos) al FONDO DE EMPLEADOS DE UNE "FONDOUNE" o cualquier otro ` +
    `tenedor legítimo del presente título valor para extinguir el plazo o plazos que se estipulen para el pago del ` +
    `crédito al cual se refiere este documento y exigir extrajudicialmente o judicialmente el pago de la totalidad ` +
    `del saldo insoluto, más los intereses y gastos de cobranza, incluyendo honorarios del abogado, si ocurriere ` +
    `cualquiera de los siguientes eventos: A) Si hubiere mora en una o más cuotas de capital o de intereses del ` +
    `crédito otorgado; B) Por la pérdida de la calidad de asociado del deudor en el FONDO DE EMPLEADOS DE UNE ` +
    `"FONDOUNE"; C) Por las causales previstas en el Reglamento de Crédito o en los Estatutos del FONDO DE EMPLEADOS ` +
    `DE UNE "FONDOUNE" en el momento de la suscripción del pagaré; D) En caso de que el deudor sea demandado o le ` +
    `sean embargados bienes por persona distinta al FONDO DE EMPLEADOS DE UNE "FONDOUNE"; E) En caso de desmejorar ` +
    `las garantías por mí(nosotros) constituida(s); F) En caso de no pagar las pólizas de seguro todo riesgo de ` +
    `las garantías; G) En caso de no destinar los desembolsos de crédito para los fines solicitados.`,

    `SEXTA. Autorización de descuentos. El(los) obligado(s) en el presente título autorizo(amos) irrevocablemente ` +
    `al pagador de la empresa en la cual laboro(amos) o llegara(mos) a laborar, para que descuente del salario mensual ` +
    `la cuota establecida en la cláusula segunda de este pagaré, y en caso de presentarse alguna(s) de la(s) causal(es) ` +
    `previstas para la extinción del plazo y exigirse la totalidad de la suma adeudada en este pagaré, igualmente ` +
    `autorizo(amos) irrevocablemente para que se descuente de mi(nuestro) salario, mis(nuestras) prestaciones sociales ` +
    `o de cualquier suma que me(nos) llegara a corresponder en virtud del contrato de trabajo y su liquidación, así ` +
    `también por conceptos como bonificaciones y todo concepto constitutivo de salario, bonificaciones no constitutivas ` +
    `de salario, comisiones, honorarios, vacaciones, liquidación, y cualquier otro concepto pagadero con ocasión de la ` +
    `prestación de sus servicios y las mismas sean entregadas al FONDO DE EMPLEADOS DE UNE "FONDOUNE" o su tenedor ` +
    `legítimo para que sean abonadas al presente pagaré.`,

    `SÉPTIMA. Costos. Los gastos que se ocasionen por el otorgamiento de este pagaré, así como las costas y gastos ` +
    `de cobranza en caso de cobro judicial o extrajudicial, serán a cargo del(los) deudor(es). En todo caso, el(los) ` +
    `deudor(es) asumirán(n) los honorarios de abogado que corresponderán al 30% del saldo insoluto de la presente ` +
    `obligación, es decir, el valor de capital pretendido en la respectiva demanda, los cuales serán exigibles a partir ` +
    `de la fecha de vencimiento de este pagaré y ocasionarán intereses de mora a la tasa máxima legal permitida a ` +
    `partir de la fecha en que sean exigibles.`,

    `OCTAVA. En el caso de presentarse alguna(s) de la(s) causal(es) previstas para la extinción del plazo y exigirse ` +
    `la totalidad de la suma adeudada en este pagaré, el recibo de abonos parciales no implica novación. Además, entre ` +
    `los distintos suscriptores nos conferimos poder recíprocamente en caso de que se acuerde una refinanciación, ` +
    `prórroga del plazo, reestructuración de la deuda, o modificación o aclaración de las condiciones pactadas, ` +
    `manteniéndose la solidaridad, para lo cual cualquiera nosotros podrá suscribir nuevos acuerdos en nombre y ` +
    `representación de los demás.`,

    `NOVENA. El presente pagaré respalda y garantiza obligaciones pasadas, presentes y futuras por mí(nosotros) ` +
    `constituidas con el FONDO DE EMPLEADOS DE UNE "FONDOUNE".`,
  ];

  clausulasFijas.forEach(clausula => {
    // Verificar si queda espacio suficiente en la página (reservar 40mm para firmas)
    const lines = doc.splitTextToSize(clausula, COL_W);
    if (y + lines.length * LINE_H + 40 > PAGE_H - 15) {
      doc.addPage();
      y = 18;
    }
    y = wrappedText(doc, clausula, MAR_L, y, COL_W, LINE_H);
    y += 2;
  });

  // ── Lugar y fecha de firma ─────────────────────────────────────────────────
  y += 3;
  const fechaTexto =
    `En constancia se firma en la ciudad de ${datos.ciudadOtorgamiento || "Medellín"} a los días del mes de ` +
    `${datos.mesPrimeraCuota || "_________"} del año ${datos.anioPrimeraCuota || "______"}.`;

  // Si estamos muy abajo, saltar a nueva página
  if (y + 40 > PAGE_H - 10) { doc.addPage(); y = 18; }

  y = wrappedText(doc, fechaTexto, MAR_L, y, COL_W, LINE_H);
  y += 10;

  // ── Bloque de firmas — Página 1 ───────────────────────────────────────────
  const COL1_X = MAR_L;
  const COL2_X = PAGE_W / 2 + 5;
  const FIRMA_W = COL_W / 2 - 5;

  // Líneas de firma
  doc.setLineWidth(0.2);
  doc.line(COL1_X, y, COL1_X + FIRMA_W, y);
  doc.line(COL2_X, y, COL2_X + FIRMA_W, y);

  y += 4;
  doc.setFontSize(FONT_SMALL);

  // Deudor principal
  doc.setFont("helvetica", "bold");
  doc.text("Deudor Principal", COL1_X, y);
  doc.setFont("helvetica", "normal");
  y += LINE_H;
  doc.text(`Nombre: ${datos.nombreDeudor || ""}`, COL1_X, y);
  y += LINE_H;
  doc.text(`Tipo de Identificación: ${datos.tipoIdDeudor || "CC"}`, COL1_X, y);
  y += LINE_H;
  doc.text(`Número de identificación: ${datos.numIdDeudor || ""}`, COL1_X, y);

  // Reiniciar Y para columna 2
  let y2 = y - (LINE_H * 3);
  doc.setFont("helvetica", "bold");
  doc.text("Deudor(a) Solidario(a)", COL2_X, y2);
  doc.setFont("helvetica", "normal");
  y2 += LINE_H;
  doc.text(`Nombre: ${datos.nombreCodeudor || ""}`, COL2_X, y2);
  y2 += LINE_H;
  doc.text(`Tipo de Identificación: ${datos.tipoIdCodeudor || ""}`, COL2_X, y2);
  y2 += LINE_H;
  doc.text(`Número de identificación: ${datos.numIdCodeudor || ""}`, COL2_X, y2);

  y = Math.max(y, y2) + 6;

  // ── Pie: hash de firma ─────────────────────────────────────────────────────
  doc.setFontSize(6.5);
  doc.setTextColor(...COLOR_GRAY);
  doc.text(
    `Firmado con Firma Plus, Nro. Transacción: ${datos.nroTransaccion || ""}`,
    MAR_L, PAGE_H - 8
  );

  // ══════════════════════════════════════════════════════════════════════════
  // PÁGINA 2 — CARTA DE INSTRUCCIONES
  // ══════════════════════════════════════════════════════════════════════════

  doc.addPage();
  y = 18;

  // ── Encabezado ────────────────────────────────────────────────────────────
  doc.setTextColor(...COLOR_BLACK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_TITLE);
  doc.text("FONDO DE EMPLEADOS UNE - \"FONDOUNE\"", PAGE_W / 2, y, { align: "center" });
  y += 6;
  doc.text(
    `CARTA DE INSTRUCCIONES PARA DILIGENCIAR PAGARÉ No. ${datos.numeroPagare || "_______"}`,
    PAGE_W / 2, y, { align: "center" }
  );
  y += 10;

  // ── Párrafo de identificación ─────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_NORMAL);

  const textoCarta =
    `Yo(nosotros) ${datos.nombreDeudor || "_________________________________________"}, ` +
    `identificado(s) como aparece al pie de mi(nuestras) firma(s), obrando en calidad de deudor y ` +
    `codeudor(es) solidario(s) autorizo(amos) al FONDO DE EMPLEADOS DE UNE "FONDOUNE", identificado con ` +
    `NIT 811018807-8 o cualquier otro tenedor legítimo del pagaré que hemos suscrito a favor del FONDO DE ` +
    `EMPLEADOS DE UNE "FONDOUNE", para que, haciendo uso de las facultades conferidas en el Artículo 622 del ` +
    `Código de Comercio, diligencie los espacios en blanco del respectivo pagaré, para lo cual debe ceñirse ` +
    `a las siguientes instrucciones:`;
  y = wrappedText(doc, textoCarta, MAR_L, y, COL_W, LINE_H);
  y += 4;

  // ── Lista de instrucciones ─────────────────────────────────────────────────
  const instrucciones = [
    `El FONDO DE EMPLEADOS DE UNE "FONDOUNE" o su tenedor legítimo podrá llenar los espacios en blanco ` +
    `del Pagaré identificado anteriormente, cuando se presente una o varias de las circunstancias de exigibilidad ` +
    `contenidas en la Cláusula Quinta del texto del Pagaré objeto de esta autorización.`,

    `El número del pagare será el que determine el FONDO DE EMPLEADOS DE UNE "FONDOUNE".`,

    `El espacio correspondiente a nombres de(l) (los) deudor(es) será diligenciado con el nombre de los suscribientes.`,

    `El espacio en blanco correspondiente a la ciudad de domicilio de(l) (los) deudor(es) será diligenciado ` +
    `con la ciudad que haya informado el deudor principal del crédito en el formulario de afiliación al Fondo de ` +
    `Empleados o en otro documento en el cual se pueda observar el lugar de residencia del mencionado deudor. ` +
    `A falta de información relacionada, será la ciudad de Medellín.`,

    `En el espacio correspondiente al valor del pagaré, en la cláusula primera, se debe diligenciar el valor ` +
    `desembolsado al deudor por el FONDO DE EMPLEADOS DE UNE "FONDOUNE" o con el valor de la refinanciación, ` +
    `si éste último fuere mayor a la suma desembolsada inicialmente.`,

    `La cláusula segunda será diligenciada en su orden así: número de cuotas pactadas en el crédito o en la ` +
    `refinanciación, si a ello hubiere lugar; periodicidad de la cuota si es quincenal o mensual, pactadas en el ` +
    `crédito o en la refinanciación, si a ello hubiere lugar; valor de la cuota en letras pactadas en el crédito o ` +
    `en la refinanciación, si a ello hubiere lugar; valor de la cuota en números; día, mes y año de pago de la ` +
    `primera cuota pactada en el crédito o en la refinanciación, si a ello hubiere lugar; el último espacio se ` +
    `diligenciará con el número total de cuotas pactadas en el crédito o en la refinanciación, si a ello hubiere lugar.`,

    `Los espacios correspondientes a las tasas de interés determinados en la cláusula tercera serán diligenciados ` +
    `conforme a las tasas con las que se haya aprobado el crédito o sus respectivas modificaciones acordadas por las partes.`,

    `El espacio en blanco correspondiente a la ciudad de otorgamiento del pagaré será diligenciado en la ciudad ` +
    `donde tenga domicilio principal el FONDO DE EMPLEADOS DE UNE "FONDOUNE".`,

    `Para llenar el Pagaré, el FONDO DE EMPLEADOS DE UNE "FONDOUNE" no requiere dar aviso a los firmantes del mismo.`,

    `Hago(hacemos) expreso reconocimiento de que conservo copia de estas instrucciones y documentos, y conozco ` +
    `plenamente el contenido de los mismos.`,
  ];

  instrucciones.forEach((inst, idx) => {
    const numeral = `${idx + 1}. `;
    const lines   = doc.splitTextToSize(numeral + inst, COL_W - 6);
    if (y + lines.length * LINE_H + 35 > PAGE_H - 12) {
      doc.addPage(); y = 18;
    }
    // número en negrita
    doc.setFont("helvetica", "bold");
    doc.text(numeral, MAR_L, y);
    doc.setFont("helvetica", "normal");
    // texto indentado
    const indentLines = doc.splitTextToSize(inst, COL_W - 8);
    const nW = doc.getTextWidth(numeral);
    indentLines.forEach((line, li) => {
      doc.text(line, MAR_L + nW + 0.5, y + li * LINE_H);
    });
    y += indentLines.length * LINE_H + 2;
  });

  // ── Cierre ────────────────────────────────────────────────────────────────
  y += 3;
  if (y + 35 > PAGE_H - 12) { doc.addPage(); y = 18; }

  const cierreTexto =
    `En constancia de lo anterior se firma esta carta de instrucciones en duplicado a los días del mes de ` +
    `${datos.mesPrimeraCuota || "_________"} del año ${datos.anioPrimeraCuota || "______"}.`;
  y = wrappedText(doc, cierreTexto, MAR_L, y, COL_W, LINE_H);
  y += 10;

  // ── Bloque de firmas — Página 2 ───────────────────────────────────────────
  doc.setLineWidth(0.2);
  doc.line(COL1_X, y, COL1_X + FIRMA_W, y);
  doc.line(COL2_X, y, COL2_X + FIRMA_W, y);

  y += 4;
  doc.setFontSize(FONT_SMALL);

  doc.setFont("helvetica", "bold");
  doc.text("Deudor Principal", COL1_X, y);
  doc.setFont("helvetica", "normal");
  y2 = y;
  y += LINE_H;
  doc.text(`Nombre: ${datos.nombreDeudor || ""}`, COL1_X, y);
  y += LINE_H;
  doc.text(`Tipo de Identificación: ${datos.tipoIdDeudor || "CC"}`, COL1_X, y);
  y += LINE_H;
  doc.text(`Número de identificación: ${datos.numIdDeudor || ""}`, COL1_X, y);

  doc.setFont("helvetica", "bold");
  doc.text("Deudor(a) Solidario(a)", COL2_X, y2);
  doc.setFont("helvetica", "normal");
  y2 += LINE_H;
  doc.text(`Nombre: ${datos.nombreCodeudor || ""}`, COL2_X, y2);
  y2 += LINE_H;
  doc.text(`Tipo de Identificación: ${datos.tipoIdCodeudor || ""}`, COL2_X, y2);
  y2 += LINE_H;
  doc.text(`Número de identificación: ${datos.numIdCodeudor || ""}`, COL2_X, y2);

  // ── Pie ───────────────────────────────────────────────────────────────────
  doc.setFontSize(6.5);
  doc.setTextColor(...COLOR_GRAY);
  doc.text(
    `Firmado con Firma Plus, Nro. Transacción: ${datos.nroTransaccion || ""}`,
    MAR_L, PAGE_H - 8
  );

  // ── Guardar / retornar ────────────────────────────────────────────────────
  const nombreArchivo = `Pagare_FondoUne_${(datos.numIdDeudor || "asociado").replace(/\s/g,"_")}.pdf`;
  doc.save(nombreArchivo);
  return doc; // también retorna el objeto por si se necesita blob/preview
};


// ════════════════════════════════════════════════════════════════════════════
//  CARGA DINÁMICA DE jsPDF (si no está ya en la página)
//  Coloca este bloque EN TU HTML o asegúrate de que jsPDF esté cargado
//  antes de llamar generarPagarePDF().
// ════════════════════════════════════════════════════════════════════════════
window.cargarJsPDFSiNecesario = function(callback) {
  if (typeof window.jspdf !== 'undefined' || typeof window.jsPDF !== 'undefined') {
    callback();
    return;
  }
  const script = document.createElement("script");
  script.src   = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  script.onload  = callback;
  script.onerror = () => console.error("No se pudo cargar jsPDF desde CDN.");
  document.head.appendChild(script);
};
