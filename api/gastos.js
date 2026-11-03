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
      body.quienPaga || '',
      body.fecha || '',
      body.categoria || 'Embalaje',
      body.descripcion || '',
      body.cantidad || '1',
      body.valor || '',
      '',
    ];

    const result = await appendRow(sheets, 'Gastos', values);
    const newRow = result.row;

    await setFormulas(sheets, 'Gastos', newRow, {
      'G': '=E{row}*F{row}',
    });

    res.status(200).json({ success: true, row: newRow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

