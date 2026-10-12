import { TestBed } from '@angular/core/testing';
import { App } from '../../../src/app/app';
import { TodoService } from '../../../src/app/todos/todo.service';

describe('Slice A: interface', () => {
	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [App],
			providers: [{ provide: TodoService, useValue: { lijst: async () => [] } }],
		}).compileComponents();
	});

	it('AC-7: het invoerveld "Nieuwe taak" heeft maxlength="200"', async () => {
		const fixture = TestBed.createComponent(App);
		await fixture.whenStable();
		const el = fixture.nativeElement as HTMLElement;
		const label = Array.from(el.querySelectorAll('label')).find(
			(l) => l.textContent?.trim() === 'Nieuwe taak',
		);
		expect(label).toBeTruthy();
		const invoer = label!.control;
		expect(invoer).toBeTruthy();
		expect(invoer!.getAttribute('maxlength')).toBe('200');
	});
});
