const { streamFile } = require("../services/storage.js");

exports.obter = async (req, res) => {
    try {
        if (!(await streamFile(req.params.id, res))) {
            return res.status(404).json({ error: "Arquivo não encontrado" });
        }
    } catch (error) {
        console.error("Erro ao carregar arquivo:", error.message);
        return res.status(500).json({ error: "Não foi possível carregar o arquivo." });
    }
};
