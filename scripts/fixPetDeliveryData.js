const mongoose = require("mongoose");
const PetDeliveryBooking = require("../models/petDeliveryBooking");

// Tumhara actual MongoDB connection string - YE DALE
const MONGODB_URI = "mongodb+srv://doadmin:s24i59Pc3AEv68Y0@db-mongodb-nyc1-15729-fdfc423f.mongo.ondigitalocean.com/admin?tls=true&authSource=admin&replicaSet=db-mongodb-nyc1-15729";

const fixExistingData = async () => {
  try {
    console.log("🔄 Connecting to database...");
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log("✅ Database connected successfully!");
    console.log("🔄 Starting data migration...");
    
    // Find all bookings with GeoJSON dropoffLocation
    const bookings = await PetDeliveryBooking.find({
      "dropoffLocation.type": "Point"
    });
    
    console.log(`📊 Found ${bookings.length} bookings with GeoJSON format`);
    
    let fixed = 0;
    let failed = 0;
    
    for (const booking of bookings) {
      try {
        if (booking.dropoffLocation?.type === "Point" && booking.dropoffLocation?.coordinates) {
          const [lng, lat] = booking.dropoffLocation.coordinates;
          booking.dropoffLocation = {
            lat: lat,
            lng: lng
          };
          await booking.save({ validateBeforeSave: false });
          fixed++;
          console.log(`✅ Fixed booking ${booking._id}`);
        }
      } catch (err) {
        failed++;
        console.error(`❌ Failed to fix booking ${booking._id}:`, err.message);
      }
    }
    
    console.log("\n🎉 Migration complete!");
    console.log(`✅ Fixed: ${fixed} bookings`);
    console.log(`❌ Failed: ${failed} bookings`);
    console.log(`📊 Total processed: ${bookings.length} bookings`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

fixExistingData();