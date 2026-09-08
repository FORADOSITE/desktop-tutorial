const router = require("express").Router();
const controller = require("../controllers/arquivos");

router.get("/:id", controller.obter);

module.exports = router;
