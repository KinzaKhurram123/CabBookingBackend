const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorMiddlerware");
const swaggerUI = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

dotenv.config();
connectDB();
const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/ride", require("./routes/rideBookingRoutes"));
app.use("/api/rider", require("./routes/riderRoutes"));
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));
app.use("/api/parcel", require("./routes/percelBookingRoutes"));
app.use("/api/pet", require("./routes/petBookingRoutes"));

app.get("/test", (req, res) => {
  res.json({ message: "Backend is alive!" });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`),
);
