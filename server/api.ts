import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Store } from './db.ts';

export const MAX_TITEL = 200;

export function json(res: ServerResponse, status: number, body?: unknown) {
	res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
	res.end(body === undefined ? '' : JSON.stringify(body));
}

async function leesJson(req: IncomingMessage): Promise<Record<string, unknown> | null> {
	let data = '';
	for await (const deel of req) data += deel;
	try {
		const body: unknown = JSON.parse(data || '{}');
		return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

// Behandelt /api/todos. Geeft true terug als het verzoek is afgehandeld.
export async function behandelApi(
	req: IncomingMessage,
	res: ServerResponse,
	url: URL,
	store: Store,
): Promise<boolean> {
	if (!url.pathname.startsWith('/api/')) return false;

	if (req.method === 'GET' && url.pathname === '/api/todos') {
		json(res, 200, store.lijst());
		return true;
	}

	if (req.method === 'POST' && url.pathname === '/api/todos') {
		const body = await leesJson(req);
		const titel = typeof body?.['titel'] === 'string' ? body['titel'].trim() : '';
		if (!titel || titel.length > MAX_TITEL) {
			json(res, 400, { fout: `Titel is verplicht, maximaal ${MAX_TITEL} tekens` });
			return true;
		}
		json(res, 201, store.voegToe(titel));
		return true;
	}

	const match = /^\/api\/todos\/(\d+)$/.exec(url.pathname);
	if (match) {
		const id = Number(match[1]);
		if (req.method === 'PATCH') {
			const body = await leesJson(req);
			if (typeof body?.['gedaan'] !== 'boolean') {
				json(res, 400, { fout: 'gedaan moet true of false zijn' });
				return true;
			}
			const todo = store.werkBij(id, body['gedaan']);
			if (todo) json(res, 200, todo);
			else json(res, 404, { fout: 'Todo niet gevonden' });
			return true;
		}
		if (req.method === 'DELETE') {
			if (store.verwijder(id)) json(res, 204);
			else json(res, 404, { fout: 'Todo niet gevonden' });
			return true;
		}
	}

	json(res, 404, { fout: 'Niet gevonden' });
	return true;
}
