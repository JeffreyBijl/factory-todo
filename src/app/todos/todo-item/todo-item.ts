import { Component, input, output } from '@angular/core';
import { Todo } from '../todo.model';

@Component({
	selector: 'app-todo-item',
	templateUrl: './todo-item.html',
	styleUrl: './todo-item.css',
	host: { '[class.gedaan]': 'todo().gedaan' },
})
export class TodoItem {
	readonly todo = input.required<Todo>();
	readonly gewisseld = output<Todo>();
	readonly verwijderd = output<Todo>();
}
