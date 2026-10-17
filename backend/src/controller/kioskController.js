import kioskSessionModel from "../models/kioskSession.js";
import clientModel from "../models/client.js";

// KIOSCO — kioskController.js
// Vincular la compra del kiosco con la cuenta del cliente, escaneando un QR con su propio
// teléfono. Ver el porqué en models/kioskSession.js.
const kioskController = {};

const MINUTOS_DE_VIDA = 10;

// Alfabeto sin caracteres que se confunden al leerlos en voz alta o al teclearlos: nada de O
// contra 0, ni I contra 1 contra L. Si la cámara del teléfono no agarra el QR, alguien va a tener
// que dictar este código.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const generarCodigo = () => {
    let codigo = "";
    for (let i = 0; i < 6; i++) {
        codigo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
    }
    return codigo;
};

// INSERT — el kiosco abre una sesión y muestra su QR.
kioskController.crearSesion = async (req, res) => {
    try {
        const expiraEn = new Date(Date.now() + MINUTOS_DE_VIDA * 60 * 1000);

        // Reintenta si el código ya existía. Con 31^6 combinaciones el choque es rarísimo, pero "rarísimo"
        // no es "imposible" y un choque le daría la compra de alguien a otra persona.
        for (let intento = 0; intento < 5; intento++) {
            const codigo = generarCodigo();
            const yaExiste = await kioskSessionModel.findOne({ codigo });
            if (yaExiste) continue;

            await kioskSessionModel.create({ codigo, expiraEn });
            return res.status(200).json({ codigo, expiraEn, minutos: MINUTOS_DE_VIDA });
        }

        return res.status(500).json({ message: "No se pudo generar un código libre" });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// SELECT — el kiosco pregunta si ya alguien escaneó.
// Se consulta cada pocos segundos, así que devuelve lo mínimo: si ya la reclamaron y de quién es.
kioskController.estadoSesion = async (req, res) => {
    try {
        const sesion = await kioskSessionModel
            .findOne({ codigo: (req.params.codigo || "").toUpperCase() })
            .populate("clientId", "fullName loyaltyPoints");

        if (!sesion) {
            // Ya expiró o nunca existió: para el kiosco es lo mismo.
            return res.status(404).json({ message: "Ese código ya no sirve" });
        }

        // Una sesión ya cobrada no dice de quién era. Si siguiera devolviendo el cliente, el mismo código
        // serviría para que la siguiente persona que se para en el kiosco le siga cargando compras —y
        // puntos— a la cuenta de quien ya se fue.
        if (sesion.estado === "usada") {
            return res.status(200).json({ estado: "usada", cliente: null, expiraEn: sesion.expiraEn });
        }

        return res.status(200).json({
            estado: sesion.estado,
            cliente: sesion.clientId
                ? {
                    id: String(sesion.clientId._id),
                    nombre: sesion.clientId.fullName,
                    puntos: sesion.clientId.loyaltyPoints || 0,
                }
                : null,
            expiraEn: sesion.expiraEn,
        });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// UPDATE — el teléfono del cliente reclama la sesión.
// Lo llama el teléfono, que es donde la persona YA inició sesión. Por eso el kiosco nunca ve una
// contraseña: la identidad la pone el teléfono, el kiosco solo recibe el resultado.
kioskController.vincularSesion = async (req, res) => {
    try {
        // Quién se vincula lo dice la SESIÓN, no el cuerpo de la petición. Ahora sale de la cookie de
        // quien está escaneando, que es justamente la persona parada frente al kiosco con su teléfono.
        const clientId = req.usuario.id;
        const codigo = (req.params.codigo || "").toUpperCase();

        if (!clientId) {
            return res.status(400).json({ message: "Falta la cuenta del cliente" });
        }

        const cliente = await clientModel.findById(clientId).select("fullName");
        if (!cliente) {
            return res.status(404).json({ message: "Cliente no encontrado" });
        }

        const sesion = await kioskSessionModel.findOne({ codigo });
        if (!sesion) {
            return res.status(404).json({ message: "Ese código venció. Pide uno nuevo en el kiosco." });
        }
        // Una sesión ya cobrada no se reabre: si no, el mismo QR serviría para
        // colgarle otra compra a la misma persona.
        if (sesion.estado === "usada") {
            return res.status(400).json({ message: "Esa compra ya se cobró" });
        }

        sesion.clientId = clientId;
        sesion.estado = "vinculada";
        await sesion.save();

        return res.status(200).json({
            message: "Cuenta vinculada",
            cliente: { id: String(cliente._id), nombre: cliente.fullName },
        });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// UPDATE — se cobró la compra: la sesión se cierra para que no se reutilice.
kioskController.cerrarSesion = async (req, res) => {
    try {
        const codigo = (req.params.codigo || "").toUpperCase();
        await kioskSessionModel.findOneAndUpdate({ codigo }, { estado: "usada" });
        return res.status(200).json({ message: "Sesión cerrada" });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

export default kioskController;
