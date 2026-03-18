const express = require("express");
const { getAllHives,getHivechats,getHiveDetails,deleteMessage,getHiveImages,updateHiveStatus,flagHive,removeHiveImage } = require("../controllers/adminController");
const adminAuth = require("../middleware/adminAuth");


const router = express.Router();
router.delete(
  "/chat/:chatId/message/:messageId",
  adminAuth,
  deleteMessage
);
router.delete(
  "/chat/:chatId/messages",
  adminAuth,
  deleteMessage
);

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
