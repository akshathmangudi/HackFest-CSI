import { parentPort, workerData, isMainThread } from "worker_threads";
import * as d3 from "d3-force";

import mongoose from "mongoose";

import Node from "../models/Node.js";
import Transaction from "../models/Transaction.js";

mongoose
  .connect("mongodb://localhost/Crypto-Sentinel")
  .then((db) => {
    if (!isMainThread) {
      let simulation;
      let simulationData;

      parentPort.on("message", (message) => {
        console.log("SIMULATION - Received message from main thread:", message);

        if (message.command === "init") {
          startSimulation();
        } else if (message.command === "stop") {
          stopSimulation();
        }
      });

      async function startSimulation() {
        try {
          //   const limiter = 50000;
          const nodesObj = await Node.find({}).lean();
          const nodes = nodesObj.map(function (node) {
            return { ...node, id: String(node._id) };
          });

          const transactions = await Transaction.aggregate([
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
            {
              $replaceRoot: { newRoot: "$doc" }, // Replace the root with the original documents
            },
          ]);

          const links = transactions.map((transaction) => ({
            id: transaction._id,
            source: String(transaction.source._id),
            target: String(transaction.target._id),
          }));

          parentPort.postMessage({ type: "update" });

          simulation = d3
            .forceSimulation(nodes)
            .force(
              "link",
              d3.forceLink(links).id((d) => d.id)
            )
            .force("charge", d3.forceManyBody().strength(-70))
            .force("center", d3.forceCenter())
            .force("x", d3.forceX())
            .force("y", d3.forceY());

          simulation.on("tick", () => {
            simulationData = {
              nodes: simulation.nodes(),
              links: simulation.force("link").links(),
            };
            // parentPort.postMessage({ type: "update", data: simulationData });
          });

          setTimeout(() => {
            stopSimulation();
          }, 60000);
        } catch (e) {
          console.log(e);
        }
      }

      async function stopSimulation() {
        try {
          if (simulation) {
            simulation.stop();

            const nodeOperations = simulationData.nodes.map((updatedNode) => ({
              updateOne: {
                filter: { _id: updatedNode._id },
                update: {
                  $set: {
                    x: updatedNode.x,
                    y: updatedNode.y,
                    vx: updatedNode.vx,
                    vy: updatedNode.vy,
                  },
                },
              },
            }));

            // const linkOperations = simulationData.links.map((updatedLinks) => ({
            //   updateOne: {
            //     filter: { _id: updatedLinks._id },
            //     update: {
            //       $set: {
            //         index: updatedLinks.index,
            //       },
            //     },
            //   },
            // }));

            const batchSize = 99999;

            const nodeBatches = Array.from(
              { length: Math.ceil(nodeOperations.length / batchSize) },
              (_, index) =>
                nodeOperations.slice(index * batchSize, (index + 1) * batchSize)
            );

            // const linkBatches = Array.from(
            //   { length: Math.ceil(linkOperations.length / batchSize) },
            //   (_, index) =>
            //     linkOperations.slice(index * batchSize, (index + 1) * batchSize)
            // );

            await Promise.all(
              nodeBatches.map(async (batch) => {
                const result = await Node.bulkWrite(batch);
                console.log(
                  `Updated ${result.modifiedCount} Nodes in the database.`
                );
              })
            );

            // await Promise.all(
            //   linkBatches.map(async (batch) => {
            //     const result = await Transaction.bulkWrite(batch);
            //     console.log(
            //       `Updated ${result.modifiedCount} Links in the database.`
            //     );
            //   })
            // );
          }
          parentPort.postMessage({ type: "stop", data: simulationData });
        } catch (e) {
          console.log(e);
        }
      }
    }
  })
  .catch((error) => console.log(error.message));
