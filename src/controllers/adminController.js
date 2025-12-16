const Admin = require("../models/Admin");
const Hive = require("../models/Hive");
const User = require("../models/User");



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



/* -------------------- hive manage -------------------- */

const getAllHives = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

   
    const query = search
      ? {
          hiveName: { $regex: search, $options: "i" },
        }
      : {};

    const totalHives = await Hive.countDocuments(query);

    const hives = await Hive.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalHives / limit);

    res.render("admin/hive", {
      title: "Manage Hives",
      hives,
      currentPage: page,
      totalPages,
      search,
    });
  } catch (error) {
    console.error("Get Hives Error:", error);
    res.status(500).send("Failed to load hives");
  }
};


const forceExpireHive = async (req, res) => {
  try {
    const hiveId = req.params.id;

    await Hive.findByIdAndUpdate(hiveId, {
      isExpired: true,
      expiryDate: new Date(),
    });

    res.redirect("/hive");
  } catch (error) {
    console.error("Expire Hive Error:", error);
    res.status(500).send("Failed to expire hive");
  }
};

const deleteHives = async (req, res) => {
  try {
    const { id } = req.params;
    const { ids } = req.body;

    // 🔥 Multiple delete
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const result = await Hive.deleteMany({
        _id: { $in: ids },
      });

      return res.json({
        success: true,
        message: `${result.deletedCount} hives deleted successfully`,
      });
    }

    // 🔥 Single delete
    if (id) {
      const hive = await Hive.findByIdAndDelete(id);

      if (!hive) {
        return res.status(404).json({
          success: false,
          message: "Hive not found",
        });
      }

      return res.json({
        success: true,
        message: "Hive deleted successfully",
      });
    }

    return res.status(400).json({
      success: false,
      message: "No hive ID provided",
    });
  } catch (error) {
    console.error("Delete Hive Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete hive",
    });
  }
};


/* -------------------- user manage -------------------- */
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    // 🔍 Search by name OR email
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const totalUsers = await User.countDocuments(query);

    const users = await User.find(query)
      .select("-password -otp -otpExpires")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalUsers / limit);

    res.render("admin/users", {
      title: "Manage Users",
      users,
      currentPage: page,
      totalPages,
      search,
    });
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).send("Failed to load users");
  }
};

module.exports = {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
  logoutAdmin,
  getAllHives,
  forceExpireHive,
  getAllUsers,
  deleteHives
};
