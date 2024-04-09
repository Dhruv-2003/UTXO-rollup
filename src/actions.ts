import { ActionSchema, SolidityType } from "@stackr/sdk";

// 1. mint a new UTXO , origination of the first UTXO , similar to like minting of BTC in case of mining
export const createUTXO = new ActionSchema("createUTXO", {
  address: SolidityType.ADDRESS,
  amount: SolidityType.UINT,
  timestamp: SolidityType.UINT,
});

// 2. Perform a Tx , which would take in the amount to send from 1 account to another,
export const transfer = new ActionSchema("transfer", {
  to: SolidityType.ADDRESS,
  from: SolidityType.ADDRESS,
  amount: SolidityType.UINT,
  timestamp: SolidityType.UINT,
});

export const schemas = {
  create: createUTXO,
  transfer: transfer,
};
