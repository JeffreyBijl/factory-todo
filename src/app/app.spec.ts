import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { TodoService } from './todo.service';

describe('App', () => {
	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [App],
			providers: [{ provide: TodoService, useValue: { lijst: async () => [] } }],
		}).compileComponents();
	});

	it('toont de kop en een lege lijst', async () => {
		const fixture = TestBed.createComponent(App);
		await fixture.whenStable();
		const el = fixture.nativeElement as HTMLElement;
		expect(el.querySelector('h1')?.textContent).toContain('Todo');
		expect(el.querySelector('.leeg')?.textContent).toContain('Nog niets te doen');
	});
});
