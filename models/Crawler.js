import mongoose from "mongoose";

const CrawlerSchema = new mongoose.Schema(
  {
    walletId: {
      type: String,
      required: true,
      unique: true,
    },

    flag: {
      type: String,
      enum: ["Official", "Normal", "Criminal"],
      default: "Normal",
    },

    keyword: {
      type: Array,
      required: true,
    },

    link: {
      type: String,
      required: true,
    },
  },
  { strict: true, timestamps: true }
);

export default mongoose.model("Crawler", CrawlerSchema);
