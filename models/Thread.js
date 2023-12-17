import mongoose from "mongoose";

const threadSchema = new mongoose.Schema(
  {
    thread: {
      type: String,
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
  { strict: true, timestamps: true }
);

threadSchema.set("toJSON", {
  virtuals: true,
});

threadSchema.set("toObject", {
  virtuals: true,
});

export default mongoose.model("Thread", threadSchema);
