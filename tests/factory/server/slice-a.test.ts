import { request } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { maakServer } from '../../../server/main.ts';
import { maakStore } from '../../../server/db.ts';

// Elke test krijgt een eigen server met een lege database in het geheugen.
let stopServer: () => Promise<void>;
let poort: number;

beforeEach(async () => {
	const store = maakStore(':memory:');
	const server = maakServer(store);
	await new Promise<void>((klaar) => server.listen(0, klaar));
	const adres = server.address();
	poort = typeof adres === 'object' && adres ? adres.port : 0;
	stopServer = () => new Promise<void>((klaar) => server.close(() => (store.sluit(), klaar())));
});

afterEach(() => stopServer());

const basis = () => `http://localhost:${poort}`;

const post = (body: string) =>
	fetch(`${basis()}/api/todos`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body,
	});

const lijst = async () => (await fetch(`${basis()}/api/todos`)).json();

// Bouwt een geldige JSON-body van precies `bytes` bytes met een ASCII-opvulling.
function bodyVanGrootte(bytes: number, titel = 'Melk kopen'): string {
	const kaal = JSON.stringify({ titel, opvulling: '' });
	const body = JSON.stringify({ titel, opvulling: 'x'.repeat(bytes - Buffer.byteLength(kaal)) });
	expect(Buffer.byteLength(body)).toBe(bytes);
	return body;
}

// Verstuurt een body in meerdere stukken zonder Content-Length (chunked).
function postChunked(body: string): Promise<number> {
	return new Promise((oplossen, afwijzen) => {
		const req = request(
			{
				host: 'localhost',
				port: poort,
				path: '/api/todos',
				method: 'POST',
				headers: { 'content-type': 'application/json', 'transfer-encoding': 'chunked' },
			},
			(res) => {
				res.resume();
				res.on('end', () => oplossen(res.statusCode ?? 0));
			},
		);
		req.on('error', afwijzen);
		const data = Buffer.from(body);
		for (let i = 0; i < data.length; i += 1000) req.write(data.subarray(i, i + 1000));
		req.end();
	});
}

describe('Slice A: API toevoegen en lijst', () => {
	it('AC-11: een lege database geeft 200 en []; daarna staan beide todos in volgorde van aanmaken', async () => {
		const leeg = await fetch(`${basis()}/api/todos`);
		expect(leeg.status).toBe(200);
		expect(await leeg.json()).toEqual([]);

		expect((await post(JSON.stringify({ titel: 'Melk kopen' }))).status).toBe(201);
		expect((await post(JSON.stringify({ titel: 'Brood' }))).status).toBe(201);

		const alles = (await lijst()) as { titel: string }[];
		expect(alles.map((t) => t.titel)).toEqual(['Melk kopen', 'Brood']);
	});

	it('AC-12: POST met spaties rond de titel geeft 201 met getrimde titel, gedaan false en een geheel getal als id', async () => {
		const res = await post('{"titel":"  Melk kopen "}');
		expect(res.status).toBe(201);
		const todo = await res.json();
		expect(todo.titel).toBe('Melk kopen');
		expect(todo.gedaan).toBe(false);
		expect(Number.isInteger(todo.id)).toBe(true);
	});

	const ongeldig: [string, string][] = [
		['alleen spaties', '{"titel":"   "}'],
		['geen titel', '{}'],
		['titel is een getal', '{"titel":123}'],
		['ongeldige JSON', '{'],
		['titel van 201 tekens', JSON.stringify({ titel: 'a'.repeat(201) })],
	];
	for (const [naam, body] of ongeldig) {
		it(`AC-13: weigert met 400 en laat de lijst leeg (${naam})`, async () => {
			const res = await post(body);
			expect(res.status).toBe(400);
			expect(await lijst()).toEqual([]);
		});
	}

	it('AC-14: een titel van precies 200 tekens geeft 201 en wordt volledig opgeslagen', async () => {
		const titel = 'a'.repeat(200);
		const res = await post(JSON.stringify({ titel }));
		expect(res.status).toBe(201);
		expect((await res.json()).titel).toBe(titel);
		const alles = (await lijst()) as { titel: string }[];
		expect(alles).toHaveLength(1);
		expect(alles[0].titel).toBe(titel);
	});

	it('AC-44: een body van 10 240 bytes mag, 10 241 bytes en 20 000 bytes chunked geven 413 en veranderen niets', async () => {
		const grens = await post(bodyVanGrootte(10240));
		expect(grens.status).toBe(201);

		const teGroot = await post(bodyVanGrootte(10241, 'Te groot'));
		expect(teGroot.status).toBe(413);

		const chunked = await postChunked(bodyVanGrootte(20000, 'Chunked'));
		expect(chunked).toBe(413);

		const alles = (await lijst()) as { titel: string }[];
		expect(alles).toHaveLength(1);
		expect(alles[0].titel).toBe('Melk kopen');
	});
});
