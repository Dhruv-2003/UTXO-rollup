import inquirer from "inquirer";
import { ActionSchema, AllowedInputTypes, MicroRollup } from "@stackr/sdk";
import { Wallet } from "ethers";
import { stackrConfig } from "./stackr.config.ts";
import { createUTXO, transfer } from "./src/actions.ts";
import { utxoStateMachine } from "./src/machines.stackr.ts";

import {
  Action,
  BalanceResponse,
  CreateAmountResponse,
  CreateInput,
  TransferArgResponse,
  TransferInput,
  UTXOsResponse,
} from "./cli-types.ts";

import dotenv from "dotenv";
import { Playground } from "@stackr/sdk/plugins";

dotenv.config();

import { UTXOMachine, mru } from "./src/utxo.ts";

Playground.init(mru);

const utxoMachine = mru.stateMachines.get<UTXOMachine>("utxo");

const accounts = {
  "Account 1": new Wallet(process.env.FIRST_KEY!),
  "Account 2": new Wallet(process.env.SECOND_KEY!),
};
let selectedWallet: Wallet;

const signMessage = async (
  wallet: Wallet,
  schema: ActionSchema,
  payload: AllowedInputTypes
) => {
  const signature = await wallet.signTypedData(
    schema.domain,
    schema.EIP712TypedData.types,
    payload
  );
  return signature;
};

const actions = {
  checkBalance: async (): Promise<void> => {
    const currentState = utxoMachine?.state;
    if (!currentState) {
      console.log("No State found");
      return;
    }
    const totalUTXOsforAddress = currentState.utxos.filter(
      (utxo) => utxo.address == selectedWallet.address
    );

    let totalBalance = 0;
    totalUTXOsforAddress.forEach((utxo) => {
      totalBalance += utxo.value;
    });
    console.log(totalBalance);
  },
  checkUTXO: async (): Promise<void> => {
    const currentState = utxoMachine?.state;
    if (!currentState) {
      console.log("No State found");
      return;
    }
    const totalUTXOsforAddress = currentState.utxos.filter(
      (utxo) => utxo.address == selectedWallet.address
    );
    console.log(totalUTXOsforAddress);
  },
  create: async (amount: number): Promise<void> => {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const inputs: CreateInput = {
      address: selectedWallet.address,
      amount: amount,
      timestamp: timestamp,
    };
    const signature = await signMessage(selectedWallet, createUTXO, inputs);
    const createAction = createUTXO.actionFrom({
      inputs,
      signature,
      msgSender: selectedWallet.address,
    });
    const ack = await mru.submitAction("create", createAction);
    console.log("Action has been submitted.");
    console.log(ack);
  },
  transfer: async (address: string, amount: number): Promise<void> => {
    const timestamp = Math.round(new Date().getTime() / 1000);

    // console.log(address, amount);
    const inputs: TransferInput = {
      to: address,
      from: selectedWallet.address,
      amount: amount,
      timestamp: timestamp,
    };
    const signature = await signMessage(selectedWallet, transfer, inputs);
    const withdrawAction = transfer.actionFrom({
      inputs,
      signature,
      msgSender: selectedWallet.address,
    });
    const ack = await mru.submitAction("transfer", withdrawAction);
    console.log("Action has been submitted.");
    console.log(ack);
  },
};

const askAccount = async (): Promise<"Account 1" | "Account 2"> => {
  const response = await inquirer.prompt([
    {
      type: "list",
      name: "account",
      message: "Choose an account:",
      choices: ["Account 1", "Account 2"],
    },
  ]);
  return response.account;
};

const askAction = async (): Promise<any> => {
  return inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Choose an action:",
      choices: [
        "Check balance",
        "Check utxos",
        "create",
        "transfer",
        "Switch account",
        "Exit",
      ],
    },
  ]);
};

const askAmount = async (
  action: Action
): Promise<CreateAmountResponse | TransferArgResponse | {}> => {
  switch (action) {
    case "transfer":
      return inquirer.prompt<TransferArgResponse>([
        {
          type: "input",
          name: "address",
          message: "Enter the address to transfer to:",
        },
        {
          type: "input",
          name: "amount",
          message: "Enter the amount you want to transfer:",
          validate: (value: string): boolean | string => {
            const valid = !isNaN(parseFloat(value)) && parseFloat(value) > 0;
            return valid || "Please enter a positive number";
          },
          filter: (value: string): number => parseFloat(value),
        },
      ]);
    case "create":
      return inquirer.prompt<CreateAmountResponse>([
        {
          type: "input",
          name: "amount",
          message: "Enter the amount of tokens to mint:",
          validate: (value: string): boolean | string => {
            const valid = !isNaN(parseFloat(value)) && parseFloat(value) > 0;
            return valid || "Please enter a positive number";
          },
          filter: (value: string): number => parseFloat(value),
        },
      ]);
    default:
      return Promise.resolve({});
  }
};

const main = async (): Promise<void> => {
  let exit = false;
  let selectedAccount: string = ""; // To store the selected account

  while (!exit) {
    if (!selectedAccount) {
      selectedAccount = await askAccount();
      if (selectedAccount === "Account 1" || selectedAccount === "Account 2") {
        selectedWallet = accounts[selectedAccount];
        console.log(
          `You have selected: ${selectedWallet.address.slice(0, 12)}...`
        );
      }
    }

    const actionResponse = await askAction();
    const action: Action = actionResponse.action as Action;

    if (action === "Exit") {
      exit = true;
    } else if (action === "Switch account") {
      selectedAccount = ""; // Reset selected account so the user can choose again
    } else {
      const response = await askAmount(action);
      if (action === "Check balance") {
        await actions.checkBalance();
      } else if (action === "Check utxos") {
        await actions.checkUTXO();
      } else if (action === "create") {
        const { amount } = response as CreateAmountResponse;
        await actions.create(amount);
      } else if (action === "transfer") {
        const { address, amount } = response as TransferArgResponse;
        // console.log(address, amount);
        await actions.transfer(address, amount);
      }
    }
  }
  console.log("Exiting app...");
};

main();
