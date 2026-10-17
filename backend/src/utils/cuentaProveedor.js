// ESTADO DE CUENTA DE UN PROVEEDOR — cuentaProveedor.js
// Convierte una lista de movimientos (compras y pagos) en el estado real de la cuenta: cuánto se
// debe, qué facturas siguen abiertas y cuáles ya vencieron.

const CENTAVO = 0.005; // tolerancia para no arrastrar errores de decimales

const aNumero = (v) => Number(v) || 0;

export const estadoCuenta = (movimientos = [], hoy = new Date()) => {
  const compras = movimientos
    .filter((m) => m.type === "compra")
    .map((m) => ({
      _id: m._id,
      amount: aNumero(m.amount),
      date: m.date ? new Date(m.date) : new Date(0),
      dueDate: m.dueDate ? new Date(m.dueDate) : null,
      reference: m.reference,
      note: m.note,
    }))
    .sort((a, b) => a.date - b.date); // más vieja primero

  const totalComprado = compras.reduce((s, c) => s + c.amount, 0);
  const totalPagado = movimientos
    .filter((m) => m.type === "pago")
    .reduce((s, m) => s + aNumero(m.amount), 0);

  // Repartimos lo pagado entre las compras, de la más vieja a la más nueva. Lo que sobre después de
  // cubrirlas todas es saldo a favor de la tienda (pagó de más o adelantado).
  let bolsa = totalPagado;
  const pendientes = [];

  for (const compra of compras) {
    const aplicado = Math.min(bolsa, compra.amount);
    bolsa -= aplicado;
    const restante = compra.amount - aplicado;

    if (restante > CENTAVO) {
      pendientes.push({
        ...compra,
        pagado: Number(aplicado.toFixed(2)),
        pendiente: Number(restante.toFixed(2)),
        vencida: !!(compra.dueDate && compra.dueDate < hoy),
        // Días que faltan (negativo = ya venció hace tantos días).
        diasParaVencer: compra.dueDate
          ? Math.ceil((compra.dueDate - hoy) / 86400000)
          : null,
      });
    }
  }

  const deuda = Number(pendientes.reduce((s, p) => s + p.pendiente, 0).toFixed(2));
  const vencidas = pendientes.filter((p) => p.vencida);
  const montoVencido = Number(vencidas.reduce((s, p) => s + p.pendiente, 0).toFixed(2));

  // Lo que vence dentro de la próxima semana: lo que hay que ir juntando.
  const porVencer = pendientes.filter(
    (p) => !p.vencida && p.diasParaVencer !== null && p.diasParaVencer <= 7
  );

  return {
    totalComprado: Number(totalComprado.toFixed(2)),
    totalPagado: Number(totalPagado.toFixed(2)),
    deuda,
    saldoAFavor: Number(bolsa.toFixed(2)), // pagó de más
    pendientes,
    vencidas,
    montoVencido,
    porVencer,
    montoPorVencer: Number(porVencer.reduce((s, p) => s + p.pendiente, 0).toFixed(2)),
  };
};

// Cuánto más le pueden fiar. Si no hay límite configurado devuelve null en vez de 0: "no
// configurado" y "sin cupo" son cosas distintas, y mostrar $0.00 cuando en realidad nadie puso el
// límite haría creer que no le fían nada.
export const creditoDisponible = (limite, deuda) => {
  const tope = aNumero(limite);
  if (tope <= 0) return null;
  return Number(Math.max(0, tope - aNumero(deuda)).toFixed(2));
};
