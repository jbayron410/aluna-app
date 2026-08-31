const { getSheetsClient, appendRow, setFormulas } = require('./_lib/sheets');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const body = req.body;
    const sheets = await getSheetsClient();

    // Use appendRow so the product lands INSIDE the table (not after it)
    const values = [
      body.codigo || '',       // A: Codigo
      body.descripcion || '',  // B: Descripción
      '',                      // C: Entrada (formula)
      '',                      // D: Salida (formula)
      '',                      // E: Inventario (formula)
      '0',                     // F
      '0',                     // G
      '',                      // H: Costo promedio (formula)
      '',                      // I: Status (formula)
      '',                      // J: Activo (formula)
    ];

    const result = await appendRow(sheets, 'Inventario', values);
    const newRow = result.row;

    // Set formulas — Entrada y Salida son SUMIF que se actualizan solas
    await setFormulas(sheets, 'Inventario', newRow, {
      'C': "=IFERROR(SUMIF('Compras Proyecto'!$C:$C;$A{row};'Compras Proyecto'!$E:$E);0)",
      'D': "=IFERROR(SUMIF('Ventas Proyectos'!$C:$C;$A{row};'Ventas Proyectos'!$G:$G);0)",
      'E': '=C{row}-D{row}',
      'H': '=IFERROR(SUMIF(Tabla_1[[#ALL],[Codigo]];A{row};Tabla_1[[#ALL],[Total]])/C{row};0)',
      'I': '=IF(E{row}>0;"OK";"Agotado")',
      'J': '=E{row}*H{row}',
    });

    res.status(200).json({ success: true, row: newRow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
