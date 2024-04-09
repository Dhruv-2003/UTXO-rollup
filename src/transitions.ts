import { Transitions, STF } from "@stackr/sdk/machine";
import {
  UTXORollup,
  UTXOStateTransport as StateWrapper,
  UTXO,
  transaction,
} from "./state";
import { ZeroAddress } from "ethers";

// --------- Utilities ---------
const findIndexOfUTXO = (state: StateWrapper, id: number) => {
  return state.utxos.findIndex((utxo) => utxo.id === id);
};

const findNewUTXOId = (state: StateWrapper): number => {
  return state.utxos.length + 1;
};

const findUTXOforAddress = (state: StateWrapper, address: string): UTXO[] => {
  return state.utxos.filter((utxo) => utxo.address == address);
};

const findNewTXId = (state: StateWrapper): number => {
  return state.transactions.length + 1;
};

type CreateInput = {
  address: string;
  amount: number;
  timestamp: number;
};

type TransferInput = {
  from: string;
  to: string;
  amount: number;
  timestamp: number;
};

// --------- State Transition Handlers ---------
const create: STF<UTXORollup, CreateInput> = {
  handler: ({ inputs, state, msgSender }) => {
    const { address, amount, timestamp } = inputs;

    if (state.owner != msgSender && state.owner != address) {
      throw new Error("Only Owner Can Perform Creation");
    }

    const newUTXOId = findNewUTXOId(state);
    const newTxId = findNewTXId(state);

    const newUTXO: UTXO = {
      id: newUTXOId,
      address: address,
      value: amount,
      txID: newTxId,
    };

    const newTx: transaction = {
      id: newTxId,
      inputUTXOs: [],
      outputUTXOs: [newUTXOId],
      timestamp: timestamp,
    };

    state.utxos.push(newUTXO);
    state.transactions.push(newTx);
    return state;
  },
};

const transfer: STF<UTXORollup, TransferInput> = {
  handler: ({ inputs, state, msgSender }) => {
    const { to, from, amount, timestamp } = inputs;
    // check if the sender is the owner of the account
    if (from !== msgSender) {
      throw new Error("Unauthorized");
    }

    const fromUserUTXOs = findUTXOforAddress(state, from);

    // calculate total Balance for this user
    let totalBalanceBefore = 0;
    fromUserUTXOs.forEach((utxo) => {
      totalBalanceBefore += utxo.value;
    });

    // check if the sender has enough balance
    if (totalBalanceBefore < inputs.amount) {
      throw new Error("Insufficient funds");
    }

    const newTxId = findNewTXId(state);

    // find the input UTXOs
    // For now , just select the first n UTXOs that totals upto an amount bigger or equal to the amount of the transaction needed
    let inputUTXOs: number[] = [];
    let requiredInputUTXTotal = 0;

    for (
      let i = 0;
      i < fromUserUTXOs.length && requiredInputUTXTotal < amount;
      i++
    ) {
      inputUTXOs.push(fromUserUTXOs[i].id);
    }

    // update the UTXO state for the inputs one
    inputUTXOs.forEach((inputUTXO) => {
      const utxoIndex = findIndexOfUTXO(state, inputUTXO);
      state.utxos[utxoIndex].address = ZeroAddress;
    });

    // find the output UTXOs
    let outputUTXOs: number[] = [];

    // create the new Output UTXOs
    const newUTXO: UTXO = {
      id: findNewUTXOId(state),
      address: to,
      value: amount,
      txID: newTxId,
    };
    state.utxos.push(newUTXO);

    outputUTXOs.push(newUTXO.id);

    if (requiredInputUTXTotal > amount) {
      const newUTXO: UTXO = {
        id: findNewUTXOId(state),
        address: from,
        value: requiredInputUTXTotal - amount,
        txID: newTxId,
      };
      state.utxos.push(newUTXO);
      outputUTXOs.push(newUTXO.id);
    }

    // finally build the transaction
    const newTx: transaction = {
      id: newTxId,
      inputUTXOs: inputUTXOs,
      outputUTXOs: outputUTXOs,
      timestamp: timestamp,
    };

    state.transactions.push(newTx);

    // check if the new updated state has indeed transferred the said amount

    const fromUserAfterUTXOs = findUTXOforAddress(state, from);

    // calculate total Balance for this user
    let totalBalanceAfter = 0;
    fromUserAfterUTXOs.forEach((utxo) => {
      totalBalanceAfter += utxo.value;
    });

    // check if the sender has reduced balance for sending the money
    if (totalBalanceBefore - totalBalanceAfter == inputs.amount) {
      throw new Error("Invalid Balance");
    }

    return state;
  },
};

export const transitions: Transitions<UTXORollup> = {
  create,
  transfer,
};
