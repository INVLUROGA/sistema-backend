const fs = require('fs');
const path = require('path');

const BLACKLIST_PATH = path.join(__dirname, '../config/alertBlacklist.json');

const getBlacklist = () => {
    try {
        if (!fs.existsSync(BLACKLIST_PATH)) {
            // Si no existe, lo crea vacío
            fs.writeFileSync(BLACKLIST_PATH, JSON.stringify([]));
            return [];
        }
        const data = fs.readFileSync(BLACKLIST_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error leyendo blacklist:", error);
        return [];
    }
};

const addToBlacklist = (message) => {
    try {
        const list = getBlacklist();
        if (!list.includes(message)) {
            list.push(message);
            fs.writeFileSync(BLACKLIST_PATH, JSON.stringify(list, null, 2));
        }
        return list;
    } catch (error) {
        console.error("Error escribiendo blacklist:", error);
        throw error;
    }
};

const removeFromBlacklist = (message) => {
    try {
        let list = getBlacklist();
        list = list.filter(m => m !== message);
        fs.writeFileSync(BLACKLIST_PATH, JSON.stringify(list, null, 2));
        return list;
    } catch (error) {
        console.error("Error removiendo de blacklist:", error);
        throw error;
    }
};

module.exports = {
    getBlacklist,
    addToBlacklist,
    removeFromBlacklist
};
