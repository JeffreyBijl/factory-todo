import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { maakServer } from './main.ts';
import { maakStore } from './db.ts';

// Start de server op een vrije poort met een lege database in het geheugen.
async function startServer() {
	const store = maakStore(':memory:');
	const server = maakServer(store);
	await new Promise<void>((klaar) => server.listen(0, klaar));
	const adres = server.address();
	const basis = `http://localhost:${typeof adres === 'object' && adres ? adres.port : 0}`;
	const verzoek = (pad: string, opties: RequestInit = {}) =>
		fetch(basis + pad, {
			...opties,
			headers: { 'content-type': 'application/json', ...opties.headers },
		});
	return {
		verzoek,
		stop: () => new Promise<void>((klaar) => server.close(() => (store.sluit(), klaar()))),
	};
}

describe('API /api/todos', () => {
	let app: Awaited<ReturnType<typeof startServer>>;
	beforeAll(async () => {
		app = await startServer();
	});
	afterAll(() => app.stop());

	it('begint leeg', async () => {
		const res = await app.verzoek('/api/todos');
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual([]);
	});

	it('voegt een todo toe, vinkt af en verwijdert', async () => {
		const aangemaakt = await app.verzoek('/api/todos', {
			method: 'POST',
			body: JSON.stringify({ titel: '  Melk kopen ' }),
		});
		expect(aangemaakt.status).toBe(201);
		const todo = await aangemaakt.json();
		expect(todo).toMatchObject({ titel: 'Melk kopen', gedaan: false });

		const bijgewerkt = await app.verzoek(`/api/todos/${todo.id}`, {
			method: 'PATCH',
			body: JSON.stringify({ gedaan: true }),
		});
		expect((await bijgewerkt.json()).gedaan).toBe(true);

		expect((await app.verzoek(`/api/todos/${todo.id}`, { method: 'DELETE' })).status).toBe(204);
		expect(await (await app.verzoek('/api/todos')).json()).toEqual([]);
	});

	it('weigert een lege titel', async () => {
		const res = await app.verzoek('/api/todos', {
			method: 'POST',
			body: JSON.stringify({ titel: '  ' }),
		});
		expect(res.status).toBe(400);
	});

	it('geeft 404 voor een onbekende todo', async () => {
		const res = await app.verzoek('/api/todos/9999', { method: 'DELETE' });
		expect(res.status).toBe(404);
	});
});
