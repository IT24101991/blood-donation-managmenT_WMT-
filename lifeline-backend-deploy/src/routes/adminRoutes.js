const express = require("express");

const { getUsers, createUser, updateUserRole, getDonors } = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/users", protect, authorize("ADMIN"), getUsers);
router.get("/donors", protect, authorize("ADMIN"), getDonors);
router.post("/users", protect, authorize("ADMIN"), createUser);
router.put("/users/:userId/role", protect, authorize("ADMIN"), updateUserRole);

module.exports = router;
