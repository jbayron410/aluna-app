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
    const lastRow = await getLastRow(sheets, 'Ventas Proyectos');
    const newRow = lastRow + 1;

    const values = [
      '',
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

    await appendRow(sheets, 'Ventas Proyectos', values);
    await setFormulas(sheets, 'Ventas Proyectos', newRow, {
      'N': '=J{row}-K{row}-L{row}-M{row}',
      'P': '=N{row}*H{row}',
      'Q': '=P{row}-(I{row}*H{row})',
      'R': '=IF((I{row}*H{row})=0,0,Q{row}/(I{row}*H{row}))',
    });

    res.status(200).json({ success: true, row: newRow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
