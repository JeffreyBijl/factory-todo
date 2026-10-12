import { Component, input, output } from '@angular/core';
import { Todo } from '../todo.model';
import { TodoItem } from '../todo-item/todo-item';

@Component({
	selector: 'app-todo-lijst',
	imports: [TodoItem],
	templateUrl: './todo-lijst.html',
	styleUrl: './todo-lijst.css',
})
export class TodoLijst {
	readonly todos = input.required<Todo[]>();
	readonly geladen = input.required<boolean>();
	readonly heeftFout = input(false);
	readonly gewisseld = output<Todo>();
	readonly verwijderd = output<Todo>();
}
