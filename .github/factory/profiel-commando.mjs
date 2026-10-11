#!/usr/bin/env node
// Drukt een commando uit het projectprofiel af, voor de pipeline.
//
//   node profiel-commando.mjs <sleutel> [--map <projectmap>]
//
// Sleutels: de namen onder `commandos:` in .factory/profiel.yaml (bijv. bouwen, testen).
// Exitcode 0 met het commando op stdout; leeg als het profiel het commando leeg laat.
// Exitcode 2 zonder profiel of bij een onbekende sleutel.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { projectmap, scalar } from "./lib.mjs";

const sleutel = process.argv[2];
const i = process.argv.indexOf("--map");
const root =
	i === -1 ? projectmap(process.cwd()) : path.resolve(process.argv[i + 1]);
const bestand = path.join(root, ".factory", "profiel.yaml");

if (!sleutel || !existsSync(bestand)) {
	console.error(
		sleutel
			? "Geen .factory/profiel.yaml in dit project."
			: "Gebruik: profiel-commando.mjs <sleutel> [--map <projectmap>]",
	);
	process.exit(2);
}

const tekst = readFileSync(bestand, "utf8");
if (
	!new RegExp(`^\\s+${sleutel}:`, "m").test(
		tekst.split(/^commandos:/m)[1] ?? "",
	)
) {
	console.error(`Het profiel heeft geen commando '${sleutel}'.`);
	process.exit(2);
}
const commando = scalar(tekst, sleutel, "commandos") ?? "";
console.log(commando.startsWith("<") ? "" : commando);
