const router = require("express").Router();
const controller = require("../controllers/biografia.js");

router.get("/:nome", controller.obter)
router.post("/", controller.editar)

module.exports = router;