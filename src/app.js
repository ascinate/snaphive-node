const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const hiveRoutes = require("./routes/hiveRoutes");
const adminRoutes = require("./routes/adminRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const adminHiveRoutes = require("./routes/adminHiveRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const adminStockRoutes =require("./routes/adminStockRoutes");
const notificationRoutes =require("./routes/notificationRoutes");
const publicStockRoutes =require("./routes/publicStockRoutes");


const app = express();

/* -------------------- DATABASE -------------------- */
connectDB();

/* -------------------- MIDDLEWARE -------------------- */
app.use(express.json({ limit: "25mb" }));

app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* -------------------- SESSION -------------------- */
app.use(
  session({
    secret: "super-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);
app.use((req, res, next) => {
  res.locals.admin = req.session.admin || null;
  next();
});

/* -------------------- STATIC FILES -------------------- */
//  FRONTEND + IMAGES
app.use(express.static(path.join(__dirname, "public")));

//  FRONTEND URL /stock/1.jpg
app.use(
  "/stock",
  express.static(path.join(__dirname, "public/stock"))
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// root → login
app.get("/", (req, res) => {
  res.redirect("/login");
});

// login page
app.get("/login", (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  res.render("login", { title: "Admin Login", error: null });
});

/* -------------------- admin -------------------- */
app.use("/admin", adminRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/hive", adminHiveRoutes);
app.use("/user", adminUserRoutes);
app.use("/static-stock", adminStockRoutes);
app.get("/notifications", (req, res) => {
  res.render("admin/notifications", {
    title: "Notifications"
  });
});






/* -------------------- API ROUTES -------------------- */

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/hives", hiveRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stock-images", publicStockRoutes);



/* -------------------- 404 -------------------- */
app.use((req, res) => {
  res.status(404).send("404 | Page not found");
});

/* -------------------- ERROR -------------------- */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({
    message: err.message,
    stack: err.stack,
  });
});

/* -------------------- SERVER -------------------- */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
