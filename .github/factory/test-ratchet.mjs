#!/usr/bin/env node
// Test-ratchet: de tests van de testagent zijn compleet en onveranderd.
//
//   node test-ratchet.mjs controleer [--basis <commit>] [--aantal <n>] [--map <projectmap>]
//   node test-ratchet.mjs pipeline --basisbranch <ref> [--branch <naam>] [--map <projectmap>]
//   node test-ratchet.mjs tel [--map <projectmap>]
//
// controleer: zonder --basis komen commit en aantal uit het statusbestand van de huidige branch.
//   1. de testmap is gelijk aan de commit van de testagent (commits, staging en werkmap, ook nieuwe bestanden);
//   2. er staat geen skip of only in de testmap;
//   3. het aantal tests (testnamen die met AC-n beginnen) is niet gedaald.
// pipeline: de check in GitHub Actions. Als controleer, plus wat het statusbestand niet kan vervalsen:
//   4. de commit van de testagent ligt op deze branch;
//   5. het aantal tests is niet lager dan op de basisbranch;
//   6. een branch factory/* zonder vastgelegde tests faalt.
//   Zonder statusbestand (een PR van de mens) gelden alleen 2 en 5; wijzigingen in de testmap
//   vragen dan goedkeuring van de code owner.
// tel: drukt het aantal tests af; de orchestrator legt dat vast als tests.aantal.
// Exitcode 0 = in orde, 1 = overtreding (met reden op stderr), 2 = verkeerd gebruik.

import {
	appendFileSync,
	existsSync,
	readFileSync,
	readdirSync,
	statSync,
} from "node:fs";
import path from "node:path";
import {
	git,
	leesProfiel,
	leesStatus,
	projectmap,
	zoekStatus,
} from "./lib.mjs";

// Overslaan of als enige draaien, in de testtools die de factory nu kent.
const SKIP_ONLY =
	/\.(skip|only|todo)\s*\(|\b(xit|xdescribe|xtest|fit|fdescribe)\s*\(|@pytest\.mark\.(skip|skipif|xfail)|pytest\.skip\s*\(|\bt\.Skip(Now|f)?\s*\(|@(Disabled|Ignore)\b|\{\s*skip\s*:\s*true/;
const TESTNAAM = /["'`]AC-\d+\b/g;

function argument(naam) {
	const i = process.argv.indexOf(naam);
	return i === -1 ? null : process.argv[i + 1];
}

function bestandenIn(map) {
	if (!existsSync(map)) return [];
	return readdirSync(map).flatMap((naam) => {
		const pad = path.join(map, naam);
		if (naam === "node_modules") return [];
		return statSync(pad).isDirectory() ? bestandenIn(pad) : [pad];
	});
}

const telIn = (tekst) => (tekst.match(TESTNAAM) || []).length;

function tel(root, testmap) {
	return bestandenIn(path.join(root, testmap)).reduce(
		(som, b) => som + telIn(readFileSync(b, "utf8")),
		0,
	);
}

// Aantal tests in de testmap zoals die in een commit staat.
function telOp(root, testmap, ref) {
	const bestanden = git(
		root,
		"ls-tree",
		"-r",
		"--name-only",
		ref,
		"--",
		testmap,
	)
		.split("\n")
		.filter((b) => b && !b.split("/").includes("node_modules"));
	return bestanden.reduce(
		(som, b) => som + telIn(git(root, "show", `${ref}:${b}`)),
		0,
	);
}

function skipOfOnly(root, testmap) {
	const fouten = [];
	for (const bestand of bestandenIn(path.join(root, testmap))) {
		readFileSync(bestand, "utf8")
			.split("\n")
			.forEach((regel, i) => {
				if (SKIP_ONLY.test(regel)) {
					fouten.push(
						`Skip of only in ${path.relative(root, bestand)}:${i + 1}: ${regel.trim()}`,
					);
				}
			});
	}
	return fouten;
}

function controleer(root, testmap, basis, aantal) {
	const fouten = [];

	const gewijzigd = git(root, "diff", "--name-status", basis, "--", testmap);
	const nieuw = git(
		root,
		"ls-files",
		"--others",
		"--exclude-standard",
		"--",
		testmap,
	);
	if (gewijzigd || nieuw) {
		const lijst = [
			gewijzigd,
			nieuw
				.split("\n")
				.filter(Boolean)
				.map((b) => `?\t${b}`)
				.join("\n"),
		]
			.filter(Boolean)
			.join("\n");
		fouten.push(
			`De testmap ${testmap} wijkt af van de commit van de testagent (${basis.slice(0, 7)}):\n${lijst}\n` +
				`Zet hem terug met: git checkout ${basis.slice(0, 7)} -- ${testmap} (en verwijder nieuwe bestanden). ` +
				"Klopt een test niet, meld dan een testconflict.",
		);
	}

	fouten.push(...skipOfOnly(root, testmap));

	const nu = tel(root, testmap);
	if (nu < aantal) {
		fouten.push(`Het aantal tests is gedaald: ${nu}, was ${aantal}.`);
	}
	return fouten;
}

function pipeline(root, testmap, basisbranch, branch) {
	const fouten = [];
	const splitsing = git(root, "merge-base", basisbranch, "HEAD");
	const status = zoekStatus(root, branch);
	const { commit, aantal } = status
		? leesStatus(status)
		: { commit: null, aantal: 0 };

	if (commit) {
		let opBranch = true;
		try {
			git(root, "merge-base", "--is-ancestor", commit, "HEAD");
		} catch {
			opBranch = false;
		}
		if (opBranch) {
			fouten.push(...controleer(root, testmap, commit, aantal));
		} else {
			fouten.push(
				`De commit van de testagent (${commit.slice(0, 7)}) uit ${path.relative(root, status)} ligt niet op deze branch.`,
			);
		}
	} else {
		if (branch?.startsWith("factory/")) {
			fouten.push(
				`Branch ${branch} is van de factory, maar heeft geen statusbestand met de commit van de testagent.`,
			);
		}
		fouten.push(...skipOfOnly(root, testmap));
	}

	const voor = telOp(root, testmap, splitsing);
	const nu = tel(root, testmap);
	if (nu < voor) {
		fouten.push(
			`Minder tests dan op ${basisbranch}: ${nu}, daar ${voor}. Tests verwijderen kan alleen met de mens.`,
		);
	}

	// Voor de mens bij poort 3: wat er in de testmap is veranderd ten opzichte van de basisbranch.
	const gewijzigd = git(
		root,
		"diff",
		"--name-status",
		splitsing,
		"HEAD",
		"--",
		testmap,
	);
	const samenvatting = [
		`### Test-ratchet`,
		"",
		`- Tests: ${nu} (op ${basisbranch}: ${voor})`,
		commit
			? `- Commit van de testagent: \`${commit.slice(0, 7)}\``
			: "- Geen statusbestand: geen PR van de factory",
		`- Gewijzigd in \`${testmap}\` sinds ${basisbranch}: ${gewijzigd ? "" : "niets"}`,
		...(gewijzigd ? ["", "```text", gewijzigd, "```"] : []),
		...(fouten.length
			? ["", "**Faalt:**", ...fouten.map((f) => `- ${f}`)]
			: []),
		"",
	].join("\n");
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, samenvatting);
	}
	return { fouten, nu, voor };
}

function stop(fouten) {
	if (fouten.length) {
		console.error(`Test-ratchet faalt:\n- ${fouten.join("\n- ")}`);
		process.exit(1);
	}
}

function hoofd() {
	const opdracht = process.argv[2];
	const root = projectmap(argument("--map") || process.cwd());
	const profiel = leesProfiel(root);
	if (!profiel) {
		console.error("Geen .factory/profiel.yaml: niets te controleren.");
		process.exit(0);
	}
	if (!profiel.testmap) {
		console.error("Het profiel noemt geen testmap.");
		process.exit(2);
	}

	if (opdracht === "tel") {
		console.log(tel(root, profiel.testmap));
		return;
	}
	if (opdracht === "pipeline") {
		const basisbranch = argument("--basisbranch");
		if (!basisbranch) {
			console.error("pipeline vraagt --basisbranch, bijv. origin/main.");
			process.exit(2);
		}
		const { fouten, nu, voor } = pipeline(
			root,
			profiel.testmap,
			basisbranch,
			argument("--branch"),
		);
		stop(fouten);
		console.error(
			`Test-ratchet in orde: ${nu} tests in ${profiel.testmap} (op ${basisbranch}: ${voor}).`,
		);
		return;
	}
	if (opdracht !== "controleer") {
		console.error(
			"Gebruik: test-ratchet.mjs controleer|pipeline|tel [--basis <commit>] [--aantal <n>] [--basisbranch <ref>] [--branch <naam>] [--map <projectmap>]",
		);
		process.exit(2);
	}

	let basis = argument("--basis");
	let aantal = Number(argument("--aantal") || 0);
	if (!basis) {
		const status = zoekStatus(root);
		if (!status) {
			console.error(
				"Geen statusbestand voor deze branch: geen tests om te bewaken.",
			);
			process.exit(0);
		}
		({ commit: basis, aantal } = leesStatus(status));
		if (!basis) {
			console.error(
				"De testagent heeft nog geen tests vastgelegd: niets te bewaken.",
			);
			process.exit(0);
		}
	}

	stop(controleer(root, profiel.testmap, basis, aantal));
	console.error(
		`Test-ratchet in orde: ${profiel.testmap} gelijk aan ${basis.slice(0, 7)}.`,
	);
}

hoofd();
