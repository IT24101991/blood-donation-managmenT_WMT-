const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const campRoutes = require("./routes/campRoutes");
const donorRoutes = require("./routes/donorRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const hospitalRequestRoutes = require("./routes/hospitalRequestRoutes");
const emergencyRoutes = require("./routes/emergencyRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const activityRoutes = require("./routes/activityRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LifeLine API is running"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/camps", campRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/hospital-requests", hospitalRequestRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/chat", chatRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
