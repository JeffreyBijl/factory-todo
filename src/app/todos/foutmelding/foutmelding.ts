import { Component, input } from '@angular/core';

@Component({
	selector: 'app-foutmelding',
	template: `<p class="fout" role="alert">{{ bericht() }}</p>`,
	styles: `
		.fout {
			color: #b00020;
		}
	`,
})
export class Foutmelding {
	readonly bericht = input.required<string>();
}
