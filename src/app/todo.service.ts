import { Injectable } from '@angular/core';

export interface Todo {
	id: number;
	titel: string;
	gedaan: boolean;
}

@Injectable({ providedIn: 'root' })
export class TodoService {
	private readonly basis = '/api/todos';

	async lijst(): Promise<Todo[]> {
		const res = await fetch(this.basis);
		return (await res.json()) as Todo[];
	}

	async voegToe(titel: string): Promise<Todo> {
		const res = await fetch(this.basis, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ titel }),
		});
		if (!res.ok) throw new Error(((await res.json()) as { fout: string }).fout);
		return (await res.json()) as Todo;
	}

	async zetGedaan(id: number, gedaan: boolean): Promise<Todo> {
		const res = await fetch(`${this.basis}/${id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ gedaan }),
		});
		return (await res.json()) as Todo;
	}

	async verwijder(id: number): Promise<void> {
		await fetch(`${this.basis}/${id}`, { method: 'DELETE' });
	}
}
