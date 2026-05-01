const User = require("../models/User");
const Donor = require("../models/Donor");
const asyncHandler = require("../utils/asyncHandler");

const { serializeDonor } = require("../utils/serializers");

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("-password").sort({ createdAt: -1 });
  res.status(200).json(
    users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }))
  );
});

const getDonors = asyncHandler(async (req, res) => {
  console.log(`[AdminController] getDonors called by user: ${req.user?._id} (${req.user?.role})`);
  const donors = await Donor.find({}).populate("user", "name email role").sort({ createdAt: -1 });
  console.log(`[AdminController] Found ${donors.length} donors`);
  res.status(200).json(donors.map(serializeDonor));
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400);
    throw new Error("Name, email, password, and role are required");
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    res.status(409);
    throw new Error("Email is already registered");
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role
  });

  res.status(201).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.role = req.body.role || user.role;
  await user.save();

  res.status(200).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

module.exports = {
  getUsers,
  createUser,
  updateUserRole,
  getDonors
};
