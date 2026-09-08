const { collection } = require("../services/db.js");
const { uploadBuffer } = require("../services/storage.js");

exports.criar = async (req, res) => {
    const { user_id, audio, type, name, year, duration } = req.body;
    const cover = req.files?.cover?.[0];
    const preview = req.files?.preview?.[0];
    if (!user_id || !audio || !type || !name || !year || !cover) {
        return res.status(400).json({ error: "Parâmetros insuficientes" });
    }

    const capaId = await uploadBuffer(cover.buffer, `${user_id}-capa`, cover.mimetype);
    const beatsCollection = await collection("beats");
    const atual = await beatsCollection.findOne({ user_id });
    const listaAtual = atual?.beats || {};
    const registroAtual = listaAtual[name];
    let previewId = registroAtual?.[4];
    let duracaoNumerica = Number(registroAtual?.[5]);

    if (preview) {
        const tiposDeAudio = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4", "audio/x-m4a"];
        if (!tiposDeAudio.includes(preview.mimetype)) return res.status(400).json({ error: "A prévia deve ser MP3, WAV, OGG ou M4A." });
        duracaoNumerica = Number(duration);
        if (!Number.isFinite(duracaoNumerica) || duracaoNumerica < 15 || duracaoNumerica > 30) {
            return res.status(400).json({ error: "A prévia precisa ter entre 15 e 30 segundos." });
        }
        previewId = await uploadBuffer(preview.buffer, `${user_id}-${name}`, preview.mimetype);
    }

    if (!previewId) return res.status(400).json({ error: "Envie uma prévia de áudio entre 15 e 30 segundos." });
    listaAtual[name] = [audio, String(year), type, capaId, previewId, String(Math.round(duracaoNumerica || 0))];
    await beatsCollection.updateOne({ user_id }, { $set: { user_id, beats: listaAtual } }, { upsert: true });
    return res.json({ success: true });
};

exports.beats = async (req, res) => {
    const usuario = await (await collection("usuarios")).findOne({ nome: req.params.nome });
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });

    const beat = await (await collection("beats")).findOne({ user_id: usuario.user_id });
    if (!beat) return res.json([]);
    for (const value of Object.values(beat.beats || {})) {
        if (value[3]) value[3] = `${req.protocol}://${req.get("host")}/api/arquivos/${value[3]}`;
        if (value[4]) value[4] = `${req.protocol}://${req.get("host")}/api/arquivos/${value[4]}`;
    }
    return res.json([beat]);
};
