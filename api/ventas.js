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

    const values = [
      body.quienRecibe || '',
      body.fecha || '',
      body.codigo || '',
      body.documento || '',
      body.cliente || '',
      body.descripcion || '',
      body.cantidad || '',
      body.costo || '',
      body.precioVenta || '',
      body.envio || '$0',
      body.comision || '$0',
      body.otros || '$0',
      '',
      body.enTransito || 'NO',
      '',
      '',
      '',
      body.fuente || 'MELI',
    ];

    const result = await appendRow(sheets, 'Ventas Proyectos', values);
    const newRow = result.row;

    await setFormulas(sheets, 'Ventas Proyectos', newRow, {
      'M': '=I{row}-J{row}-K{row}-L{row}',
      'O': '=M{row}*G{row}',
      'P': '=O{row}-(H{row}*G{row})',
      'Q': '=IF((H{row}*G{row})=0,0,P{row}/(H{row}*G{row}))',
    });

    res.status(200).json({ success: true, row: newRow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
