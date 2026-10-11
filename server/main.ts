import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { behandelApi, json } from './api.ts';
import { maakStore, type Store } from './db.ts';

const distMap = resolve(fileURLToPath(new URL('../dist/factory-todo/browser', import.meta.url)));

const mimeTypes: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.ico': 'image/x-icon',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.json': 'application/json; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8',
};

// Serveert de gebouwde Angular-app; onbekende paden krijgen index.html (client-side routing).
function serveerStatisch(res: http.ServerResponse, pad: string) {
	if (!existsSync(distMap)) {
		json(res, 503, { fout: 'App nog niet gebouwd: draai eerst npm run build' });
		return;
	}
	const veiligPad = normalize(pad).replace(/^(\.\.[/\\])+/, '');
	let bestand = join(distMap, veiligPad);
	if (!bestand.startsWith(distMap) || !existsSync(bestand) || statSync(bestand).isDirectory()) {
		bestand = join(distMap, 'index.html');
	}
	res.writeHead(200, { 'content-type': mimeTypes[extname(bestand)] ?? 'application/octet-stream' });
	createReadStream(bestand).pipe(res);
}

export function maakServer(store: Store) {
	return http.createServer(async (req, res) => {
		try {
			const url = new URL(req.url ?? '/', 'http://localhost');
			if (await behandelApi(req, res, url, store)) return;
			if (req.method !== 'GET' && req.method !== 'HEAD') {
				json(res, 405, { fout: 'Methode niet toegestaan' });
				return;
			}
			serveerStatisch(res, url.pathname);
		} catch (fout) {
			console.error(fout);
			if (!res.headersSent) json(res, 500, { fout: 'Interne fout' });
		}
	});
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
	const poort = Number(process.env['PORT'] ?? 3000);
	const store = maakStore();
	const server = maakServer(store);
	server.listen(poort, () => console.log(`Factory-todo op http://localhost:${poort}`));
	const stop = () => server.close(() => (store.sluit(), process.exit(0)));
	process.on('SIGINT', stop);
	process.on('SIGTERM', stop);
}
