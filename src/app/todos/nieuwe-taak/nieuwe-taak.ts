import { Component, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength } from '@angular/forms/signals';
import { TodoStore } from '../todo.store';

@Component({
	selector: 'app-nieuwe-taak',
	imports: [FormRoot, FormField],
	templateUrl: './nieuwe-taak.html',
	styleUrl: './nieuwe-taak.css',
})
export class NieuweTaak {
	private readonly store = inject(TodoStore);

	private readonly model = signal({ titel: '' });
	protected readonly taakForm = form(
		this.model,
		(pad) => {
			maxLength(pad.titel, 200);
		},
		{ submission: { action: () => this.voegToe() } },
	);

	private async voegToe() {
		const titel = this.model().titel.trim();
		if (!titel) return;
		if (await this.store.voegToe(titel)) {
			this.taakForm().reset({ titel: '' });
		}
	}
}
