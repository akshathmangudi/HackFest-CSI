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
        console.log("Received message from main thread:", message);

        if (message.command === "init") {
          startSimulation();
        } else if (message.command === "stop") {
          stopSimulation();
        }
      });

      async function startSimulation() {
        try {
          //   const limiter = 50000;
          const nodes = await Node.find({}).lean();
          const transactions = await Transaction.find({})
            .populate("source", "index")
            .populate("target", "index")
            .exec();

          const links = transactions.map((transaction) => ({
            source: transaction.source.index,
            target: transaction.target.index,
          }));

          console.log(links[0]);

          parentPort.postMessage({ type: "update" });

          simulation = d3
            .forceSimulation(nodes)
            .force("center", d3.forceCenter())
            .force("charge", d3.forceManyBody())
            .force("link", d3.forceLink().links(links));

          simulation.on("tick", () => {
            simulationData = {
              nodes: simulation.nodes(),
              links: simulation.force("link").links(),
            };
            // parentPort.postMessage({ type: "update", data: simulationData });
          });

          setTimeout(() => {
            stopSimulation();
          }, 30000);
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
                    index: updatedNode.index,
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
