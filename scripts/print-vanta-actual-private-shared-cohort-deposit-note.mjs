import { createVantaActualPrivateSharedCohortDepositNotePacket } from "../src/mainnet/actualPrivateSharedCohortDepositNote.mjs";

const args = new Set(process.argv.slice(2));

const packet = await createVantaActualPrivateSharedCohortDepositNotePacket({
  generateSecret: args.has("--generate-secret"),
  record: args.has("--record"),
  writePrivateNote: args.has("--write-private-note"),
});

console.log(JSON.stringify(packet, null, 2));
