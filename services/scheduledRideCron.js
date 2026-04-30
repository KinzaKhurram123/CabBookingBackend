const cron = require("node-cron");
const { processScheduledRides } = require("./scheduledRideService");

// Run every minute to check for scheduled rides
const startScheduledRideCron = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    console.log("Running scheduled ride processor...");
    try {
      await processScheduledRides();
    } catch (error) {
      console.error("Error in scheduled ride cron:", error);
    }
  });

  console.log("Scheduled ride cron job started (runs every minute)");
};

module.exports = { startScheduledRideCron };
