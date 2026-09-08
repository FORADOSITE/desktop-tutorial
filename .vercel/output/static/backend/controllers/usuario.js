const { collection } = require("../services/db.js");
const { getAuthenticatedUserId } = require("../services/auth.js");
const { uploadBuffer } = require("../services/storage.js");

const assinaturasImagem = {
    "image/jpeg": (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    "image/png": (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/webp": (buffer) => buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP",
};

function documentoValido(arquivo) {
    return Boolean(arquivo && assinaturasImagem[arquivo.mimetype]?.(arquivo.buffer));
}

function maiorDeIdade(dataNascimento) {
    const nascimento = new Date(`${dataNascimento}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento) || Number.isNaN(nascimento.getTime())) return false;

    const hoje = new Date();
    let idade = hoje.getUTCFullYear() - nascimento.getUTCFullYear();
    const aniversarioAindaNaoChegou = hoje.getUTCMonth() < nascimento.getUTCMonth()
        || (hoje.getUTCMonth() === nascimento.getUTCMonth() && hoje.getUTCDate() < nascimento.getUTCDate());
    if (aniversarioAindaNaoChegou) idade -= 1;
    return idade >= 18;
}

function erroNaoAutenticado(res) {
    return res.status(401).json({ success: false, error: "Faça login para continuar." });
}

function comUrlDeImagem(usuario, req) {
    if (usuario?.image_perfil) {
        usuario.image_perfil = `${req.protocol}://${req.get("host")}/api/arquivos/${usuario.image_perfil}`;
    }
    return usuario;
}

exports.criar = async (req, res) => {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return erroNaoAutenticado(res);

    const nome = req.body.nome?.trim();
    const dataNascimento = req.body.data_nascimento?.trim();
    const aceitouDocumentos = req.body.aceite_documentos === "on";
    const frente = req.files?.documento_frente?.[0];
    const verso = req.files?.documento_verso?.[0];
    if (!nome) return res.status(400).json({ success: false, error: "Informe seu nome." });
    if (!aceitouDocumentos) {
        return res.status(400).json({ success: false, error: "Autorize o uso dos documentos para concluir a verificação." });
    }
    if (!maiorDeIdade(dataNascimento)) {
        return res.status(403).json({ success: false, code: "IDADE_MINIMA", error: "É necessário ter 18 anos ou mais para criar um perfil." });
    }
    if (!documentoValido(frente) || !documentoValido(verso)) {
        return res.status(400).json({ success: false, error: "Envie fotos JPEG, PNG ou WEBP válidas da frente e do verso do documento." });
    }

    const usuarios = await collection("usuarios");
    if (await usuarios.findOne({ nome })) {
        return res.status(409).json({ success: false, code: "NOME_JA_USADO", error: "Este nome de usuário já está em uso." });
    }

    const [documentoFrenteId, documentoVersoId] = await Promise.all([
        uploadBuffer(frente.buffer, `${userId}-documento-frente`, frente.mimetype),
        uploadBuffer(verso.buffer, `${userId}-documento-verso`, verso.mimetype),
    ]);
    await usuarios.updateOne(
        { user_id: userId },
        {
            $set: {
                user_id: userId,
                nome,
                titulo: "",
                bio: "",
                data_nascimento: dataNascimento,
                documento_identidade_frente_id: documentoFrenteId,
                documento_identidade_verso_id: documentoVersoId,
                idade_verificada_em: new Date(),
            },
        },
        { upsert: true }
    );
    await (await collection("redes_sociais")).updateOne({ user_id: userId }, { $setOnInsert: { user_id: userId } }, { upsert: true });
    await (await collection("beats")).updateOne({ user_id: userId }, { $setOnInsert: { user_id: userId, beats: {} } }, { upsert: true });
    return res.status(201).json({ success: true, user_id: userId });
};

exports.status = async (req, res) => {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return erroNaoAutenticado(res);

    const usuario = await (await collection("usuarios")).findOne(
        { user_id: userId },
        { projection: { documento_identidade_frente_id: 1, documento_identidade_verso_id: 1, idade_verificada_em: 1 } }
    );
    const verificado = Boolean(
        usuario?.documento_identidade_frente_id
        && usuario?.documento_identidade_verso_id
        && usuario?.idade_verificada_em
    );
    return res.json({ verificado });
};

exports.reenviarConfirmacao = async (_req, res) => res.status(410).json({ error: "A confirmação de e-mail é gerenciada pelo Clerk." });

exports.garantirPerfil = async (req, res) => {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return erroNaoAutenticado(res);

    const nome = req.body.nome?.trim() || `artista-${userId.slice(-8)}`;
    await (await collection("usuarios")).updateOne(
        { user_id: userId },
        { $setOnInsert: { user_id: userId, nome, titulo: "", bio: "" } },
        { upsert: true }
    );
    await (await collection("redes_sociais")).updateOne({ user_id: userId }, { $setOnInsert: { user_id: userId } }, { upsert: true });
    await (await collection("beats")).updateOne({ user_id: userId }, { $setOnInsert: { user_id: userId, beats: {} } }, { upsert: true });
    return res.json({ success: true, user_id: userId });
};

exports.conectar = async (_req, res) => res.status(410).json({ error: "O login é gerenciado pelo Clerk. Use o botão de login da aplicação." });

exports.buscarPorNome = async (req, res) => {
    const usuario = await (await collection("usuarios")).findOne(
        { nome: req.params.nome },
        { projection: { documento_identidade_frente_id: 0, documento_identidade_verso_id: 0, data_nascimento: 0 } }
    );
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });
    return res.json([comUrlDeImagem(usuario, req)]);
};

exports.getName = async (req, res) => {
    const usuario = await (await collection("usuarios")).findOne(
        { user_id: req.params.id },
        { projection: { documento_identidade_frente_id: 0, documento_identidade_verso_id: 0, data_nascimento: 0 } }
    );
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });
    return res.json([comUrlDeImagem(usuario, req)]);
};

exports.getDestaque = async (_req, res) => {
    const usuarios = await collection("usuarios");
    const lista = await usuarios.find({}, { projection: { user_id: 1, nome: 1, titulo: 1, bio: 1, image_perfil: 1 } }).sort({ nome: 1 }).toArray();
    return res.json(lista.map((usuario) => comUrlDeImagem(usuario, _req)));
};

exports.uploadAvatar = async (req, res) => {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return erroNaoAutenticado(res);
    if (!documentoValido(req.file)) return res.status(400).json({ error: "Envie uma imagem JPEG, PNG ou WEBP válida." });

    const imageId = await uploadBuffer(req.file.buffer, `${userId}-avatar`, req.file.mimetype);
    await (await collection("usuarios")).updateOne({ user_id: userId }, { $set: { image_perfil: imageId } });
    return res.json({ success: true, image_perfil: imageId });
};
