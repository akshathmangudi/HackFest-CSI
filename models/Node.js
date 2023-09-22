const mongoose = require("mongoose");

const nodeSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: true,
    },
    flag: {
      type: String,
      enum: ["Official", "Normal", "Criminal"],
      default: "Normal",
    },
    amount: {
      type: Number,
      required: true,
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    information: {
      type: {
        name: {
          type: String,
        },
        address: {
          type: String,
        },
        phone: {
          type: String,
        },
        aadhar: {
          type: String,
        },
      },
      required: false,
    },
  },
  { strict: true, timestamps: true }
);

module.exports = mongoose.model("Node", nodeSchema);
