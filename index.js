require("dotenv").config({ path: "./.env" });

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");

const Node = require("./models/Node");

const catchAsync = require("./catchAsync");

const app = express();

// ------------------------------------------------------------- MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(cookieParser(process.env.COOKIESECRET));

const corsOrigin =
  process.env.SERVERMODE === "development"
    ? true
    : [
        "https://vitap.locaro.in",
        "https://admin.vitap.locaro.in",
        "https://demo.vitap.locaro.in",
        "https://business.vitap.locaro.in",
      ];

app.use(cors({ credentials: true, origin: true }));

// ------------------------------------------------------------- ROUTES

app.get(
  "/secret",
  catchAsync(async (req, res) => {
    res.send("HELLO");
  })
);

app.get(
  "/nodes",
  catchAsync(async (req, res) => {
    const nodes = await Node.find({});
    res.json({
      status: "success",
      nodes: nodes,
    });
  })
);

// ------------------------------------------------------------- ERROR HANDLING

app.use((err, req, res, next) => {
  if (!err.message) err.message = "Something went wrong";
  // console.log(err.message);
  console.log(err);
  res.status(200).json({
    status: "failed",
    message: err.message,
  });
});

// ------------------------------------------------------------- LISTENER

mongoose
  .connect("mongodb://localhost/Crypto-Sentinel", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(5000, () => {
      console.log("Server running on PORT: 5000");
    });
  })
  .catch((error) => console.log(error.message));
