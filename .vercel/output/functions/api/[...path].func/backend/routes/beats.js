const router = require("express").Router();
const controller = require("../controllers/beats.js");
const multer = require("multer");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024, files: 2 }
});

router.post("/", upload.fields([{ name: "cover", maxCount: 1 }, { name: "preview", maxCount: 1 }]), controller.criar);
router.get("/:nome", controller.beats);

module.exports = router;
