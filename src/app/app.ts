import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Todo, TodoService } from './todo.service';

@Component({
	selector: 'app-root',
	imports: [FormsModule],
	templateUrl: './app.html',
	styleUrl: './app.css',
})
export class App implements OnInit {
	private readonly service = inject(TodoService);

	protected readonly todos = signal<Todo[]>([]);
	protected readonly fout = signal('');
	protected readonly geladen = signal(false);
	protected nieuweTitel = '';

	async ngOnInit() {
		await this.laad();
	}

	protected async laad() {
		try {
			this.todos.set(await this.service.lijst());
			this.geladen.set(true);
		} catch {
			this.fout.set('Laden mislukt');
		}
	}

	protected async voegToe() {
		const titel = this.nieuweTitel.trim();
		if (!titel) return;
		try {
			await this.service.voegToe(titel);
			this.nieuweTitel = '';
			this.fout.set('');
			await this.laad();
		} catch {
			this.fout.set('Toevoegen mislukt');
		}
	}

	protected async wissel(todo: Todo) {
		await this.service.zetGedaan(todo.id, !todo.gedaan);
		await this.laad();
	}

	protected async verwijder(todo: Todo) {
		await this.service.verwijder(todo.id);
		await this.laad();
	}
}
