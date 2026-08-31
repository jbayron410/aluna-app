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
    const lastRow = await getLastRow(sheets, 'Compras Proyecto');
    const newRow = lastRow + 1;

    const values = [
      body.quienEntrega || '',
      body.fecha || '',
      body.codigo || '',
      body.descripcion || '',
      body.cantidad || '',
      body.valor || '',
      '',
      body.estado || 'OK',
    ];

    await appendRow(sheets, 'Compras Proyecto', values);
    await setFormulas(sheets, 'Compras Proyecto', newRow, {
      'G': '=E{row}*F{row}',
    });

    res.status(200).json({ success: true, row: newRow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
