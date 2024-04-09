import { Wallet } from "ethers";
import { schemas } from "./src/actions";
import { stackrConfig } from "./stackr.config";

const { domain } = stackrConfig;

type ActionName = keyof typeof schemas;

const walletOne = new Wallet(
  "0x0123456789012345678901234567890123456789012345678901234567890123"
);
const walletTwo = new Wallet(
  "0x0123456789012345678901234567890123456789012345678901234567890124"
);

const getBody = async (
  actionName: ActionName,
  wallet: Wallet,
  otherWallet: Wallet
) => {
  const walletAddress = wallet.address;
  const timestamp = Math.round(new Date().getTime() / 1000);
  const payload =
    actionName === "create"
      ? {
          address: walletAddress,
          amount: 5000,
          timestamp: timestamp,
        }
      : {
          to: otherWallet.address,
          from: walletAddress,
          amount: 13000,
          timestamp: timestamp,
        };

  const signature = await wallet.signTypedData(
    domain,
    schemas[actionName].EIP712TypedData.types,
    payload
  );

  const body = JSON.stringify({
    msgSender: walletAddress,
    signature,
    inputs: payload,
  });

  return body;
};

const run = async (
  actionName: ActionName,
  wallet: Wallet,
  otherWallet: Wallet
) => {
  const start = Date.now();
  const body = await getBody(actionName, wallet, otherWallet);

  const res = await fetch(`http://localhost:5050/${actionName}`, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
    },
  });

  const end = Date.now();
  const json = await res.json();

  const elapsedSeconds = (end - start) / 1000;
  const requestsPerSecond = 1 / elapsedSeconds;

  console.info(`Requests per second: ${requestsPerSecond.toFixed(2)}`);
  console.log(`Response: ${JSON.stringify(json, null, 2)}`);
};

const main = async (actionName: string, walletName: string) => {
  if (!Object.keys(schemas).includes(actionName)) {
    throw new Error(
      `Action ${actionName} not found. Available actions: ${Object.keys(
        schemas
      ).join(", ")}`
    );
  }

  const wallet = walletName === "alice" ? walletOne : walletTwo;
  const otherWallet = walletName === "alice" ? walletTwo : walletOne;

  await run(actionName as ActionName, wallet, otherWallet);
};

main(process.argv[2], process.argv[3]);
