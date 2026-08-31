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

    // Write values to specific cells (A through G)
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `'Inventario'!A${newRow}`, values: [[body.codigo || '']] },
          { range: `'Inventario'!B${newRow}`, values: [[body.descripcion || '']] },
          { range: `'Inventario'!F${newRow}`, values: [['0']] },
          { range: `'Inventario'!G${newRow}`, values: [['0']] },
        ],
      },
    });

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
