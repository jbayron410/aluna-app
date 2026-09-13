const { getSheetsClient, readRaw } = require('./_lib/sheets');

const BTC_SPREADSHEET_ID = '1WH_pkZJhdpnfViXViDkBNMYe44gIy6-R0lEMOCT2v-E';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const sheets = await getSheetsClient('spreadsheets.readonly');
    const rows = await readRaw(sheets, BTC_SPREADSHEET_ID, 'Nuevo Proyecto', 'A1:Z50');
    res.status(200).json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
