import torRequest from "tor-request";
import natural from "natural";

console.log("Script started");

const tokenizer = new natural.WordTokenizer();
const suspiciousKeywords = ["porn", "drugs", "document", "passport", "hitman"]; // Example keywords

const bitcoinRegex = /\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\b/g;
const urlRegex = /href=["']?(https?:\/\/[^'" >]+)["']?/gi;

let visitedUrls = new Set();
let urlQueue = [];

const MAX_DEPTH = 1;

torRequest.setTorAddress("127.0.0.1", 9150);

const analyzeContentForCriminalActivity = (content) => {
  const tokens = tokenizer.tokenize(content.toLowerCase());
  return suspiciousKeywords.filter((keyword) => tokens.includes(keyword));
};

const scrapePage = async (url, depth) => {
  if (depth > MAX_DEPTH) {
    return;
  }

  if (visitedUrls.has(url)) {
    return;
  }
  visitedUrls.add(url);
  console.log(`Scraping: ${url} at depth ${depth}`);

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
            foundAddresses.forEach(async (addr) => {
              new Crawler.create({
                walletId: addr, // Assuming addr is the ObjectId of the wallet, otherwise adjust as necessary
                flag: "Criminal",
                keyword: matchedKeywords,
                link: url,
              });
            });
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
        // Delay to prevent rate limiting
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
    console.log("Addresses found:", addresses);
  })
  .catch((error) => {
    console.error("An error occurred during scraping:", error);
  });
