const mongoose = require("mongoose");

const Transaction = require("./Transaction");

const nodeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
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

nodeSchema.set("toJSON", {
  virtuals: true,
});

nodeSchema.virtual("val").get(function () {
  return 1;
});

module.exports = mongoose.model("Node", nodeSchema);
