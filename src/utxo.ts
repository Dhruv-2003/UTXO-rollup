import { MicroRollup } from "@stackr/sdk";
import { stackrConfig } from "../stackr.config.ts";

import { schemas } from "./actions.ts";
import { utxoStateMachine } from "./machines.stackr.ts";

type UTXOMachine = typeof utxoStateMachine;

const mru = await MicroRollup({
  config: stackrConfig,
  actionSchemas: [...Object.values(schemas)],
  stateMachines: [utxoStateMachine],
  isSandbox: true,
});

await mru.init();

export { UTXOMachine, mru };
