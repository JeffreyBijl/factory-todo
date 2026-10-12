import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// Alle tests delen één database: daarom serieel, en elke test begint met een lege lijst via de API.
test.describe.configure({ mode: 'serial' });

async function maakLeeg(request: APIRequestContext) {
	const res = await request.get('/api/todos');
	for (const todo of (await res.json()) as { id: number }[]) {
		await request.delete(`/api/todos/${todo.id}`);
	}
	expect(await (await request.get('/api/todos')).json()).toEqual([]);
}

async function voegToeViaApi(request: APIRequestContext, titel: string) {
	const res = await request.post('/api/todos', { data: { titel } });
	expect(res.status()).toBe(201);
}

const invoer = (page: Page) => page.getByLabel('Nieuwe taak');
const items = (page: Page) => page.getByRole('listitem');
const leeg = (page: Page) => page.getByText('Nog niets te doen.');

// Laat alleen het opgegeven verzoek (methode op /api/todos) mislukken met een 500 zonder JSON-body.
async function laatFalen(page: Page, methode: string) {
	await page.route('**/api/todos', async (route) => {
		if (route.request().method() === methode) {
			await route.fulfill({
				status: 500,
				contentType: 'text/plain',
				body: 'Internal Server Error',
			});
		} else {
			await route.fallback();
		}
	});
}

test.beforeEach(async ({ request }) => {
	await maakLeeg(request);
});

test('AC-1: een lege lijst toont "Nog niets te doen." en geen listitem', async ({ page }) => {
	await page.goto('/');
	await expect(leeg(page)).toBeVisible();
	await expect(items(page)).toHaveCount(0);
});

test('AC-2: Melk kopen toevoegen met Enter toont één listitem, leegt het veld en verbergt de lege tekst', async ({
	page,
}) => {
	await page.goto('/');
	await invoer(page).fill('Melk kopen');
	await invoer(page).press('Enter');
	await expect(items(page)).toHaveCount(1);
	await expect(items(page).first()).toContainText('Melk kopen');
	await expect(invoer(page)).toHaveValue('');
	await expect(leeg(page)).toHaveCount(0);
});

test('AC-3: toevoegen met de knop zet nieuwe todos onderaan', async ({ page }) => {
	await page.goto('/');
	await invoer(page).fill('Melk kopen');
	await page.getByRole('button', { name: 'Toevoegen' }).click();
	await expect(items(page)).toHaveCount(1);
	await invoer(page).fill('Brood');
	await page.getByRole('button', { name: 'Toevoegen' }).click();
	await expect(items(page)).toHaveCount(2);
	await expect(items(page).nth(0)).toContainText('Melk kopen');
	await expect(items(page).nth(1)).toContainText('Brood');
});

test('AC-4: na herladen staan Melk kopen en Brood er nog, in dezelfde volgorde', async ({
	page,
	request,
}) => {
	await voegToeViaApi(request, 'Melk kopen');
	await voegToeViaApi(request, 'Brood');
	await page.goto('/');
	await expect(items(page)).toHaveCount(2);
	await page.reload();
	await expect(items(page)).toHaveCount(2);
	await expect(items(page).nth(0)).toContainText('Melk kopen');
	await expect(items(page).nth(1)).toContainText('Brood');
});

test('AC-5: drie spaties toevoegen geeft geen listitem, ook niet na herladen', async ({ page }) => {
	await page.goto('/');
	await expect(leeg(page)).toBeVisible();
	await invoer(page).fill('   ');
	await page.getByRole('button', { name: 'Toevoegen' }).click();
	await expect(items(page)).toHaveCount(0);
	await page.reload();
	await expect(leeg(page)).toBeVisible();
	await expect(items(page)).toHaveCount(0);
});

test('AC-6: <b>vet</b> wordt letterlijk getoond en niet als b-element', async ({ page }) => {
	await page.goto('/');
	await invoer(page).fill('<b>vet</b>');
	await page.getByRole('button', { name: 'Toevoegen' }).click();
	await expect(items(page)).toHaveCount(1);
	await expect(items(page).first()).toContainText('<b>vet</b>');
	await expect(page.locator('main b')).toHaveCount(0);
});

test('AC-8: een mislukte POST toont een alert, houdt de invoer en voegt niets toe', async ({
	page,
}) => {
	await laatFalen(page, 'POST');
	await page.goto('/');
	await invoer(page).fill('Melk kopen');
	await page.getByRole('button', { name: 'Toevoegen' }).click();
	await expect(page.getByRole('alert')).toContainText('Toevoegen mislukt');
	await expect(invoer(page)).toHaveValue('Melk kopen');
	await expect(items(page)).toHaveCount(0);
});

test('AC-9: na een geslaagde nieuwe poging is de alert weg en staat Melk kopen in de lijst', async ({
	page,
}) => {
	await laatFalen(page, 'POST');
	await page.goto('/');
	await invoer(page).fill('Melk kopen');
	await page.getByRole('button', { name: 'Toevoegen' }).click();
	await expect(page.getByRole('alert')).toContainText('Toevoegen mislukt');

	await page.unroute('**/api/todos');
	await page.getByRole('button', { name: 'Toevoegen' }).click();
	await expect(items(page)).toHaveCount(1);
	await expect(items(page).first()).toContainText('Melk kopen');
	await expect(page.getByRole('alert')).toHaveCount(0);
});

test('AC-10: een mislukte GET toont "Laden mislukt" en niet "Nog niets te doen."', async ({
	page,
}) => {
	await laatFalen(page, 'GET');
	await page.goto('/');
	await expect(page.getByRole('alert')).toContainText('Laden mislukt');
	await expect(leeg(page)).toHaveCount(0);
});
