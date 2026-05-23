const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      console.log("Token received in middleware:", token.substring(0, 20) + "...");

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);

      const userId = decoded.id || decoded._id || decoded.userId;

      if (!userId) {
        console.log("No user ID in token");
        return res.status(401).json({ message: "Invalid token payload" });
      }

      const user = await User.findById(userId).select("-password");
      if (!user) {
        console.log("User not found in DB for ID:", userId);
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Auth error in protect middleware:", error.message);
      return res.status(401).json({ message: "Token invalid or expired" });
    }
  } else {
    console.log("No token provided in headers");
    return res.status(401).json({ message: "No token, authorization denied" });
  }
};

module.exports = protect;
