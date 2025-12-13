const Admin = require("../models/Admin");

/* -------------------- GET ALL ADMINS -------------------- */
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    console.error("❌ Error fetching admins:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------- GET ADMIN BY ID -------------------- */
const getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.status(200).json({ success: true, admin });
  } catch (error) {
    console.error("❌ Error fetching admin:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------- CREATE ADMIN -------------------- */
const createAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: "Admin already exists" });
    }

    const admin = await Admin.create({ email, password });

    res.status(201).json({
      success: true,
      message: "Admin created",
      admin,
    });
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------- UPDATE ADMIN -------------------- */
const updateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.status(200).json({
      success: true,
      message: "Admin updated",
      admin,
    });
  } catch (error) {
    console.error("❌ Error updating admin:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------- DELETE ADMIN -------------------- */
const deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByIdAndDelete(req.params.id);

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.status(200).json({ success: true, message: "Admin deleted" });
  } catch (error) {
    console.error("❌ Error deleting admin:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------- LOGIN ADMIN -------------------- */
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).json({ success: false, message: "Admin not found" });
    }

    if (admin.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    req.session.admin = {
      id: admin._id,
      email: admin.email,
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    console.error("❌ Login error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------- LOGOUT ADMIN -------------------- */
const logoutAdmin = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};

module.exports = {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
  logoutAdmin,
};
