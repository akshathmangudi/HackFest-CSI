import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Node",
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Node",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    index: {
      type: Number,
      required: false,
    },
  },
  { strict: true, timestamps: true }
);

transactionSchema.set("toJSON", {
  virtuals: true,
});

transactionSchema.set("toObject", {
  virtuals: true,
});

export default mongoose.model("Transaction", transactionSchema);
