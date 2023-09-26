require("dotenv").config({ path: "./.env" });

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");

const Node = require("./models/Node");

const catchAsync = require("./catchAsync");
const Transaction = require("./models/Transaction");

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
    const limiter = 10000;
    const nodes = await Node.find({}).limit(limiter);
    const links = await Transaction.find({}).limit(limiter);
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

// app.get(
//   "/node/:id/graph",
//   catchAsync(async (req, res) => {
//     const id = new mongoose.Types.ObjectId(req.params.id);

//     console.log(id);

//     const pipeline = [
//       {
//         $match: {
//           $or: [{ source: id }, { target: id }],
//         },
//       },
//       {
//         $graphLookup: {
//           from: "transactions",
//           startWith: "$target",
//           connectFromField: "target",
//           connectToField: "source",
//           depthField: "level",
//           maxDepth: 4,
//           as: "children",
//         },
//       },
//       {
//         $unwind: "$children",
//       },
//       {
//         $sort: {
//           "children.level": -1,
//         },
//       },
//       {
//         $group: {
//           _id: "$_id",
//           source: {
//             $first: "$source",
//           },
//           amount: {
//             $first: "$amount",
//           },
//           children: {
//             $push: "$children",
//           },
//         },
//       },
//       {
//         $addFields: {
//           children: {
//             $reduce: {
//               input: "$children",
//               initialValue: {
//                 currentLevel: -1,
//                 currentLevelChildren: [],
//                 previousLevelChildren: [],
//               },
//               in: {
//                 $let: {
//                   vars: {
//                     prev: {
//                       $cond: [
//                         {
//                           $eq: ["$$value.currentLevel", "$$this.level"],
//                         },
//                         "$$value.previousLevelChildren",
//                         "$$value.currentLevelChildren",
//                       ],
//                     },
//                     current: {
//                       $cond: [
//                         {
//                           $eq: ["$$value.currentLevel", "$$this.level"],
//                         },
//                         "$$value.currentLevelChildren",
//                         [],
//                       ],
//                     },
//                   },
//                   in: {
//                     currentLevel: "$$this.level",
//                     previousLevelChildren: "$$prev",
//                     currentLevelChildren: {
//                       $concatArrays: [
//                         "$$current",
//                         [
//                           {
//                             $mergeObjects: [
//                               "$$this",
//                               {
//                                 children: {
//                                   $filter: {
//                                     input: "$$prev",
//                                     as: "e",
//                                     cond: {
//                                       $eq: ["$$e.source", "$$this._id"],
//                                     },
//                                   },
//                                 },
//                               },
//                             ],
//                           },
//                         ],
//                       ],
//                     },
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//       {
//         $addFields: {
//           children: "$children.currentLevelChildren",
//         },
//       },
//     ];

//     const result = await Transaction.aggregate(pipeline);

//     console.log(result);

//     const nodeIds = [];

//     nodeIds.push(id);
//     await transactions.map((transaction) => {
//       if (!nodeIds.includes(transaction.source))
//         nodeIds.push(transaction.source);
//       if (!nodeIds.includes(transaction.target))
//         nodeIds.push(transaction.target);
//     });

//     const nodes = await Node.find({ _id: { $in: nodeIds } });

//     res.json({
//       status: "success",
//       nodes: nodes,
//       links: transactions,
//     });
//   })
// );

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
