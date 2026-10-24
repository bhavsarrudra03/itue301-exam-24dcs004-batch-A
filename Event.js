const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: { type: String, required: [true, "title is required"], trim: true, maxlength: [80, "title must be at most 80 characters"] },
  date: { type: Date, required: [true, "date is required"] },
  capacity: {
    type: Number,
    required: [true, "capacity is required"],
    min: [1, "capacity must be at least 1"],
    max: [500, "capacity cannot exceed 500"],
    validate: [
      { validator: Number.isInteger, message: "capacity must be a whole number" },
      { validator: function (v) { return this.category !== "cultural" || v <= 200; }, message: "A cultural event cannot have capacity above 200" },
    ],
  },
  fee: { type: Number, default: 0, min: [0, "fee cannot be negative"] },
  category: { type: String, enum: ["tech", "cultural", "sports"], default: "tech" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Event", eventSchema);
