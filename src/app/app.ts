import { Component, inject, OnInit } from '@angular/core';
import { Foutmelding } from './todos/foutmelding/foutmelding';
import { NieuweTaak } from './todos/nieuwe-taak/nieuwe-taak';
import { TodoLijst } from './todos/todo-lijst/todo-lijst';
import { TodoStore } from './todos/todo.store';

@Component({
	selector: 'app-root',
	imports: [NieuweTaak, Foutmelding, TodoLijst],
	templateUrl: './app.html',
	styleUrl: './app.css',
})
export class App implements OnInit {
	protected readonly store = inject(TodoStore);

	ngOnInit() {
		return this.store.laad();
	}
}
