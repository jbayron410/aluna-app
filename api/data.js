const { getSheetsClient, readTab, readRaw, parseMoney, SPREADSHEET_ID } = require('./_lib/sheets');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const sheets = await getSheetsClient('spreadsheets.readonly');

    const [compras, ventas, inventario, resumen, gastos, cuadreRaw, devolucionesRaw] = await Promise.all([
      readTab(sheets, 'Compras Proyecto'),
      readTab(sheets, 'Ventas Proyectos'),
      readTab(sheets, 'Inventario'),
      readTab(sheets, 'Resumen'),
      readTab(sheets, 'Gastos').catch(() => []),
      readRaw(sheets, SPREADSHEET_ID, 'Cuadre Caja', 'A1:C15').catch(() => []),
      readRaw(sheets, SPREADSHEET_ID, 'Devoluciones', 'A1:J1000').catch(() => []),
    ]);

    const returnsList = [];
    for (let i = 1; i < devolucionesRaw.length; i++) {
      const r = devolucionesRaw[i];
      if (!r || (!r[0] && !r[2] && !r[3])) continue;
      const refundAmount = parseMoney(r[5]);
      const shippingCost = parseMoney(r[6]);
      const totalDeduction = parseMoney(r[9]) || (refundAmount + shippingCost);
      returnsList.push({
        rowNumber: i + 1,
        fecha: (r[0] || '').trim(),
        ventaRef: (r[1] || '').trim(),
        codigo: (r[2] || '').trim(),
        descripcion: (r[3] || '').trim(),
        cantidad: Number(String(r[4] || '1').replace(/[^0-9]/g, '')) || 1,
        valorDevuelto: refundAmount,
        costoEnvio: shippingCost,
        estadoProducto: (r[7] || 'Bueno').trim(),
        motivo: (r[8] || '').trim(),
        totalCaja: totalDeduction,
      });
    }

    const salesForReturns = ventas
      .map((r, idx) => ({
        rowNumber: idx + 2,
        fecha: r['Fecha'] || '',
        quienRecibe: r['Quien Recibe'] || '',
        codigo: r['Codigo'] || '',
        descripcion: r['Descripcion'] || '',
        cliente: r['Cliente'] || '',
        documento: r['Documento'] || '',
        cantidad: Number(String(r['Cantidad'] || '1').replace(/[^0-9]/g, '')) || 1,
        precioVenta: parseMoney(r['Precio Venta']),
        total: parseMoney(r['Total']),
        fuente: r['FUENTE'] || 'MELI',
      }))
      .reverse();

    const denominations = {};
    let countedCash = 0;
    for (let i = 1; i <= 11; i++) {
      const row = cuadreRaw[i] || [];
      const denom = parseMoney(row[0]);
      const qty = Number(String(row[1] || '0').replace(/[^0-9]/g, '')) || 0;
      if (denom > 0) {
        denominations[String(denom)] = qty;
        countedCash += denom * qty;
      }
    }
    const countedMeli = parseMoney((cuadreRaw[13] || [])[2]);
    const lastReconciledAt = ((cuadreRaw[14] || [])[2] || '').trim();

    const totalCompras = compras.reduce((s, r) => s + parseMoney(r['Total']), 0);
    const totalVentas = ventas.reduce((s, r) => s + parseMoney(r['Total']), 0);
    const totalExpenses = gastos.reduce((s, r) => s + parseMoney(r['Total']), 0);
    const totalReturns = returnsList.reduce((s, r) => s + r.totalCaja, 0);
    const cashPurchases = compras
      .filter(r => (r['Quien Entrega'] || '').trim().toLowerCase() === 'caja')
      .reduce((s, r) => s + parseMoney(r['Total']), 0);
    const cashExpenses = gastos
      .filter(r => (r['Quien Paga'] || '').trim().toLowerCase() === 'caja')
      .reduce((s, r) => s + parseMoney(r['Total']), 0);
    const availableCash = totalVentas - cashPurchases - cashExpenses - totalReturns;
    const totalGanancia = ventas.reduce((s, r) => s + parseMoney(r['Ganancia']), 0);
    const ventasMeli = ventas.filter(r => (r['FUENTE'] || '').toUpperCase() === 'MELI');
    const ventasFisico = ventas.filter(r => (r['FUENTE'] || '').toUpperCase() === 'FISICO');
    const totalMeli = ventasMeli.reduce((s, r) => s + parseMoney(r['Total']), 0);
    const totalFisico = ventasFisico.reduce((s, r) => s + parseMoney(r['Total']), 0);
    const inventarioActivo = inventario.filter(r => (r['Activo'] || '').replace(/[^0-9]/g, '') !== '0' && r['Activo'] !== '');
    const outOfStockInventory = inventario.filter(r => {
      if (!r['Codigo']) return false;
      const isActive = (r['Activo'] || '').replace(/[^0-9]/g, '') !== '0' && r['Activo'] !== '';
      return !isActive;
    });
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
        totalExpenses,
        totalReturns,
        cashPurchases,
        cashExpenses,
        availableCash,
        totalGanancia,
        margenGeneral: totalVentas > 0 ? ((totalGanancia / totalVentas) * 100).toFixed(1) : 0,
        totalMeli,
        totalFisico,
        valorInventario,
        numVentas: ventas.length,
        numCompras: compras.length,
        numExpenses: gastos.length,
        numReturns: returnsList.length,
        numProductos: inventarioActivo.length,
      },
      resumen,
      cashReconciliation: {
        denominations,
        countedCash,
        countedMeli,
        countedTotal: countedCash + countedMeli,
        expectedCash: availableCash,
        difference: (countedCash + countedMeli) - availableCash,
        lastReconciledAt,
      },
      ventasPorMes: Object.entries(ventasPorMes).sort((a, b) => a[0].localeCompare(b[0])),
      comprasPorMes: Object.entries(comprasPorMes).sort((a, b) => a[0].localeCompare(b[0])),
      topProductos,
      ganVendedor: Object.entries(ganVendedor),
      fuentePorMes: Object.entries(fuentePorMes).sort((a, b) => a[0].localeCompare(b[0])),
      comprasPendientes,
      inventario: inventarioActivo,
      outOfStockInventory,
      ventasRecientes: ventas.slice(-20).reverse(),
      comprasRecientes: compras.slice(-20).reverse(),
      recentExpenses: gastos.slice(-20).reverse(),
      returnsList: returnsList.slice().reverse(),
      salesForReturns,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
