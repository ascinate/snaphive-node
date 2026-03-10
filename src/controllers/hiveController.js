const Hive = require("../models/Hive");
const bucket = require("../config/firebase");
const { sendPush } = require("../utils/sendPush");
const twilio = require("twilio");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);



function formatTo12Hour(time) {
  if (!time) return null;

  let strTime = String(time).trim().toLowerCase();

  let hour, minute;

  // Check if input has am/pm
  const isAmPm = strTime.includes("am") || strTime.includes("pm");

  if (isAmPm) {
    // Example: "1:16 pm" or "12:09 am"
    const [timePart, modifier] = strTime.split(" "); // ["1:16", "pm"]
    const parts = timePart.split(":");

    hour = Number(parts[0]);
    minute = parts.length > 1 ? Number(parts[1]) : 0;

    if (modifier === "pm" && hour < 12) hour += 12;
    if (modifier === "am" && hour === 12) hour = 0;

  } else {
    // 24-hour format: "13:20" or "00:45"
    const parts = strTime.split(":");
    hour = Number(parts[0]);
    minute = parts.length > 1 ? Number(parts[1]) : 0;
  }

  // Safety check
  if (isNaN(hour) || isNaN(minute)) return null;

  // Convert to 12-hour format
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm}`;
}


const createHive = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      hiveName,
      description,
      privacyMode,
      eventDate,
      startTime,
      endTime,
      expiryDate,
      coverImage,
    } = req.body;

    if (!hiveName) {
      return res.status(400).json({ success: false, message: "Hive name is required" });
    }

    const hive = await Hive.create({
      user: userId,
      hiveName,
      description,
      privacyMode,
      eventDate,
      startTime,
      endTime,
      expiryDate,
      coverImage,
    });

    res.status(201).json({
      success: true,
      message: "Hive created successfully",
      data: hive,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateHive = async (req, res) => {
  try {
    const userId = req.user.id;
    const { hiveId } = req.params;

    const {
      hiveName,
      description,
      privacyMode,
      eventDate,
      startTime,
      endTime,
      expiryDate,
      coverImage,
    } = req.body;

    const hive = await Hive.findOne({ _id: hiveId, user: userId });

    if (!hive) {
      return res.status(404).json({
        success: false,
        message: "Hive not found or unauthorized",
      });
    }

    if (hiveName !== undefined) hive.hiveName = hiveName;
    if (description !== undefined) hive.description = description;
    if (privacyMode !== undefined) hive.privacyMode = privacyMode;
    if (eventDate !== undefined) hive.eventDate = eventDate;
    if (startTime !== undefined) hive.startTime = startTime;
    if (endTime !== undefined) hive.endTime = endTime;
    if (expiryDate !== undefined) hive.expiryDate = expiryDate;
    if (coverImage !== undefined) hive.coverImage = coverImage;

    await hive.save();

    res.json({
      success: true,
      message: "Hive updated successfully",
      data: hive,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



const saveHiveImageUrls = async (req, res) => {
  try {
    const userId = req.user.id;
    const uploader = await User.findById(userId).select("name");
    const uploaderName = uploader?.name || "Someone";

    const userEmail = req.user.email;
    const hiveId = req.params.hiveId;
    const { images = [], videos = [] } = req.body;

    if (!images.length && !videos.length) {
      return res.status(400).json({ message: "No media URLs provided" });
    }

    const hive = await Hive.findById(hiveId);
    if (!hive) {
      return res.status(404).json({ message: "Hive not found" });
    }

    const isOwner = hive.user.toString() === userId;
    const isMember = hive.members.some(
      m => m.email === userEmail && m.status === "accepted"
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: "Not allowed to upload" });
    }

    // IMAGES
    if (images.length) {
      const imageObjects = images.map(url => ({
        url,
        blurred: false,
      }));
      hive.images.push(...imageObjects);
    }

    // VIDEOS
    if (videos.length) {
      const videoObjects = videos.map(video => ({
        url: video.url,
        thumbnail: video.thumbnail || null,
        duration: video.duration,
        size: video.size,
      }));
      hive.videos.push(...videoObjects);
    }

    await hive.save();

    const mediaLabel =
      images.length && videos.length
        ? "media"
        : images.length
          ? "photos"
          : "videos";

    const notificationType =
      images.length && videos.length
        ? "MEDIA_UPLOADED"
        : images.length
          ? "PHOTO_UPLOADED"
          : "VIDEO_UPLOADED";

    // MEMBER → OWNER
    if (!isOwner) {
      const owner = await User.findById(hive.user);
      if (owner?.fcmToken) {
        await sendPush(
          owner.fcmToken,
          `New ${mediaLabel} in ${hive.hiveName}`,
          `${uploaderName} added ${mediaLabel} to ${hive.hiveName}`,
          {
            hiveId: hive._id.toString(),
            hiveName: hive.hiveName,
            type: notificationType,
          }
        );
      }
    }

    // OWNER → MEMBERS
    if (isOwner) {
      const memberIds = hive.members
        .filter(m => m.status === "accepted" && m.memberId)
        .map(m => m.memberId);

      const members = await User.find({
        _id: { $in: memberIds },
        fcmToken: { $ne: null },
      });

      for (const member of members) {
        await sendPush(
          member.fcmToken,
          `New ${mediaLabel} in ${hive.hiveName}`,
          `Owner uploaded new ${mediaLabel} to ${hive.hiveName}`,
          {
            hiveId: hive._id.toString(),
            hiveName: hive.hiveName,
            type: notificationType,
          }
        );
      }
    }

    res.json({
      success: true,
      images: hive.images,
      videos: hive.videos,
    });

  } catch (err) {
    console.error("Save media URLs error:", err);
    res.status(500).json({ message: err.message });
  }
};

const blurHiveImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { hiveId } = req.params;
    const { index, blurred } = req.body;

    const hive = await Hive.findOne({ _id: hiveId, user: userId });

    if (!hive) {
      return res.status(403).json({ message: "Only owner can blur images" });
    }

    if (!hive.images[index]) {
      return res.status(404).json({ message: "Image not found" });
    }

    hive.images[index].blurred = blurred;

    await hive.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteHive = async (req, res) => {
  try {
    const userId = req.user.id;
    const { hiveId } = req.params;

    const hive = await Hive.findById(hiveId);

    if (!hive) {
      return res.status(404).json({
        success: false,
        message: "Hive not found",
      });
    }

    // 🔒 Only owner can delete
    if (hive.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this hive",
      });
    }

    // 🧹 OPTIONAL: delete images from Firebase storage
    if (hive.images && hive.images.length > 0) {
      for (const img of hive.images) {
        try {
          const filePath = decodeURIComponent(
            img.url.split("/o/")[1].split("?")[0]
          );
          await bucket.file(filePath).delete();
        } catch (err) {
          console.warn("Failed to delete image:", err.message);
        }
      }
    }

    await hive.deleteOne();

    res.status(200).json({
      success: true,
      message: "Hive deleted successfully",
    });

  } catch (err) {
    console.error("Delete hive error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};




// Keep other functions as they are...
const getUserHives = async (req, res) => {
  try {
    const userId = req.user.id;

    let hives = await Hive.find({
      $or: [
        { user: userId }, // owner
        {
          members: {
            $elemMatch: {
              memberId: userId,
              status: "accepted",
            },
          },
        },
      ],
    })
      .populate("user", "name email profileImage")
      .populate("members.memberId", "name email profileImage")
      .sort({ createdAt: -1 });

    const now = new Date();

    for (const hive of hives) {
      // 🔹 EXPIRY CHECK (unchanged)
      if (hive.isTemporary && hive.expiryDate) {
        let expiryDateTime = new Date(hive.expiryDate);

        if (hive.endTime) {
          const [time, meridian] = hive.endTime.split(" ");
          let [hours, minutes] = time.split(":").map(Number);

          if (meridian.toLowerCase() === "pm" && hours !== 12) hours += 12;
          if (meridian.toLowerCase() === "am" && hours === 12) hours = 0;

          expiryDateTime.setHours(hours, minutes, 0);

          if (now > expiryDateTime && !hive.isExpired) {
            hive.isExpired = true;
            await hive.save();
          }
        }
      }

      // 🔹 FILTER MEMBERS → ONLY ACCEPTED
      hive.members = hive.members.filter(
        (m) => m.status === "accepted"
      );
    }

    res.status(200).json({
      success: true,
      hives,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


const getHiveById = async (req, res) => {
  try {
    const userId = req.user._id;
    const { hiveId } = req.params;

    const hive = await Hive.findOne({
      _id: hiveId,
      $or: [
        { user: userId },
        {
          members: {
            $elemMatch: {
              memberId: userId,
              status: "accepted",
            },
          },
        },
      ],
    })
      .populate("user", "email name profileImage")
      .populate("members.memberId", "email name profileImage");



    if (!hive) {
      return res.status(404).json({
        success: false,
        message: "Hive not found",
      });
    }

    const userRole =
      hive.user._id.toString() === userId.toString() ? "owner" : "member";

    // 🔹 EXPIRY LOGIC (unchanged)
    if (hive.isTemporary && hive.expiryDate) {
      let expiryDateTime = new Date(hive.expiryDate);

      if (hive.endTime) {
        const [time, meridian] = hive.endTime.split(" ");
        let [hours, minutes] = time.split(":").map(Number);

        if (meridian.toLowerCase() === "pm" && hours !== 12) hours += 12;
        if (meridian.toLowerCase() === "am" && hours === 12) hours = 0;

        expiryDateTime.setHours(hours, minutes, 0);
      }

      if (new Date() > expiryDateTime && !hive.isExpired) {
        hive.isExpired = true;
        await hive.save();
      }
    }

    res.status(200).json({
      success: true,
      data: hive,
      userRole,
    });
  } catch (err) {
    console.error("Get hive by ID error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const inviteMember = async (req, res) => {
  try {
    const inviterId = req.user.id;
    const { hiveId } = req.params;
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Email or phone is required",
      });
    }

    const hive = await Hive.findOne({ _id: hiveId, user: inviterId });

    if (!hive) {
      return res.status(404).json({
        success: false,
        message: "Hive not found or unauthorized",
      });
    }

    let invitedUser = null;

    if (email) invitedUser = await User.findOne({ email });
    if (phone) invitedUser = await User.findOne({ phone });

    const memberId = invitedUser ? invitedUser._id : null;

    const alreadyInvited = hive.members.some((m) => {
      return (
        (memberId && m.memberId?.equals(memberId)) ||
        (email && m.email === email) ||
        (phone && m.phone === phone)
      );
    });

    if (alreadyInvited) {
      return res.status(400).json({
        success: false,
        message: "User already invited or already a member",
      });
    }

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    hive.members.push({
      memberId,
      email: email || null,
      phone: phone || null,
      status: "pending",
      expiryDate,
    });

    await hive.save();

    /* EMAIL INVITE */
    if (email) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const acceptUrl = `${req.protocol}://${req.get("host")}/api/hives/${hive._id}/accept-request?email=${email}`;

      const inviteHTML = `
        <div style="font-family:sans-serif">
          <h2>You are invited to a Hive 🐝</h2>
          <p><strong>${req.user.name || "A user"}</strong> invited you to:</p>
          <h3>${hive.hiveName}</h3>
          <a href="${acceptUrl}" 
            style="padding:10px 18px;background:#000;color:#fff;border-radius:6px;text-decoration:none;">
            Accept Invitation
          </a>
        </div>
      `;

      await transporter.sendMail({
        from: `"SnapHive" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Invitation to join "${hive.hiveName}"`,
        html: inviteHTML,
      });
    }

    /* PHONE INVITE SMS */
    if (phone) {

      const inviteLink = `${req.protocol}://${req.get("host")}/api/hives/${hive._id}/accept-request?phone=${phone}`;

      const smsMessage = `${req.user.name || "Someone"} invited you to join the hive "${hive.hiveName}" on SnapHive 🐝.

      Join here:
      ${inviteLink}`;

      await twilioClient.messages.create({
        body: smsMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
    }

    res.status(200).json({
      success: true,
      message: "Invitation sent successfully",
    });

  } catch (err) {
    console.error("Invite error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
const acceptHiveInvite = async (req, res) => {
  try {
    const { hiveId } = req.params;
    const { email, phone } = req.query;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Email or phone is required",
      });
    }

    const hive = await Hive.findById(hiveId);

    if (!hive) {
      return res.status(404).json({
        success: false,
        message: "Hive not found",
      });
    }

    // find member
    const member = hive.members.find(
      (m) =>
        (email && m.email === email) ||
        (phone && m.phone === phone)
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found",
      });
    }

    if (member.status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "Invitation already accepted",
      });
    }

    if (member.expiryDate && new Date() > new Date(member.expiryDate)) {
      return res.status(400).json({
        success: false,
        message: "Invitation expired",
      });
    }

    // attach user if exists
    let user = null;

    if (email) user = await User.findOne({ email });
    if (phone) user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User must register first",
      });
    }

    member.memberId = user._id;
    member.status = "accepted";

    await hive.save();

    res.json({
      success: true,
      message: "Hive invitation accepted",
      hiveId: hive._id,
    });

  } catch (err) {
    console.error("Accept invite error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const joinHiveByQR = async (req, res) => {
  try {
    const { hiveId } = req.params;
    const userId = req.user.id;

    const hive = await Hive.findById(hiveId);

    if (!hive) {
      return res.status(404).json({
        success: false,
        message: "Hive not found",
      });
    }

    const alreadyMember = hive.members.some(
      (m) => m.memberId && m.memberId.toString() === userId
    );

    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: "Already a member",
      });
    }

    hive.members.push({
      memberId: userId,
      status: "accepted",
    });

    await hive.save();

    res.json({
      success: true,
      message: "Joined hive successfully",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = { createHive,updateHive, getUserHives, saveHiveImageUrls, getHiveById, inviteMember, acceptHiveInvite, blurHiveImage, deleteHive,joinHiveByQR };