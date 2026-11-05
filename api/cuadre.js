const { getSheetsClient, SPREADSHEET_ID } = require('./_lib/sheets');

const COLOMBIAN_DENOMINATIONS = [
  100000,
  50000,
  20000,
  10000,
  5000,
  2000,
  1000,
  500,
  200,
  100,
  50,
];

function parseNumericInput(value) {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const body = req.body || {};
    const denominationsMap = body.denominations || {};
    const meliBalance = parseNumericInput(body.meliBalance);
    const updatedAt = body.updatedAt || new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

    const quantityRows = COLOMBIAN_DENOMINATIONS.map(denom => [
      Math.max(0, Math.floor(parseNumericInput(denominationsMap[String(denom)]))),
    ]);

    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: "'Cuadre Caja'!B2:B12",
            values: quantityRows,
          },
          {
            range: "'Cuadre Caja'!C14:C15",
            values: [
              [meliBalance],
              [updatedAt],
            ],
          },
        ],
      },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

