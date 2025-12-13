const renderDashboard = (req, res) => {
  const admin = req.session.admin;

  if (!admin) {
    return res.redirect("/login");
  }

  // Safe dummy stats so EJS never crashes
  const stats = {
    totalUsers: 0,
    activeUsers: 0,
    activationRate: 0,
    partnersLinked: 0,
    forecastsPerWeek: 0,
    forecastUsefulness: 0,
    contentVerified: 0,
    churn14d: 0,
  };

  res.render("admin/dashboard", {
    title: "Admin Dashboard",
    admin,
    stats,
  });
};

module.exports = {
  renderDashboard,
};
