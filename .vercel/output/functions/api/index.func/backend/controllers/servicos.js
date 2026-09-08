const { collection } = require("../services/db.js");

exports.listar = async (_req, res) => {
    const servicos = await collection("todos");
    return res.json(await servicos.find({}).toArray());
};