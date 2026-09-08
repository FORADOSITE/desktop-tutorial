const { collection } = require("../services/db");

exports.editar = async (req, res) => {
    const { user_id, bio, titulo } = req.body

    const usuarios = await collection("usuarios");
    await usuarios.updateOne({ user_id }, { $set: { bio, titulo } });
    return res.json({ success: true });
}

exports.obter = async (req, res) => {
    const nome = req.params.nome

    const usuarios = await collection("usuarios");
    const usuario = await usuarios.findOne({ nome });

    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });
    return res.json(usuario);
}
