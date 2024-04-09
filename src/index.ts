import express, { Request, Response } from "express";

import { ActionEvents } from "@stackr/sdk";
import { Playground } from "@stackr/sdk/plugins";
import dotenv from "dotenv";
import { schemas } from "./actions.ts";
import { UTXOMachine, mru } from "./utxo.ts";
import { transitions } from "./transitions.ts";

console.log("Starting server...");
dotenv.config();

const utxoMachine = mru.stateMachines.get<UTXOMachine>("utxo");

const app = express();
app.use(express.json());

if (process.env.NODE_ENV === "development") {
  const playground = Playground.init(mru);

  playground.addGetMethod(
    "/custom/hello",
    async (_req: Request, res: Response) => {
      res.send("Hello World");
    }
  );
}

const { actions, chain, events } = mru;

events.subscribe(ActionEvents.SUBMIT, (args) => {
  console.log("Submitted an action", args);
});

events.subscribe(ActionEvents.EXECUTION_STATUS, async (action) => {
  console.log("Submitted an action", action);
});

app.get("/actions/:hash", async (req: Request, res: Response) => {
  const { hash } = req.params;
  const action = await actions.getByHash(hash);
  if (!action) {
    return res.status(404).send({ message: "Action not found" });
  }
  return res.send(action);
});

app.get("/blocks/:hash", async (req: Request, res: Response) => {
  const { hash } = req.params;
  const block = await chain.getBlockByHash(hash);
  if (!block) {
    return res.status(404).send({ message: "Block not found" });
  }
  return res.send(block.data);
});

app.post("/:reducerName", async (req: Request, res: Response) => {
  const { reducerName } = req.params;
  const actionReducer = transitions[reducerName];

  if (!actionReducer) {
    res.status(400).send({ message: "̦̦no reducer for action" });
    return;
  }
  const action = reducerName as keyof typeof schemas;

  const { msgSender, signature, inputs } = req.body;

  const schema = schemas[action];

  try {
    const newAction = schema.actionFrom({ msgSender, signature, inputs });
    const ack = await mru.submitAction(reducerName, newAction);
    res.status(201).send({ ack });
  } catch (e: any) {
    res.status(400).send({ error: e.message });
  }
  return;
});

app.get("/", (_req: Request, res: Response) => {
  return res.send({ state: utxoMachine?.state });
});

app.get("/balance/:address", (_req: Request, res: Response) => {
  const { address } = _req.params;
  const currentState = utxoMachine?.state;
  if (!currentState) {
    res.status(400).send({ message: "No State found" });
    return;
  }
  const totalUTXOsforAddress = currentState.utxos.filter(
    (utxo) => utxo.address == address
  );

  let totalBalance = 0;
  totalUTXOsforAddress.forEach((utxo) => {
    totalBalance += utxo.value;
  });

  return res.send({ address: address, balance: totalBalance });
});

app.get("/utxos/:address", (_req: Request, res: Response) => {
  const { address } = _req.params;
  const currentState = utxoMachine?.state;
  if (!currentState) {
    res.status(400).send({ message: "No State found" });
    return;
  }
  const totalUTXOsforAddress = currentState.utxos.filter(
    (utxo) => utxo.address == address
  );
  return res.send({ address: address, utxos: totalUTXOsforAddress });
});

app.listen(5050, () => {
  console.log("listening on port 5050");
});
