const { getSheetsClient, appendRow, setFormulas } = require('./_lib/sheets');

// Convierte un valor monetario (ej: "$12.000" o "12000") a número, o 0 si no es válido
function parseNum(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const body = req.body;
    const sheets = await getSheetsClient();

    const values = [
      body.quienRecibe || '',   // A
      body.fecha || '',          // B
      body.codigo || '',         // C
      body.documento || '',      // D
      body.cliente || '',        // E
      body.descripcion || '',    // F
      body.cantidad || '',       // G
      '',                        // H: costo (fórmula VLOOKUP desde Inventario)
      body.precioVenta || '',    // I
      parseNum(body.envio),      // J
      parseNum(body.comision),   // K
      parseNum(body.otros),      // L
      '',                        // M: ganancia unitaria (fórmula)
      body.enTransito || 'NO',   // N
      '',                        // O: total (fórmula con IF)
      '',                        // P: ganancia (fórmula)
      '',                        // Q: porcentaje (fórmula)
      body.fuente || 'MELI',     // R
    ];

    const result = await appendRow(sheets, 'Ventas Proyectos', values);
    const newRow = result.row;

    await setFormulas(sheets, 'Ventas Proyectos', newRow, {
      'H': "=IFERROR(VLOOKUP(C{row},'Inventario'!$A:$J;8;FALSE);0)",
      'M': '=I{row}-J{row}-K{row}-L{row}',
      'O': '=IF(I{row}="";"";M{row}*G{row})',
      'P': '=IF(O{row}="";"";O{row}-(H{row}*G{row}))',
      'Q': '=IF((H{row}*G{row})=0;0;P{row}/(H{row}*G{row}))',
    });

    res.status(200).json({ success: true, row: newRow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
