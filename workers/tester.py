import bitcoin from "bitcoinjs-lib";
import assert from "assert";
import ecpair from "ecpair";
import axios from "axios";

const { ECPair } = ecpair;

// Set up for testnet
const network = bitcoin.networks.bitcoin;

// Replace with your actual private keys
const privateKeySending =
  "L2Hz1C4ko9yS7hHWNHN4RiGGSqVXU9BAaPEV1RBq1v6cpokL29ba";
const privateKeyReceiving =
  "KwJaQSJpqEjrWtqxpaJXHNput12W7p46s4eBzX1bQuWWytZDd6pq";

// Create key pairs
const keyPairSending = ECPair.fromWIF(privateKeySending, network);
const keyPairReceiving = ECPair.fromWIF(privateKeyReceiving, network);

// Create P2WPKH (Pay to Witness Public Key Hash) address from receiving key
const sendingAddress = bitcoin.payments.p2wpkh({
  pubkey: keyPairSending.publicKey,
  network,
}).address;

// Function to fetch UTXOs
async function fetchUtxos(address) {
  const url = `https://api.blockcypher.com/v1/btc/test3/addrs/${address}?unspentOnly=true`;
  try {
    const response = await axios.get(url);
    return response.data.txrefs.map((txref) => ({
      hash: txref.tx_hash,
      index: txref.tx_output_n,
      value: txref.value,
    }));
  } catch (error) {
    console.error("Error fetching UTXOs:", error);
    return [];
  }
}

// Main function to create transaction
async function createTransaction() {
  const utxos = await fetchUtxos(sendingAddress);

  if (utxos.length === 0) {
    console.log("No UTXOs found for address:", sendingAddress);
    return;
  }

  // Outputs - Modify as needed
  const outputs = [
    {
      address: bitcoin.payments.p2wpkh({
        pubkey: keyPairReceiving.publicKey,
        network,
      }).address,
      value: satoshis(0.00031698), // Set the desired output value
    },
  ];

  // Create a new PSBT
  const psbt = new bitcoin.Psbt({ network });

  // Add inputs and outputs
  utxos.forEach((input) =>
    psbt.addInput({
      hash: input.hash,
      index: input.index,
      witnessUtxo: {
        script: bitcoin.payments.p2wpkh({
          pubkey: keyPairSending.publicKey,
          network,
        }).output,
        value: input.value,
      },
    })
  );

  outputs.forEach((output) =>
    psbt.addOutput({
      address: output.address,
      value: output.value,
    })
  );

  // Sign the inputs
  utxos.forEach((_, index) => psbt.signInput(index, keyPairSending));

  // Finalize the PSBT and extract the transaction
  psbt.finalizeAllInputs();
  const tx = psbt.extractTransaction();

  // Serialize the transaction
  const rawTx = tx.toHex();

  console.log("raw tx below this line");
  console.log(rawTx);
  console.log("raw tx above this line");
}

// Helper function to convert BTC to Satoshis
function satoshis(btc) {
  return Math.round(btc * 1e8);
}

createTransaction().catch(console.error);
