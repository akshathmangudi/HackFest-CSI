const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Node",
      required: true,
      // autopopulate: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Node",
      required: true,
      // autopopulate: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { strict: true, timestamps: true }
);

transactionSchema.plugin(require("mongoose-autopopulate"));

transactionSchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.model("Transaction", transactionSchema);
