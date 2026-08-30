const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

function getCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT env var not set');
  return JSON.parse(raw);
}

async function getSheetsClient(scope = 'spreadsheets') {
  const creds = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [`https://www.googleapis.com/auth/${scope}`],
  });
  return google.sheets({ version: 'v4', auth: await auth.getClient() });
}

async function readTab(sheets, tabName, range = 'A1:Z2000') {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${tabName}'!${range}`,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return [];
  let headerIdx = rows.findIndex(r => r && r.length > 0 && r.some(c => c && c.trim()));
  if (headerIdx === -1) return [];
  const headers = rows[headerIdx];
  return rows.slice(headerIdx + 1).filter(r => r && r.length > 0).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (r[i] || '').trim(); });
    return obj;
  });
}

function parseMoney(val) {
  if (!val) return 0;
  return Number(String(val).replace(/[^0-9.,\-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

function parsePercent(val) {
  if (!val) return 0;
  return Number(String(val).replace(/[^0-9.,\-]/g, '').replace(',', '.')) || 0;
}

async function appendRow(sheets, tabName, values) {
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${tabName}'!B:B`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
  return res.data;
}

async function getLastRow(sheets, tabName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${tabName}'!B:B`,
  });
  return (res.data.values || []).length;
}

async function setFormulas(sheets, tabName, row, formulas) {
  const data = Object.entries(formulas).map(([col, formula]) => ({
    range: `'${tabName}'!${col}${row}`,
    values: [[formula.replace(/\{row\}/g, row)]],
  }));
  if (data.length === 0) return;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data,
    },
  });
}

module.exports = {
  getSheetsClient,
  readTab,
  parseMoney,
  parsePercent,
  appendRow,
  getLastRow,
  setFormulas,
  SPREADSHEET_ID,
};
