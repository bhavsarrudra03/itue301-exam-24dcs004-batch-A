const connect = require("./db");
const Event = require("./models/Event");
const { formatValidationError } = require("./utils/formatError");

(async () => {
  try {
    await connect();

    // 1. Save one valid event
    const validEvent = new Event({
      title: "Charusat Tech Fest 2026",
      date: new Date("2026-11-15"),
      capacity: 150,
      fee: 50,
      category: "tech",
    });

    const saved = await validEvent.save();
    console.log("Successfully saved valid event:");
    console.log(saved);

    // 2. Validate and show formatted error for an invalid event
    const invalidEvent = new Event({
      title: "",
      date: "not-a-date",
      capacity: 250, // Cultural cannot exceed 200
      fee: -10,
      category: "cultural",
    });

    try {
      await invalidEvent.save();
    } catch (err) {
      const formatted = formatValidationError(err);
      console.log("\nFormatted validation error for invalid event:");
      console.log(JSON.stringify(formatted, null, 2));
    }
  } catch (err) {
    console.error("Seed failed:", err.message);
  } finally {
    const mongoose = require("mongoose");
    await mongoose.disconnect();
    process.exit(0);
  }
})();
