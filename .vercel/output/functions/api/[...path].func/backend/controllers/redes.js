const { collection } = require("../services/db.js");

exports.criar = async (req, res) => {
    const { user_id, tipo, link } = req.body

    if (!user_id || !tipo || !link) {
        return res.status(400).json({ error: "Informe a rede e o link." });
    }

    let tipoDeRede;

    if (["instagram", "youtube", "spotify", "tiktok"].includes(tipo.toLowerCase())) {
        tipoDeRede = tipo.toLowerCase();
    } else {
        return res.status(400).json({ error: "Tipo de rede social inválido" });
    }

    try {
        const url = new URL(link);
        const dominios = {
            instagram: ["instagram.com", "www.instagram.com"],
            youtube: ["youtube.com", "www.youtube.com", "youtu.be"],
            spotify: ["open.spotify.com"],
            tiktok: ["tiktok.com", "www.tiktok.com"],
        };
        if (url.protocol !== "https:" || !dominios[tipoDeRede].includes(url.hostname.toLowerCase())) {
            return res.status(400).json({ error: "Use um link HTTPS válido da rede escolhida." });
        }
    } catch {
        return res.status(400).json({ error: "Informe um link válido." });
    }

    const redes = await collection("redes_sociais");
    await redes.updateOne(
        { user_id },
        { $set: { [tipoDeRede]: link }, $setOnInsert: { user_id } },
        { upsert: true }
    );
    return res.json({ success: true });
}

exports.redes = async (req, res) => {
    const { nome } = req.params

    const usuarios = await collection("usuarios");
    const usuario = await usuarios.findOne({ nome }, { projection: { user_id: 1 } });

    if (!usuario) {
        return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const redes = await collection("redes_sociais");
    const redes_sociais = await redes.find({ user_id: usuario.user_id }).toArray();
    return res.json(redes_sociais);
}
