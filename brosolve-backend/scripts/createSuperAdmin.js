require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

async function createSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const email = "superadmin@brosolve.com";
    const password = "superadmin123";

    let user = await User.findOne({ email });

    if (user) {
      console.log("Superadmin already exists. Updating password+role...");
      user.passwordHash = await bcrypt.hash(password, 10);
      user.role = "superadmin";
      await user.save();
    } else {
      console.log("Creating new superadmin...");
      const hash = await bcrypt.hash(password, 10);
      user = new User({
        name: "Super Admin",
        email,
        passwordHash: hash,
        role: "superadmin",
        isHead: true,
      });
      await user.save();
    }

    console.log("Superadmin ready:");
    console.log("Email: superadmin@brosolve.com");
    console.log("Password: superadmin123");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createSuperAdmin();

