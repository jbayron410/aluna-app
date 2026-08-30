const { getSheetsClient, appendRow, getLastRow, setFormulas } = require('./_lib/sheets');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const body = req.body;
    const sheets = await getSheetsClient();
    const lastRow = await getLastRow(sheets, 'Inventario');
    const newRow = lastRow + 1;

    // Columns: A(empty), B(Codigo), C(Descripcion), D(Entrada=0), E(Salida=0), F(Inventario=formula), G(Daniela=0), H(Bayron=0), I(Costo promedio=formula), J(Inventario OK?), K(Activo=formula)
    const values = [
      '',
      body.codigo || '',
      body.descripcion || '',
      '0',
      '0',
      '',
      '0',
      '0',
      '',
      '',
      '',
    ];

    await appendRow(sheets, 'Inventario', values);

    // Set formulas
    await setFormulas(sheets, 'Inventario', newRow, {
      'F': '=D{row}-E{row}',
      'I': '=IFERROR(SUMIF(Tabla_1[[#ALL],[Codigo]];B{row};Tabla_1[[#ALL],[Total]])/D{row};0)',
      'J': '=IF(F{row}>0;"OK";"Agotado")',
      'K': '=F{row}*I{row}',
    });

    res.status(200).json({ success: true, row: newRow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
