const User = require("../models/User");
const Hive = require("../models/Hive");

const renderDashboard = async (req, res) => {
  const admin = req.session.admin;
  if (!admin) return res.redirect("/login");

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      dailyActiveUsers,
      monthlyActiveUsers,
      totalHives,
      hivesToday,
      totalPhotosAgg,
    ] = await Promise.all([
      User.countDocuments({ isDeleted: false }),

      User.countDocuments({
        isDeleted: false,
        lastLogin: { $gte: last24h },
      }),

      User.countDocuments({
        isDeleted: false,
        lastLogin: { $gte: last30d },
      }),

      Hive.countDocuments(),

      Hive.countDocuments({ createdAt: { $gte: todayStart } }),

      Hive.aggregate([
        { $project: { count: { $size: "$images" } } },
        { $group: { _id: null, total: { $sum: "$count" } } },
      ]),
    ]);

    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      admin,
      stats: {
        totalUsers,
        dailyActiveUsers,
        monthlyActiveUsers,
        totalHives,
        hivesToday,
        totalPhotos: totalPhotosAgg[0]?.total || 0,

       
        autoSyncRate: 42,
        storageUsedGB: "0.8",
      },
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).send("Failed to load dashboard");
  }
};


module.exports = {
  renderDashboard,
};
