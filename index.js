import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";

import catchAsync from "./catchAsync.js";

import Node from "./models/Node.js";
import Transaction from "./models/Transaction.js";

import { Worker } from "worker_threads";

const worker = new Worker("./workers/simulation-worker.js");
const app = express();

var isSimulating = true;

worker.on("message", async (message) => {
  try {
    if (message.type == "update") {
      console.log("Simulation started...");
    } else if (message.type == "stop") {
      isSimulating = false;
      console.log("== Simulation Stopped ==");
    }
  } catch (e) {
    console.log(e);
  }
});

process.on("SIGINT", () => {
  worker.postMessage({ command: "stop" });
  process.exit();
});

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
  "/nodes",
  catchAsync(async (req, res) => {
    const limiter = 15000;
    const nodes = await Node.find({}).limit(limiter);
    const limitedLinks = await Transaction.find({}).limit(limiter);

    const links = await Transaction.aggregate([
      {
        $match: {
          _id: {
            $in: limitedLinks.map((transaction) => transaction._id),
          },
        },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $gte: ["$source", "$target"] },
              then: { source: "$source", target: "$target" },
              else: { source: "$target", target: "$source" },
            },
          },
          count: { $sum: 1 },
          doc: { $first: "$$ROOT" }, // Keep the first document of each group
        },
      },
      // {
      //   $match: {
      //     count: { $gt: 1 }, // Filter out pairs that appear only once
      //   },
      // },
      {
        $replaceRoot: { newRoot: "$doc" }, // Replace the root with the original documents
      },
    ]);

    console.log(links.length);

    res.json({
      status: "success",
      nodes: nodes,
      links: links,
    });
  })
);

app.get(
  "/node/:id",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const transactions = await Transaction.find({
      $or: [{ source: id }, { target: id }],
    }).populate("source target");

    res.json({
      status: "success",
      transactions: transactions,
    });
  })
);

app.get(
  "/node/:id/graph",
  catchAsync(async (req, res) => {
    const id = new mongoose.Types.ObjectId(req.params.id);

    console.log(id);

    const getNodes = async (nodeId) => {
      const queue = [{ nodeId, depth: 0 }];

      while (queue.length > 0) {
        const { nodeId, depth } = queue.shift();

        const transactions = await Transaction.find({
          $or: [{ source: nodeId }, { target: nodeId }],
        }).populate("source target");

        transactions.forEach((transaction) => {
          const sourceId = transaction.source._id.toString();
          const targetId = transaction.target._id.toString();

          if (!nodes.some((node) => node._id.toString() === sourceId)) {
            nodes.push(transaction.source);
          }

          if (!nodes.some((node) => node._id.toString() === targetId)) {
            nodes.push(transaction.target);
          }

          links.push({ source: sourceId, target: targetId });

          if (!visitedNodes.has(sourceId)) {
            visitedNodes.add(sourceId);
            queue.push({ nodeId: sourceId, depth: depth + 1 });
          }
          if (!visitedNodes.has(targetId)) {
            visitedNodes.add(targetId);
            queue.push({ nodeId: targetId, depth: depth + 1 });
          }
        });
      }
    };

    let nodes = [];
    let links = [];
    const visitedNodes = new Set();

    const initialNode = await Transaction.findById(id);
    if (initialNode) {
      nodes.push(initialNode);
    }

    await getNodes(id);

    res.json({
      status: "success",
      nodes: nodes,
      links: links,
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
  .connect("mongodb://localhost/Crypto-Sentinel")
  .then(() => {
    app.listen(5000, () => {
      console.log("Server running on PORT: 5000");
    });

    worker.postMessage({ command: "init" });
  })
  .catch((error) => console.log(error.message));
