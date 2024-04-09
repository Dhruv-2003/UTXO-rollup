import { State } from "@stackr/sdk/machine";
import { BytesLike, ZeroHash, solidityPackedKeccak256 } from "ethers";
import { MerkleTree } from "merkletreejs";

export type UTXO = {
  id: number; // some sort of UTXO Id
  value: number; // amount of this UTXO , which doesn't change once created
  address: string; // Address which the UTXO is tied to currently
  txID: number; // transaction Id that created the UTXO
};

export type transaction = {
  id: number;
  inputUTXOs: number[];
  outputUTXOs: number[];
  timestamp: number;
};

export type UTXOStateType = {
  utxos: UTXO[];
  transactions: transaction[];
  owner: string;
};

export class UTXOStateTransport {
  public merkleTreeUTXO: MerkleTree;
  public utxos: UTXO[];
  public transactions: transaction[];
  public owner: string;

  constructor(leaves: UTXOStateType) {
    this.merkleTreeUTXO = this.createTree(leaves.utxos);
    this.utxos = leaves.utxos;
    this.transactions = leaves.transactions;
    this.owner = leaves.owner;
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

export class UTXORollup extends State<UTXOStateType, UTXOStateTransport> {
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
          owner: wrappedState.owner,
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
