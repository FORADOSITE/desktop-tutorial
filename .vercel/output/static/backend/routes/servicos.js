const router = require("express").Router();
const controller = require("../controllers/servicos.js");

router.get("/", controller.listar);

module.exports = router;