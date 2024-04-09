import { State } from "@stackr/sdk/machine";
import { BytesLike, ZeroHash, solidityPackedKeccak256 } from "ethers";
import { MerkleTree } from "merkletreejs";

export type Leaves = {
  address: string;
  balance: number;
  nonce: number;
  allowances: {
    address: string;
    amount: number;
  }[];
}[];

export type UTXO = {
  id: string; // some sort of UTXO Id
  value: number; // amount of this UTXO , which doesn't change once created
  address: string; // Address which the UTXO is tied to currently
  txID: string; // transaction Id that created the UTXO
};

export type transaction = {
  inputUTXOs: string[];
  outputUTXOs: string[];
  timestamp: number;
};

export type UTXOStateType = {
  utxos: UTXO[];
  transactions: transaction[];
};

export class UTXOStateTransport {
  public merkleTreeUTXO: MerkleTree;
  public utxos: UTXO[];
  public transactions: transaction[];

  constructor(leaves: UTXOStateType) {
    this.merkleTreeUTXO = this.createTree(leaves.utxos);
    this.utxos = leaves.utxos;
    this.transactions = leaves.transactions;
  }

  createTree(leaves: UTXO[]) {
    const hashedLeaves = leaves.map((leaf) => {
      return solidityPackedKeccak256(
        ["string", "uint256", "address", "string"],
        [leaf.id, leaf.value, leaf.address, leaf.txID]
      );
    });
    return new MerkleTree(hashedLeaves);
  }
}

export class ERC20 extends State<UTXOStateType, UTXOStateTransport> {
  constructor(state: UTXOStateType) {
    super(state);
  }

  transformer() {
    return {
      wrap: () => {
        return new UTXOStateTransport(this.state);
      },
      unwrap: (wrappedState: UTXOStateTransport) => {
        return {
          utxos: wrappedState.utxos,
          transactions: wrappedState.transactions,
        };
      },
    };
  }

  getRootHash(): BytesLike {
    if (this.state.utxos.length === 0) {
      return ZeroHash;
    }
    return this.transformer().wrap().merkleTreeUTXO.getRoot();
  }
}
