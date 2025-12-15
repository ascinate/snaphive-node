const express = require("express");
const {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
  logoutAdmin,
} = require("../controllers/adminController");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.post("/login", loginAdmin);
router.get("/logout", logoutAdmin);

router.get("/", getAllAdmins);
router.get("/:id", getAdminById);
router.post("/add", createAdmin);
router.put("/update/:id", updateAdmin);
router.delete("/delete/:id", deleteAdmin);

module.exports = router;
