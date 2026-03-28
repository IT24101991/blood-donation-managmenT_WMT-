const express = require("express");

const { getCamps, createCamp, updateCamp, deleteCamp, markInterest } = require("../controllers/campController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getCamps);
router.post("/create", protect, authorize("ADMIN"), createCamp);
router.put("/:id", protect, authorize("ADMIN"), updateCamp);
router.delete("/:id", protect, authorize("ADMIN"), deleteCamp);
router.post("/:id/interest", protect, markInterest);

module.exports = router;
