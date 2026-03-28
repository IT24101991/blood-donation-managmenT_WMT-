const Camp = require("../models/Camp");
const asyncHandler = require("../utils/asyncHandler");
const { serializeCamp } = require("../utils/serializers");

const getCamps = asyncHandler(async (req, res) => {
  const camps = await Camp.find({}).sort({ date: 1 });
  res.status(200).json(camps.map(serializeCamp));
});

const createCamp = asyncHandler(async (req, res) => {
  const { name, province, district, nearestHospital, location, address, googleMapLink, date, startTime, endTime, campStatus } = req.body;

  if (!name || !province || !district || !date) {
    res.status(400);
    throw new Error("Name, province, district, and date are required");
  }

  const camp = await Camp.create({
    name,
    province,
    district,
    nearestHospital,
    location,
    address,
    googleMapLink,
    date,
    startTime,
    endTime,
    campStatus: campStatus || "UPCOMING"
  });

  res.status(201).json(serializeCamp(camp));
});

const updateCamp = asyncHandler(async (req, res) => {
  const { name, province, district, nearestHospital, location, address, googleMapLink, date, startTime, endTime, campStatus } = req.body;

  if (!name || !province || !district || !date) {
    res.status(400);
    throw new Error("Name, province, district, and date are required");
  }

  const camp = await Camp.findById(req.params.id);

  if (!camp) {
    res.status(404);
    throw new Error("Camp not found");
  }

  camp.name = name;
  camp.province = province;
  camp.district = district;
  camp.nearestHospital = nearestHospital;
  camp.location = location;
  camp.address = address;
  camp.googleMapLink = googleMapLink;
  camp.date = date;
  camp.startTime = startTime;
  camp.endTime = endTime;
  camp.campStatus = campStatus || "UPCOMING";

  await camp.save();

  res.status(200).json(serializeCamp(camp));
});

const deleteCamp = asyncHandler(async (req, res) => {
  const camp = await Camp.findById(req.params.id);

  if (!camp) {
    res.status(404);
    throw new Error("Camp not found");
  }

  await camp.deleteOne();
  res.status(200).json({
    success: true,
    message: "Camp deleted successfully"
  });
});

const markInterest = asyncHandler(async (req, res) => {
  const camp = await Camp.findById(req.params.id);

  if (!camp) {
    res.status(404);
    throw new Error("Camp not found");
  }

  camp.interestedCount += 1;
  await camp.save();

  res.status(200).json(serializeCamp(camp));
});

module.exports = {
  getCamps,
  createCamp,
  updateCamp,
  deleteCamp,
  markInterest
};
