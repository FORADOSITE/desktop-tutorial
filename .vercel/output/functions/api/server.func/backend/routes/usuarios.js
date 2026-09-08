const router = require("express").Router();
const controller = require("../controllers/usuario");
const multer = require("multer");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 2 },
    fileFilter: (_req, file, callback) => {
        const tiposAceitos = ["image/jpeg", "image/png", "image/webp"];
        callback(null, tiposAceitos.includes(file.mimetype));
    }
});

function receberDocumentos(req, res, next) {
    upload.fields([
        { name: "documento_frente", maxCount: 1 },
        { name: "documento_verso", maxCount: 1 },
    ])(req, res, (error) => {
        if (!error) return next();

        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ success: false, code: "DOCUMENTO_MUITO_GRANDE", error: "A foto do documento deve ter no máximo 5 MB." });
        }

        return res.status(400).json({ success: false, code: "DOCUMENTO_INVALIDO", error: "Envie fotos JPEG, PNG ou WEBP da frente e do verso do documento." });
    });
}

router.post("/", receberDocumentos, controller.criar);
router.get("/status", controller.status);
router.post("/conecta", controller.conectar);
router.post("/reenviar-confirmacao", controller.reenviarConfirmacao);
router.post("/garantir-perfil", controller.garantirPerfil);
router.post("/upload-avatar", upload.single("avatar"), controller.uploadAvatar);
router.get("/destaques", controller.getDestaque);
router.get("/:nome", controller.buscarPorNome);
router.get("/id/:id", controller.getName);
module.exports = router;
