const { getSheetsClient, appendRow, setFormulas, SPREADSHEET_ID } = require('./_lib/sheets');

function parseNumericValue(value) {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const body = req.body || {};
    const sheets = await getSheetsClient();

    if (req.method === 'POST') {
      const values = [
        body.fecha || '',
        body.ventaRef || '',
        "'" + String(body.codigo || ''),
        body.descripcion || '',
        Math.max(1, parseInt(body.cantidad, 10) || 1),
        parseNumericValue(body.valorDevuelto),
        parseNumericValue(body.costoEnvio),
        body.estadoProducto || 'Bueno',
        body.motivo || '',
        '',
      ];

      const result = await appendRow(sheets, 'Devoluciones', values);
      const newRow = result.row;

      await setFormulas(sheets, 'Devoluciones', newRow, {
        'J': '=F{row}+G{row}',
      });

      res.status(200).json({ success: true, row: newRow });
      return;
    }

    if (req.method === 'PUT') {
      const rowNumber = parseInt(body.rowNumber, 10);
      if (!rowNumber || rowNumber < 2) {
        res.status(400).json({ error: 'Invalid row number for return update' });
        return;
      }

      const updatedRowValues = [
        body.fecha || '',
        body.ventaRef || '',
        "'" + String(body.codigo || ''),
        body.descripcion || '',
        Math.max(1, parseInt(body.cantidad, 10) || 1),
        parseNumericValue(body.valorDevuelto),
        parseNumericValue(body.costoEnvio),
        body.estadoProducto || 'Bueno',
        body.motivo || '',
        `=F${rowNumber}+G${rowNumber}`,
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'Devoluciones'!A${rowNumber}:J${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRowValues],
        },
      });

      res.status(200).json({ success: true, row: rowNumber });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
