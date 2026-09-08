const router = require("express").Router();

router.use("/usuario", require("./usuarios"));
router.use("/redes", require("./redes.js"));
router.use("/bio", require("./biografia.js"));
router.use("/beats", require("./beats.js"));
router.use("/servicos", require("./servicos.js"));
router.use("/arquivos", require("./arquivos.js"));

module.exports = router;