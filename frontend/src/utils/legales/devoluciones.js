// CAMBIOS Y DEVOLUCIONES — legales/devoluciones.js
// La decisión de la tienda: NO hay devoluciones por cambio de opinión de lo que ya se abrió, se
// usó o se consumió.

export const DEVOLUCIONES = {
  clave: 'devoluciones',
  ruta: '/devoluciones',
  titulo: 'Cambios y devoluciones',
  secciones: [
    {
      id: 'resumen',
      titulo: 'En corto',
      bloques: [
        {
          tipo: 'destacado',
          texto:
            'No hacemos devoluciones por cambio de opinión de productos abiertos, usados o consumidos. Si el error es nuestro —llegó dañado, vencido, equivocado o incompleto— se lo reponemos, y si no lo tenemos, le devolvemos lo que pagó por eso.',
        },
        {
          tipo: 'parrafo',
          texto:
            'Vendemos productos de consumo diario de marcas que ya controlan su calidad, y no vendemos electrónicos. Por eso lo más importante es revisar su pedido al recibirlo.',
        },
      ],
    },
    {
      id: 'revise',
      titulo: 'Revise su pedido al recibirlo',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Antes de despedir a quien le lleva el pedido, revise que esté todo, que nada venga golpeado y la fecha de vencimiento de lo que la tenga.',
            'Si algo está mal, dígaselo en ese momento; si lo nota después, escríbanos ese mismo día con una foto.',
            'Si pasó a traer su pedido a la tienda, revíselo en el mostrador y lo resolvemos ahí mismo.',
          ],
        },
      ],
    },
    {
      id: 'error',
      titulo: 'Cuando el error es nuestro',
      bloques: [
        {
          tipo: 'parrafo',
          texto: 'En cualquiera de estos casos lo arreglamos, compre en línea o en el mostrador:',
        },
        {
          tipo: 'lista',
          puntos: [
            'El producto llegó dañado o en mal estado.',
            'Está vencido.',
            'No es el que pidió.',
            'Faltó algo de su pedido.',
            'Le cobramos de más.',
          ],
        },
        {
          tipo: 'parrafo',
          texto:
            'Primero se lo reponemos por el mismo producto. Si ya no lo tenemos, o si usted lo prefiere, le devolvemos lo que pagó por ese producto en un máximo de 15 días, como pide el artículo 13-D de la Ley de Protección al Consumidor.',
        },
      ],
    },
    {
      id: 'retracto',
      titulo: 'Si se arrepiente de una compra en línea',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'La ley le da 8 días, desde que recibió el pedido, para echarse atrás de una compra hecha por la tienda en línea o la aplicación (artículo 13-A de la Ley de Protección al Consumidor). Solo aplica si el producto:',
        },
        {
          tipo: 'lista',
          puntos: [
            'No se ha abierto, usado ni consumido.',
            'Está completo, con su empaque, sus sellos y sus etiquetas originales.',
          ],
        },
        {
          tipo: 'parrafo',
          texto:
            'Tráigalo a la tienda o avísenos para coordinar. Si pide que lo pasemos recogiendo, ese viaje corre por su cuenta, y mientras el producto está en su poder el riesgo de que se dañe también. Le devolvemos lo pagado en un máximo de 15 días.',
        },
      ],
    },
    {
      id: 'no-aplica',
      titulo: 'Cuándo no hay devolución',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Cuando cambió de opinión y el producto ya se abrió, se usó o se consumió.',
            'Alimentos que necesitan frío (lácteos, carnes, embutidos) y alimentos frescos (frutas, verduras, pan) una vez entregados en buen estado: no podemos saber cómo se conservaron después, y venderlos de nuevo sería un riesgo para otra persona.',
            'Productos de higiene personal que se abrieron.',
            'Impresiones ya hechas según su archivo, salvo que el error de impresión sea nuestro.',
            'Compras hechas en persona en el mostrador, cuando no hay ningún error nuestro: ahí no aplica el plazo de 8 días.',
            'Tarjetas de regalo, saldo y puntos: no se cambian por efectivo.',
          ],
        },
      ],
    },
    {
      id: 'como',
      titulo: 'Cómo pedirlo',
      bloques: [
        {
          tipo: 'parrafo',
          texto: 'Escríbanos o pásese por la tienda con esto a mano:',
        },
        {
          tipo: 'lista',
          puntos: [
            'El número de pedido (está en "Mi Cuenta › Pedidos" y en su recibo).',
            'Qué pasó y, si se puede, una foto.',
          ],
        },
        { tipo: 'negocio' },
      ],
    },
    {
      id: 'dinero',
      titulo: 'Cómo se le devuelve el dinero',
      bloques: [
        {
          tipo: 'lista',
          puntos: [
            'Si pagó en efectivo, se le devuelve en efectivo en la tienda.',
            'Si pagó con tarjeta, se revierte a esa misma tarjeta. Según su banco, puede tardar unos días más en verse en su estado de cuenta.',
            'Si pagó con saldo o puntos, se le devuelven a su cuenta.',
          ],
        },
      ],
    },
    {
      id: 'derechos',
      titulo: 'Sus derechos',
      bloques: [
        {
          tipo: 'parrafo',
          texto:
            'Nada de esta política le quita los derechos que le da la Ley de Protección al Consumidor. Si no queda conforme con cómo lo resolvimos, puede acudir a la Defensoría del Consumidor.',
        },
      ],
    },
  ],
};
