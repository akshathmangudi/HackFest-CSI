import mongoose from "mongoose";
import mongooseAutoPopulate from "mongoose-autopopulate";

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
    index: {
      type: Number,
      required: false,
    },
  },
  { strict: true, timestamps: true }
);

// transactionSchema.plugin(mongooseAutoPopulate);

transactionSchema.set("toJSON", {
  virtuals: true,
});

export default mongoose.model("Transaction", transactionSchema);
