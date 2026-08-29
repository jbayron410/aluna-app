const { getSheetsClient, readTab, parseMoney } = require('./_lib/sheets');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const sheets = await getSheetsClient('spreadsheets.readonly');

    const [compras, ventas, inventario, resumen] = await Promise.all([
      readTab(sheets, 'Compras Proyecto'),
      readTab(sheets, 'Ventas Proyectos'),
      readTab(sheets, 'Inventario'),
      readTab(sheets, 'Resumen'),
    ]);

    const totalCompras = compras.reduce((s, r) => s + parseMoney(r['Total']), 0);
    const totalVentas = ventas.reduce((s, r) => s + parseMoney(r['Total']), 0);
    const totalGanancia = ventas.reduce((s, r) => s + parseMoney(r['Ganancia']), 0);
    const ventasMeli = ventas.filter(r => (r['FUENTE'] || '').toUpperCase() === 'MELI');
    const ventasFisico = ventas.filter(r => (r['FUENTE'] || '').toUpperCase() === 'FISICO');
    const totalMeli = ventasMeli.reduce((s, r) => s + parseMoney(r['Total']), 0);
    const totalFisico = ventasFisico.reduce((s, r) => s + parseMoney(r['Total']), 0);
    const inventarioActivo = inventario.filter(r => (r['Activo'] || '').replace(/[^0-9]/g, '') !== '0' && r['Activo'] !== '');
    const valorInventario = inventarioActivo.reduce((s, r) => s + parseMoney(r['Activo']), 0);

    const ventasPorMes = {};
    ventas.forEach(r => {
      const fecha = r['Fecha'];
      if (!fecha) return;
      const parts = fecha.split('/');
      if (parts.length < 3) return;
      const key = `${parts[2]}-${parts[1].padStart(2, '0')}`;
      ventasPorMes[key] = (ventasPorMes[key] || 0) + parseMoney(r['Total']);
    });

    const comprasPorMes = {};
    compras.forEach(r => {
      const fecha = r['Fecha'];
      if (!fecha) return;
      const parts = fecha.split('/');
      if (parts.length < 3) return;
      const key = `${parts[2]}-${parts[1].padStart(2, '0')}`;
      comprasPorMes[key] = (comprasPorMes[key] || 0) + parseMoney(r['Total']);
    });

    const prodGanancia = {};
    ventas.forEach(r => {
      const desc = r['Descripcion'] || 'Sin nombre';
      prodGanancia[desc] = (prodGanancia[desc] || 0) + parseMoney(r['Ganancia']);
    });
    const topProductos = Object.entries(prodGanancia).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const ganVendedor = {};
    ventas.forEach(r => {
      const quien = r['Quien Recibe'] || 'N/A';
      ganVendedor[quien] = (ganVendedor[quien] || 0) + parseMoney(r['Ganancia']);
    });

    const fuentePorMes = {};
    ventas.forEach(r => {
      const fecha = r['Fecha'];
      if (!fecha) return;
      const parts = fecha.split('/');
      if (parts.length < 3) return;
      const key = `${parts[2]}-${parts[1].padStart(2, '0')}`;
      const fuente = (r['FUENTE'] || 'OTRO').toUpperCase();
      if (!fuentePorMes[key]) fuentePorMes[key] = { MELI: 0, FISICO: 0 };
      fuentePorMes[key][fuente] = (fuentePorMes[key][fuente] || 0) + parseMoney(r['Total']);
    });

    const comprasPendientes = compras.filter(r => {
      const estado = (r['Estado'] || '').toLowerCase();
      return estado !== 'ok' && estado !== '';
    });

    res.status(200).json({
      kpis: {
        totalCompras,
        totalVentas,
        totalGanancia,
        margenGeneral: totalVentas > 0 ? ((totalGanancia / totalVentas) * 100).toFixed(1) : 0,
        totalMeli,
        totalFisico,
        valorInventario,
        numVentas: ventas.length,
        numCompras: compras.length,
        numProductos: inventarioActivo.length,
      },
      resumen,
      ventasPorMes: Object.entries(ventasPorMes).sort((a, b) => a[0].localeCompare(b[0])),
      comprasPorMes: Object.entries(comprasPorMes).sort((a, b) => a[0].localeCompare(b[0])),
      topProductos,
      ganVendedor: Object.entries(ganVendedor),
      fuentePorMes: Object.entries(fuentePorMes).sort((a, b) => a[0].localeCompare(b[0])),
      comprasPendientes,
      inventario: inventarioActivo,
      ventasRecientes: ventas.slice(-20).reverse(),
      comprasRecientes: compras.slice(-20).reverse(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
