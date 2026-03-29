const express = require("express");
const router = express.Router();
const { getRideTypes } = require("../controllers/rideTypeControllers");

router.get("/ride-types", getRideTypes);

module.exports = router;
