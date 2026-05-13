// Programmatic migration runner. Avoids the typeorm CLI's path/ESM quirks in
// an npm-workspaces + tsx setup.

import "reflect-metadata";
import { AppDataSource } from "../data-source.js";

const cmd = process.argv[2] ?? "run";

async function main() {
  await AppDataSource.initialize();
  try {
    if (cmd === "run") {
      const applied = await AppDataSource.runMigrations({
        transaction: "each",
      });
      if (applied.length === 0) {
        console.log("No pending migrations.");
      } else {
        for (const m of applied) console.log(`Applied: ${m.name}`);
      }
    } else if (cmd === "revert") {
      await AppDataSource.undoLastMigration({ transaction: "each" });
      console.log("Reverted last migration.");
    } else if (cmd === "show") {
      const pending = await AppDataSource.showMigrations();
      console.log(
        pending ? "Pending migrations exist." : "Database is up to date.",
      );
    } else {
      console.error(`Unknown command: ${cmd}. Use run|revert|show.`);
      process.exit(2);
    }
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
