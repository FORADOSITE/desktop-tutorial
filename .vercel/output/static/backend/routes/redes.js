const router = require("express").Router();
const controller = require("../controllers/redes.js");

router.post("/", controller.criar);
router.get("/:nome", controller.redes)

module.exports = router; 