import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export interface Todo {
	id: number;
	titel: string;
	gedaan: boolean;
}

interface TodoRij {
	id: number;
	titel: string;
	gedaan: number;
}

const naarTodo = (rij: TodoRij): Todo => ({
	id: rij.id,
	titel: rij.titel,
	gedaan: rij.gedaan === 1,
});

// Opslag in SQLite (ingebouwd in Node). Pad via DB_PATH; ':memory:' voor tests.
export function maakStore(pad: string = process.env['DB_PATH'] ?? 'data/todo.db') {
	if (pad !== ':memory:') mkdirSync(dirname(pad), { recursive: true });
	const db = new DatabaseSync(pad);
	db.exec(`
		CREATE TABLE IF NOT EXISTS todos (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			titel TEXT NOT NULL,
			gedaan INTEGER NOT NULL DEFAULT 0,
			aangemaakt_op TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

	const alles = db.prepare('SELECT id, titel, gedaan FROM todos ORDER BY id');
	const een = db.prepare('SELECT id, titel, gedaan FROM todos WHERE id = ?');
	const invoegen = db.prepare('INSERT INTO todos (titel) VALUES (?)');
	const zetGedaan = db.prepare('UPDATE todos SET gedaan = ? WHERE id = ?');
	const verwijderen = db.prepare('DELETE FROM todos WHERE id = ?');

	return {
		lijst(): Todo[] {
			return (alles.all() as unknown as TodoRij[]).map(naarTodo);
		},
		zoek(id: number): Todo | undefined {
			const rij = een.get(id) as unknown as TodoRij | undefined;
			return rij ? naarTodo(rij) : undefined;
		},
		voegToe(titel: string): Todo {
			const { lastInsertRowid } = invoegen.run(titel);
			return this.zoek(Number(lastInsertRowid))!;
		},
		werkBij(id: number, gedaan: boolean): Todo | undefined {
			const { changes } = zetGedaan.run(gedaan ? 1 : 0, id);
			return changes === 0 ? undefined : this.zoek(id);
		},
		verwijder(id: number): boolean {
			return verwijderen.run(id).changes > 0;
		},
		sluit() {
			db.close();
		},
	};
}

export type Store = ReturnType<typeof maakStore>;
