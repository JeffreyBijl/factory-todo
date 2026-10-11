// Gedeelde hulpfuncties voor de hooks en de test-ratchet.
// Geen dependencies: de scripts draaien in elke devcontainer en later in de pipeline.
// De YAML-lezers kennen alleen de eenvoudige vormen uit de templates van de factory.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";

export const PLUGIN = "software-factory";
export const REVIEWERS = [
	"security",
	"ui",
	"ux",
	"backend",
	"database",
	"evaluator",
];

// Paden die altijd verboden terrein zijn, ook als het profiel ze vergeet.
const ALTIJD_VERBODEN = [".github/", ".devcontainer/", ".factory/profiel.yaml"];

export function git(cwd, ...args) {
	return execFileSync("git", ["-C", cwd, ...args], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

export function projectmap(cwd) {
	try {
		return git(cwd, "rev-parse", "--show-toplevel");
	} catch {
		return cwd;
	}
}

function zonderAanhalingstekens(waarde) {
	const w = waarde.replace(/\s+#.*$/, "").trim();
	const m = w.match(/^"(.*)"$/) || w.match(/^'(.*)'$/);
	return m ? m[1] : w;
}

// Waarde van een sleutel op het hoogste niveau, of binnen een blok (bijv. "tests").
export function scalar(tekst, sleutel, blok = null) {
	const regels = tekst.split("\n");
	let inBlok = blok === null;
	for (const regel of regels) {
		if (blok !== null) {
			if (/^\S/.test(regel)) inBlok = regel.startsWith(`${blok}:`);
			if (!inBlok) continue;
		}
		const inspring = blok === null ? "" : "\\s+";
		const m = regel.match(new RegExp(`^${inspring}${sleutel}:\\s*(.*)$`));
		if (m) {
			const waarde = zonderAanhalingstekens(m[1]);
			return waarde === "" || waarde === "null" || waarde === "~"
				? null
				: waarde;
		}
	}
	return null;
}

// Lijst met strings onder een sleutel op het hoogste niveau.
export function lijst(tekst, sleutel) {
	const regels = tekst.split("\n");
	const start = regels.findIndex((r) => r.startsWith(`${sleutel}:`));
	if (start === -1) return [];
	const items = [];
	for (const regel of regels.slice(start + 1)) {
		if (/^\S/.test(regel)) break;
		const m = regel.match(/^\s+-\s+(.+)$/);
		if (m) items.push(zonderAanhalingstekens(m[1]));
	}
	return items;
}

export function leesProfiel(root) {
	const bestand = path.join(root, ".factory", "profiel.yaml");
	if (!existsSync(bestand)) return null;
	const tekst = readFileSync(bestand, "utf8");
	const testmap = scalar(tekst, "testmap");
	const verboden = lijst(tekst, "verboden_terrein").filter(
		(p) => !p.startsWith("<"),
	);
	return {
		testmap: testmap ? mapVorm(testmap) : null,
		verboden: [...new Set([...ALTIJD_VERBODEN, ...verboden])],
	};
}

function mapVorm(p) {
	return p.endsWith("/") ? p : `${p}/`;
}

// Het statusbestand van de slice op de huidige branch, of op de opgegeven branch
// (in de pipeline staat HEAD los van een branch).
export function zoekStatus(root, branch = null) {
	const map = path.join(root, ".factory", "status");
	if (!existsSync(map)) return null;
	if (!branch) {
		try {
			branch = git(root, "rev-parse", "--abbrev-ref", "HEAD");
		} catch {
			return null;
		}
	}
	for (const naam of readdirSync(map).filter((n) => n.endsWith(".yaml"))) {
		const bestand = path.join(map, naam);
		if (scalar(readFileSync(bestand, "utf8"), "branch") === branch)
			return bestand;
	}
	return null;
}

export function leesStatus(bestand) {
	const tekst = readFileSync(bestand, "utf8");
	const aantal = scalar(tekst, "aantal", "tests");
	return {
		commit: scalar(tekst, "commit", "tests"),
		aantal: aantal === null ? 0 : Number(aantal),
	};
}

// Pad relatief aan de projectmap, of null als het erbuiten ligt.
// Symlinks worden opgelost, zodat /tmp en /private/tmp (macOS) hetzelfde zijn.
export function relatief(root, bestand, cwd = root) {
	const absoluut = echtPad(path.resolve(cwd, bestand));
	const rel = path.relative(echtPad(root), absoluut);
	if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return null;
	return rel.split(path.sep).join("/");
}

// Echt pad van het bestand, ook als het nog niet bestaat: via de dichtstbijzijnde bestaande map.
function echtPad(pad) {
	if (existsSync(pad)) return realpathSync(pad);
	const ouder = path.dirname(pad);
	return ouder === pad ? pad : path.join(echtPad(ouder), path.basename(pad));
}

export function valtOnder(rel, patroon) {
	const p = patroon.replace(/^\.\//, "");
	if (p.endsWith("/")) return rel === p.slice(0, -1) || rel.startsWith(p);
	if (p.includes("*")) {
		const regex = new RegExp(
			`^${p
				.replace(/[.+^${}()|[\]\\]/g, "\\$&")
				.replace(/\*\*/g, ".*")
				.replace(/(?<!\.)\*/g, "[^/]*")}$`,
		);
		return regex.test(rel);
	}
	return rel === p || rel.startsWith(`${p}/`);
}

// Rol zonder pluginvoorvoegsel, of null als de hook niet in een factory-agent draait.
export function rolUit(invoer) {
	const type = invoer.agent_type || "";
	return type.startsWith(`${PLUGIN}:`) ? type.slice(PLUGIN.length + 1) : null;
}

export async function leesInvoer() {
	let tekst = "";
	for await (const stuk of process.stdin) tekst += stuk;
	return JSON.parse(tekst || "{}");
}

export function weiger(reden) {
	process.stdout.write(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
				permissionDecisionReason: reden,
			},
		}),
	);
	process.exit(0);
}
