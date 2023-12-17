import mongoose from "mongoose";

const threadSchema = new mongoose.Schema(
  {
    thread: {
      type: String,
      required: true,
    },
    node: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Node",
      required: true,
    },
    messages: [
      {
        role: {
          type: String,
        },
        content: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true }
);

threadSchema.set("toJSON", {
  virtuals: true,
});

threadSchema.set("toObject", {
  virtuals: true,
});

export default mongoose.model("Thread", threadSchema);
