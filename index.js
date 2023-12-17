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

var currentThread = null;
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

app.post(
  "/chat",
  catchAsync(async (req, res) => {
    const assistantId = "asst_fzovHtPViMFj";
    const modelToUse = "gpt-4-1106-preview";

    if (currentThread === null) {
      const thread = await openai.beta.threads.create();
      console.log("New thread created with ID: ", thread.id, "\n");
      currentThread = thread.id;
    }

    const message = req.body.message;

    const threadMessage = await openai.beta.threads.messages.create(
      currentThread,
      {
        role: "user",
        content: message,
      }
    );

    // Run the Assistant
    const run = await openai.beta.threads.runs.create(currentThread, {
      assistant_id: assistantId,
      instructions: `You're Node Bot, an assistant Data Analyst for Crypto Sentinel, a monitor/tracking layer on blockchain networks. Your job is to assist government agencies and agents in finding patterns, draft reports, and give insight into fighting illicit activities in the blockchain network you're monitoring.

You're to be professional and concise with the information you provide.

Currently, you're running in beta so there's limited data provided to you, so you can make up things if you don't have available information, but stay within limits.

Start the thread by greeting the agent and giving 4 things you can do.

The agent has a GUI that contains a force directed graph of 15000 nodes and transactions

The backend is running on Node.js, Express, and MongoDB (Mongoose ORM)

Every message from the user will contain METADATA encased in a pair of \`\`\`, you're to never acknowledge this metadata to the end user

The metadata will contain:
- Selected Node ID
- Node Information
- Rating
- Tag
- other Information

how the METADATA will look:
\`\`\`
data
\`\`\`

This is the MongoDB Schema:
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
    x: {
      type: Number,
      required: false,
    },
    y: {
      type: Number,
      required: false,
    },
    vx: {
      type: Number,
      required: false,
    },
    vy: {
      type: Number,
      required: false,
    },
    index: {
      type: Number,
      required: true,
    },
  },
  { strict: true, timestamps: true }
);

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

You get access to functions that allow you to gain access to these schemas:
- GET_DATA: Gets node information and a list of transactions from a string ID
- CUSTOM_QUERY: Allows you to run custom mongoose query on Transactions.find using an object, you're open to using it as you wish. Any errors will be returned as a string. Object parameters for schema.find, look through Mongoose's query documentation, and create custom objects to get any data for your situation.

How the functions look:

const GET_DATA = async (selectedNode) => {
  mongoose
    .connect("mongodb://localhost/Crypto-Sentinel")
    .then(async (db) => {
      const node = await Node.find({ id: selectedNode });
      const transactions = await Transaction.find({
        $or: [{ source: selectedNode }, { target: selectedNode }],
      }).populate("source target");

      if (node)
        return {
          node,
          transactions,
        };

      return {};
    })
    .catch((e) => {
      console.log(e);
      return e.message;
    });;
};

const CUSTOM_QUERY = async (query) => {
  mongoose
    .connect("mongodb://localhost/Crypto-Sentinel")
    .then(async (db) => {
      const transactions = await Transaction.find(query).populate(
        "source target"
      );

      if (transactions) return transactions;
      return null;
    })
    .catch((e) => {
      console.log(e);
      return e.message;
    });
};

Use the METADATA to find the SelectedNode ID and get information using GET_DATA as soon as the thread starts. For the initial message provide general information about the node and then look through the list of transactions and start creating statistics based on to and fro transactions from suspicious or criminal or low rated (less than 4) nodes.

You can use the CUSTOM_QUERY to look through transactions as the user asks and craft replies based on information you have. Provide useful insights, patterns, make graphs, etc. You have almost complete READ access to the database.`, // Your instructions here
      tools: [{ type: "code_interpreter" }, { type: "retrieval" }],
    });

    const retrieveRun = async () => {
      const keepRetrievingRun = await openai.beta.threads.runs.retrieve(
        currentThread,
        run.id
      );

      console.log(`Run status: ${keepRetrievingRun.status}`);

      if (keepRetrievingRun.status !== "completed") {
        setTimeout(retrieveRun, 500);
      } else {
        console.log("\n");
      }
    };

    retrieveRun();

    const waitForAssistantMessage = async () => {
      await retrieveRun();

      const allMessages = await openai.beta.threads.messages.list(
        currentThread
      );

      res.status(200).json({
        status: "success",
        response: allMessages.data[0].content[0].text.value,
      });

      // console.log("User: ", threadMessage.content[0].text.value);
      console.log("Assistant: ", allMessages.data[0].content[0].text.value);
    };
    waitForAssistantMessage();
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
