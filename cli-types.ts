export type Action =
  | "Check balance"
  | "Check utxos"
  | "create"
  | "transfer"
  | "Switch account"
  | "Exit";

export interface BalanceResponse {
  address: string;
  balance: number;
}

export interface CreateAmountResponse {
  amount: number;
}

export interface TransferArgResponse {
  address: string;
  amount: number;
}

export type UTXO = {
  id: number; // some sort of UTXO Id
  value: number; // amount of this UTXO , which doesn't change once created
  address: string; // Address which the UTXO is tied to currently
  txID: number; // transaction Id that created the UTXO
};

export interface UTXOsResponse {
  utxos: UTXO[];
}

export type CreateInput = {
  address: string;
  amount: number;
  timestamp: number;
};

export type TransferInput = {
  from: string;
  to: string;
  amount: number;
  timestamp: number;
};
