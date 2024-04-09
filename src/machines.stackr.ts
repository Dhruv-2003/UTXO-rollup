import { StateMachine } from "@stackr/sdk/machine";
import genesisState from "../genesis-state.json";
import { transitions } from "./transitions";
import { UTXORollup } from "./state";

const STATE_MACHINES = {
  UTXORollup: "utxo",
};

const utxoStateMachine = new StateMachine({
  id: STATE_MACHINES.UTXORollup,
  stateClass: UTXORollup,
  initialState: genesisState.state,
  on: transitions,
});

export { STATE_MACHINES, utxoStateMachine };
