const { getSheetsClient, getLastRow, setFormulas, SPREADSHEET_ID } = require('./_lib/sheets');

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

    // Write values directly to specific cells (B through H), skip A
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `'Inventario'!B${newRow}`, values: [[body.codigo || '']] },
          { range: `'Inventario'!C${newRow}`, values: [[body.descripcion || '']] },
          { range: `'Inventario'!D${newRow}`, values: [['0']] },
          { range: `'Inventario'!E${newRow}`, values: [['0']] },
          { range: `'Inventario'!G${newRow}`, values: [['0']] },
          { range: `'Inventario'!H${newRow}`, values: [['0']] },
        ],
      },
    });

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
