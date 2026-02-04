const Hive = require("../models/Hive");
const bucket = require("../config/firebase");
const nodemailer = require("nodemailer");
const User = require("../models/User");

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



const saveHiveImageUrls = async (req, res) => {
  try {
    const userId = req.user.id;
    const hiveId = req.params.hiveId;
    const { images } = req.body;

    const hive = await Hive.findOne({ _id: hiveId, user: userId });
    if (!hive) return res.status(404).json({ message: "Hive not found" });

    const imageObjects = images.map(url => ({
      url,
      blurred: false,
    }));

    hive.images.push(...imageObjects);

    await hive.save();

    res.json({ success: true, images: hive.images });
  } catch (err) {
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
    const userId = req.user.id;
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

    // 🔹 DETERMINE USER ROLE
    const userRole =
      hive.user.toString() === userId ? "owner" : "member";

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


const inviteMemberByEmail = async (req, res) => {
  try {
    const inviterId = req.user.id;
    const { hiveId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Receiver email is required",
      });
    }

    const hive = await Hive.findOne({ _id: hiveId, user: inviterId });
    if (!hive) {
      return res.status(404).json({
        success: false,
        message: "Hive not found or unauthorized",
      });
    }

    // Check if the user exists
    const invitedUser = await User.findOne({ email });
    const memberId = invitedUser ? invitedUser._id : null;

    // Check if already invited
    const alreadyInvited = hive.members.some(
      (m) => (m.memberId && m.memberId.equals(memberId)) || m.email === email
    );
    if (alreadyInvited) {
      return res.status(400).json({
        success: false,
        message: "User is already invited or a hive member",
      });
    }

    // Add to hive members
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    hive.members.push({
      memberId,
      email,
      status: "pending",
      expiryDate,
    });

    await hive.save();

    // Send invitation email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const acceptUrl = `${req.protocol}://${req.get("host")}/api/hives/${hive._id}/accept-request?email=${email}`;

    const inviteHTML = `
      <div style="font-family:sans-serif;line-height:1.6">
        <h2>You are invited to a Hive 🐝</h2>

        <p>
          <strong>${req.user.name || "A user"}</strong> has invited you to join the hive:
        </p>

        <h3 style="background:#f2f2f2;padding:10px;border-radius:6px;">
          ${hive.hiveName}
        </h3>

        <p>Login to SnapHive to accept this invitation.</p>

        <div style="margin:20px 0;">
          <a href="${acceptUrl}"
            style="
              display:inline-block;
              padding:10px 18px;
              background:#000;
              color:#fff;
              border-radius:6px;
              text-decoration:none;
              font-weight:600;
            ">
            ✅ Accept Invitation
          </a>
        </div>

        <p style="font-size:12px;color:#777;margin-top:20px;">
          This invitation was sent from SnapHive.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"SnapHive" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Invitation to join "${hive.hiveName}"`,
      html: inviteHTML,
    });

    res.status(200).json({
      success: true,
      message: "Invitation email sent and member added successfully",
      member: { memberId, email, status: "pending", expiryDate },
    });
  } catch (err) {
    console.error("Invite mail error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const acceptHiveInvite = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { hiveId } = req.params;

    const hive = await Hive.findById(hiveId);
    if (!hive) {
      return res.status(404).json({
        success: false,
        message: "Hive not found",
      });
    }

    // Find member invite (by email or memberId)
    const member = hive.members.find(
      (m) =>
        (m.memberId && m.memberId.toString() === userId) ||
        m.email === userEmail
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "No invitation found for this user",
      });
    }

    // Already accepted
    if (member.status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "You are already a member of this hive",
      });
    }

    // Check expiry
    if (member.expiryDate && new Date() > new Date(member.expiryDate)) {
      return res.status(400).json({
        success: false,
        message: "Invitation has expired",
      });
    }

    // Accept invitation
    member.status = "accepted";
    member.memberId = userId; // attach userId if not set

    await hive.save();

    res.status(200).json({
      success: true,
      message: "You have successfully joined the hive",
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

const acceptHiveInviteByEmail = async (req, res) => {
  try {
    const { hiveId } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const hive = await Hive.findById(hiveId);
    if (!hive) {
      return res.status(404).json({
        success: false,
        message: "Hive not found",
      });
    }

    // Find the invited member by email
    const member = hive.members.find((m) => m.email === email);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found for this email",
      });
    }

    // Already accepted
    if (member.status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "Invitation already accepted",
      });
    }

    // Check expiry
    if (member.expiryDate && new Date() > new Date(member.expiryDate)) {
      return res.status(400).json({
        success: false,
        message: "Invitation has expired",
      });
    }

    // Check if user exists now
    const user = await User.findOne({ email });
    if (user) {
      member.memberId = user._id;
    } else {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Accept invitation
    member.status = "accepted";

    await hive.save();

    return res.status(200).json({
      success: true,
      message: "Hive invitation accepted successfully",
      hiveId: hive._id,
      email,
    });
  } catch (err) {
    console.error("Accept invite by email error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


module.exports = { createHive, getUserHives, saveHiveImageUrls, getHiveById, inviteMemberByEmail, acceptHiveInvite, acceptHiveInviteByEmail,blurHiveImage };