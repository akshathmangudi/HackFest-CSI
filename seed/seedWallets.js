const mongoose = require("mongoose");
const Node = require("../models/Node");

const enumWithWeightages = [
  { value: "Official", weightage: 0.2 },
  { value: "Normal", weightage: 0.7 },
  { value: "Criminal", weightage: 0.1 },
];

function randomizeEnum(enumArray) {
  const randomValue = Math.random();

  let cumulativeWeightage = 0;
  let selectedEnum = null;

  for (const { value, weightage } of enumArray) {
    cumulativeWeightage += weightage;
    if (randomValue <= cumulativeWeightage) {
      selectedEnum = value;
      break;
    }
  }

  return selectedEnum;
}

const seedNodes = async () => {
  var counter = 0;
  for (let i = 0; i <= 50; i++) {
    try {
      const getEnum = randomizeEnum(enumWithWeightages);
      const getRating = () => {
        if (getEnum == "Official") return 10.0;
        else if (getEnum == "Normal")
          return (Math.random() * (9.5 - 4.5) + 4.5).toFixed(1);
        else return 0.0;
      };
      const node = await Node.create({
        flag: getEnum,
        amount: Math.floor(Math.random() * 100000) + 1,
        x: 0,
        y: 0,
        rating: getRating(),
        information: {},
      });
      console.log(counter, ": ", node);
      counter++;
    } catch (e) {
      console.log(e.message);
    }
  }
};

mongoose
  .connect("mongodb://localhost/Crypto-Sentinel", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    seedNodes();
  })
  .catch((error) => console.log(error.message));

console.log("done");
