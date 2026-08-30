const { getSheetsClient, readTab } = require('./_lib/sheets');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const sheets = await getSheetsClient('spreadsheets.readonly');
    const rows = await readTab(sheets, 'Inventario');
    const items = rows
      .filter(r => r['Codigo'])
      .map(r => ({
        codigo: r['Codigo'] || '',
        descripcion: r['Descripción'] || r['Descripcion'] || '',
        stock: r['Inventario'] || '0',
        costo: r['Costo promedio'] || '',
      }));
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
