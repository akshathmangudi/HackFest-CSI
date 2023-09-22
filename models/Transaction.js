const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Node",
      required: true,
      autopopulate: true,
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Node",
      required: true,
      autopopulate: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { strict: true, timestamps: true }
);

schema.plugin(require("mongoose-autopopulate"));

module.exports = mongoose.model("Transaction", transactionSchema);
