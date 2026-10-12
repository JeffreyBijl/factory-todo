import { inject, Service, signal } from '@angular/core';
import { TodoService } from '../todo.service';
import { Todo } from './todo.model';

/** Houdt de staat van de todo-lijst bij en voert de acties uit. */
@Service()
export class TodoStore {
	private readonly service = inject(TodoService);

	readonly todos = signal<Todo[]>([]);
	readonly fout = signal('');
	readonly geladen = signal(false);

	async laad() {
		try {
			this.todos.set(await this.service.lijst());
			this.geladen.set(true);
		} catch {
			this.fout.set('Laden mislukt');
		}
	}

	/** Geeft true terug als de taak is toegevoegd. */
	async voegToe(titel: string): Promise<boolean> {
		try {
			await this.service.voegToe(titel);
			this.fout.set('');
			await this.laad();
			return true;
		} catch {
			this.fout.set('Toevoegen mislukt');
			return false;
		}
	}

	async wissel(todo: Todo) {
		await this.service.zetGedaan(todo.id, !todo.gedaan);
		await this.laad();
	}

	async verwijder(todo: Todo) {
		await this.service.verwijder(todo.id);
		await this.laad();
	}
}
