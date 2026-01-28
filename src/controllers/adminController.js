const Admin = require("../models/Admin");
const Hive = require("../models/Hive");
const User = require("../models/User");

const mongoose = require("mongoose");
const PAGE_LIMIT = 10;

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
    const { search, user, privacy, date, page = 1 } = req.query;

    let filter = {};
    let orConditions = [];

    if (search && search.trim() !== "") {
      orConditions.push({
        hiveName: { $regex: search.trim(), $options: "i" }
      });

      if (mongoose.Types.ObjectId.isValid(search.trim())) {
        orConditions.push({ _id: search.trim() });
      }
    }

    if (orConditions.length > 0) filter.$or = orConditions;
    if (user && mongoose.Types.ObjectId.isValid(user)) filter.user = user;
    if (privacy) filter.privacyMode = privacy;

    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const currentPage = parseInt(page);
    const skip = (currentPage - 1) * PAGE_LIMIT;

    const totalHives = await Hive.countDocuments(filter);

    const hives = await Hive.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(PAGE_LIMIT);

    const totalPages = Math.ceil(totalHives / PAGE_LIMIT);

    res.render("admin/hive", {
      title: "Hive Management",
      hives,
      query: req.query,
      pagination: {
        totalHives,
        totalPages,
        currentPage,
      }
    });

  } catch (error) {
    console.error("🔥 ADMIN HIVE ERROR 🔥", error);
    res.status(500).send(error.message);
  }
};

const getHiveDetails = async (req, res) => {
  const hive = await Hive.findById(req.params.id)
    .populate("user", "name email")
    .populate("members.memberId", "name email"); 

  if (!hive) return res.status(404).json({ success: false });

  res.json({ success: true, hive });
};
 const getHiveImages = async (req, res) => {
  const hive = await Hive.findById(req.params.id);

  if (!hive) return res.status(404).json({ success: false });

  res.json({ success: true, images: hive.images });
};

const removeHiveImage = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    await Hive.findByIdAndUpdate(req.params.id, {
      $pull: { images: image }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("🔥 REMOVE HIVE IMAGE ERROR 🔥", error);
    res.status(500).json({ success: false });
  }
};

const updateHiveStatus = async (req, res) => {
  const { status, page } = req.body;

  await Hive.findByIdAndUpdate(req.params.id, {
    status,
  });

  res.redirect(`/hive?page=${page}`);
};






 const flagHive = async (req, res) => {
  await Hive.findByIdAndUpdate(req.params.id, {
    isFlagged: true,
    flagReason: req.body.reason
  });

  res.redirect("/admin/hive");
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

const getUserProfileAdmin = async (req, res) => {
  const userId = req.params.id;

  const user = await User.findById(userId)
    .select("-password -otp -otpExpires")
    .lean();

  const hiveCount = await Hive.countDocuments({ user: userId });

  res.json({
    user,
    hiveCount,
  });
};
const toggleUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  user.isActive = !user.isActive;
  await user.save();
  res.redirect("/user");
};
const softDeleteUser = async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isDeleted: true });
  res.redirect("/user");
};
const resetUserAccount = async (req, res) => {
 try {
    await User.findByIdAndUpdate(req.params.id, {
      isDeleted: false,
    });

    res.redirect("/user");
  } catch (err) {
    console.error("Restore user error:", err);
    res.status(500).send("Failed to restore user");
  }
};

const getAllImages = async (req, res) => {
try {
   
    res.render("admin/stock-images", {
      title: "Stock Image Management",
     
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
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
  flagHive, 
  updateHiveStatus,
  getHiveImages,
  removeHiveImage,
  getHiveDetails,
  getAllUsers,
  deleteHives,
  getUserProfileAdmin,
  toggleUser,
  softDeleteUser,
  resetUserAccount,
  getAllImages
};
