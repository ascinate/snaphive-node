const express = require("express");
const { getAllHives,getHivechats,getHiveDetails,getHiveImages,updateHiveStatus,flagHive,removeHiveImage } = require("../controllers/adminController");
const adminAuth = require("../middleware/adminAuth");


const router = express.Router();

router.get("/", adminAuth,getAllHives);
router.get("/:id", adminAuth, getHiveDetails);
router.get("/:id/images", adminAuth, getHiveImages);
router.get("/:id/chats", adminAuth, getHivechats);

router.delete(
  "/:id/image",
  adminAuth, removeHiveImage 
);
router.post("/:id/status", adminAuth, updateHiveStatus);
router.post("/:id/flag", adminAuth, flagHive);



module.exports = router;
