import { parentPort, workerData, isMainThread } from "worker_threads";

import mongoose from "mongoose";

import Crawler from "../models/Crawler.js";

import torRequest from "tor-request";
import natural from "natural";

const suspiciousKeywords = ["porn", "drugs", "document", "passport", "hitman"];

const bitcoinRegex = /\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\b/g;
const urlRegex = /href=["']?(https?:\/\/[^'" >]+)["']?/gi;

var isEnabled = true;

const MAX_DEPTH = 5;

mongoose
  .connect("mongodb://localhost/Crypto-Sentinel")
  .then((db) => {
    if (!isMainThread) {
      torRequest.setTorAddress("127.0.0.1", 9150);

      const tokenizer = new natural.WordTokenizer();
      let visitedUrls = new Set();
      let urlQueue = [];

      parentPort.on("message", (message) => {
        console.log("CRAWLER - Received message from main thread:", message);

        if (message.command === "init") {
          isEnabled = true;
          startCrawler();
        } else if (message.command === "stop") {
          stopCrawler();
        }
      });

      async function startCrawler() {
        const analyzeContentForCriminalActivity = (content) => {
          const tokens = tokenizer.tokenize(content.toLowerCase());
          return suspiciousKeywords.filter((keyword) =>
            tokens.includes(keyword)
          );
        };

        const scrapePage = async (url, depth) => {
          if (!isEnabled) return;
          if (depth > MAX_DEPTH) return;
          if (visitedUrls.has(url)) return;

          visitedUrls.add(url);
          //   console.log(`Scraping: ${url} at depth ${depth}`);

          try {
            return new Promise((resolve, reject) => {
              torRequest.request(url, async (error, response, body) => {
                if (error) {
                  console.error("Error accessing the site:", error);
                  return resolve();
                }

                if (response.statusCode !== 200) {
                  console.error("Non-200 response:", response.statusCode);
                  return resolve();
                }

                const pageContent = body;
                const foundAddresses = pageContent.match(bitcoinRegex) || [];
                if (foundAddresses.length > 0) {
                  const matchedKeywords =
                    analyzeContentForCriminalActivity(pageContent);
                  if (matchedKeywords.length > 0) {
                    console.log(
                      `Suspicious content detected at ${url}. Keywords: ${matchedKeywords.join(
                        ", "
                      )}`
                    );
                    for (const addr of foundAddresses) {
                      try {
                        // Check if a record with this wallet ID already exists
                        const existingRecord = await Crawler.findOne({
                          walletId: addr,
                        });

                        if (!existingRecord) {
                          await Crawler.create({
                            walletId: addr, // Adjust if walletId is not directly the address
                            flag: "Criminal",
                            keyword: matchedKeywords,
                            link: url, // Set the accuracy as per your criteria
                          });
                        }
                      } catch (error) {
                        console.error(
                          `Error saving wallet ID ${addr} to the database:`,
                          error
                        );
                      }
                    }
                  }
                }

                // Extract and queue links
                let match;
                while ((match = urlRegex.exec(pageContent)) !== null) {
                  const link = match[1];
                  if (!visitedUrls.has(link)) {
                    urlQueue.push({ url: link, depth: depth + 1 });
                  }
                }

                resolve();
              });
            });
          } catch (error) {
            console.error("Error in scraping process:", error);
          }
        };

        const processQueue = async () => {
          while (urlQueue.length > 0) {
            const { url, depth } = urlQueue.shift();
            await scrapePage(url, depth).catch((error) => {
              console.error("Error during page scrape:", error);
            });
          }
        };

        const initialUrl =
          "http://pastebin7xxqwrjqae6uvfvvj2ky5eppwyuic3pbxeo6k3ncps4phcid.onion/";
        urlQueue.push({ url: initialUrl, depth: 0 });
        processQueue()
          .then(() => {
            console.log("Scraping completed");
            isEnabled = false;
          })
          .catch((error) => {
            console.error("An error occurred during scraping:", error);
          });
      }

      async function stopCrawler() {
        try {
          if (isEnabled) {
            isEnabled = false;
          }

          parentPort.postMessage({ type: "stop" });
        } catch (e) {
          console.log(e);
        }
      }
    }
  })
  .catch((error) => console.log(error.message));
