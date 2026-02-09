const { getBlacklist, addToBlacklist, removeFromBlacklist } = require('../helpers/blacklistManager');

const getBlacklistHandler = (req, res) => {
    try {
        const list = getBlacklist();
        res.json(list);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener blacklist" });
    }
};

const addBlacklistHandler = (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ msg: "Mensaje requerido" });

        const list = addToBlacklist(message);
        res.json({ msg: "Agregado a la blacklist", list });
    } catch (error) {
        res.status(500).json({ msg: "Error al agregar a blacklist" });
    }
};

const removeBlacklistHandler = (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ msg: "Mensaje requerido" });

        const list = removeFromBlacklist(message);
        res.json({ msg: "Removido de la blacklist", list });
    } catch (error) {
        res.status(500).json({ msg: "Error al remover de blacklist" });
    }
};

module.exports = {
    getBlacklistHandler,
    addBlacklistHandler,
    removeBlacklistHandler
};
