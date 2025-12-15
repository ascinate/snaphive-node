const User = require("../models/User");
const Hive = require("../models/Hive");

const renderDashboard = async (req, res) => {
  const admin = req.session.admin;

  if (!admin) {
    return res.redirect("/login");
  }

  try {
    const [
      totalUsers,
      totalHives,
      activeHives,
      expiredHives,
      temporaryHives,
    ] = await Promise.all([
      User.countDocuments(),
      Hive.countDocuments(),
      Hive.countDocuments({ isExpired: false }),
      Hive.countDocuments({ isExpired: true }),
      Hive.countDocuments({ isTemporary: true }),
    ]);

    const stats = {
      totalUsers,
      totalHives,
      activeHives,
      expiredHives,
      temporaryHives,
    };

    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      admin,
      stats,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).send("Failed to load dashboard");
  }
};

module.exports = {
  renderDashboard,
};
