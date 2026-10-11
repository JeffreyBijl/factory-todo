---
id: "001-todo-app"
titel: "Todo-app: toevoegen, afvinken, titel aanpassen en verwijderen"
issue: ""
status: goedgekeurd
spec_versie: 1
profielversie: 1
goedgekeurd:
  door: "Jeffrey Bijl"
  op: "2026-10-11"
---

# Todo-app: toevoegen, afvinken, titel aanpassen en verwijderen

## Gedrag

Te groot voor één zin, daarom vier slices (zie Opknippen). Samen: de gebruiker voegt een todo met een titel toe, vinkt hem af, past de titel aan en verwijdert hem, en na herladen ziet hij nog steeds dezelfde lijst.

## Context

Een todo-lijst voor persoonlijk gebruik in de browser. Het skelet heeft al een deel hiervan: `server/api.ts` kent `GET`, `POST`, `PATCH` (alleen `gedaan`) en `DELETE` op `/api/todos`, en `src/app/app.ts` kan toevoegen, afvinken en verwijderen. Wat nog ontbreekt:

- **Titel aanpassen.** Dat bestaat nog nergens, niet in de API en niet in de interface.
- **Foutafhandeling in de interface.** Mislukt het laden, afvinken of verwijderen, dan ziet de gebruiker niets. Bij een 500 met een body die geen JSON is, toont toevoegen een parse-fout in plaats van een leesbare melding.
- **Tests van de factory.** `tests/factory/` is nog leeg. De bestaande tests `server/api.test.ts` en `src/app/app.spec.ts` horen bij het skelet en blijven staan.
- **Limiet op de request-body.** `leesJson` in `server/api.ts` leest een body nu zonder limiet in het geheugen, terwijl de API publiek is zonder authenticatie. Slice A voegt een limiet van 10 kB toe; die geldt voor elk verzoek dat `leesJson` gebruikt, dus ook voor `PATCH`.

Slice A tot en met C leggen dus vooral het bestaande gedrag vast in tests en dichten de gaten in de foutafhandeling en de body-limiet. Slice D bouwt het aanpassen van de titel. Alle vier de slices worden uitgevoerd.

Er zijn geen accounts: iedereen die de app kan bereiken, ziet en wijzigt dezelfde lijst (zie het profiel, `server/**`).

**Vaste regels voor alle criteria**

- Een titel wordt aan begin en eind ontdaan van spaties. Daarna is hij 1 tot en met 200 tekens lang (`MAX_TITEL` in `server/api.ts`). Spaties binnen de titel blijven staan.
- De lijst staat op volgorde van aanmaken: de oudste bovenaan en een nieuwe todo onderaan. Afvinken en de titel aanpassen veranderen de volgorde niet.
- Een todo in de API ziet er zo uit: `{ "id": <geheel getal>, "titel": <string>, "gedaan": <boolean> }`.
- Een foutmelding staat in één element met `role="alert"`. Na de volgende geslaagde actie verdwijnt hij.
- Een request-body is maximaal 10 240 bytes (10 kB), geteld als de ruwe bytes van de body zoals verstuurd. Dat geldt ook als de body zonder `Content-Length` wordt verstuurd (chunked). Een grotere body geeft status 413 en verandert niets in de database.
- Verwijderen gebeurt direct, zonder bevestiging en zonder ongedaan maken.
- De criteria AC-44 tot en met AC-46 zijn toegevoegd na de antwoorden op de open vragen. Ze staan bij de slice waar ze horen; de bestaande nummers zijn niet veranderd.

**Namen in de interface** (zodat elke test dezelfde elementen zoekt):

| Element | Toegankelijke naam of tekst |
| --- | --- |
| Invoerveld voor een nieuwe todo | label "Nieuwe taak" |
| Knop om toe te voegen | "Toevoegen" |
| Lege lijst | tekst "Nog niets te doen." |
| Een todo | `listitem` binnen de lijst, met de titel als tekst |
| Vinkje van een todo | checkbox met de titel als naam, bijv. "Melk kopen" |
| Knop om te verwijderen | "Verwijder <titel>", bijv. "Verwijder Melk kopen" |
| Knop om de titel aan te passen | "Wijzig <titel>", bijv. "Wijzig Melk kopen" |
| Bewerkveld | textbox met label "Titel wijzigen" |
| Knoppen in de bewerkmodus | "Opslaan" en "Annuleren" |

**Voor de testagent:** de E2E-tests draaien lokaal tegen één server met `DB_PATH=:memory:`, en in de pipeline tegen de preview. In beide gevallen delen alle tests één database. "Gegeven een lege lijst" betekent: de test maakt de lijst eerst leeg via de API. Een fout van de API ("de API antwoordt met status 500") simuleer je in E2E met `page.route` voor precies dat verzoek.

## Acceptatiecriteria

### Slice A: toevoegen en de lijst tonen

| ID | Gegeven | Als | Dan | Test |
| --- | --- | --- | --- | --- |
| AC-1 | een lege lijst | ik open de app | zie ik de tekst "Nog niets te doen." en geen enkel listitem | e2e |
| AC-2 | een lege lijst | ik typ "Melk kopen" in "Nieuwe taak" en druk op Enter | staat er één listitem met de tekst "Melk kopen", is "Nieuwe taak" leeg en is "Nog niets te doen." weg | e2e |
| AC-3 | een lege lijst | ik voeg "Melk kopen" toe en daarna "Brood" (beide met de knop "Toevoegen") | staan de listitems in de volgorde "Melk kopen", "Brood" | e2e |
| AC-4 | de lijst bevat "Melk kopen" en "Brood", in die volgorde | ik herlaad de pagina | staan "Melk kopen" en "Brood" er nog, in dezelfde volgorde | e2e |
| AC-5 | een lege lijst | ik typ drie spaties in "Nieuwe taak" en klik op "Toevoegen" | staat er geen listitem, ook niet na herladen | e2e |
| AC-6 | een lege lijst | ik voeg de titel `<b>vet</b>` toe | toont het listitem letterlijk de tekst `<b>vet</b>` en staat er geen `b`-element in de lijst | e2e |
| AC-7 | de app is geladen | ik bekijk het invoerveld "Nieuwe taak" | heeft het de eigenschap `maxlength="200"` | unit |
| AC-8 | een lege lijst, en de API antwoordt met status 500 op `POST /api/todos` | ik voeg "Melk kopen" toe | toont een alert de tekst "Toevoegen mislukt", staat "Melk kopen" nog in "Nieuwe taak" en staat er geen listitem | e2e |
| AC-9 | de alert "Toevoegen mislukt" uit AC-8 staat er, en de API werkt weer | ik klik opnieuw op "Toevoegen" | is de alert weg en staat er een listitem "Melk kopen" | e2e |
| AC-10 | de API antwoordt met status 500 op `GET /api/todos` | ik open de app | toont een alert de tekst "Laden mislukt" en staat de tekst "Nog niets te doen." er niet | e2e |
| AC-11 | een lege database | `GET /api/todos` | krijg ik status 200 en de body `[]`; na `POST` van "Melk kopen" en daarna "Brood" geeft `GET` beide terug, "Melk kopen" eerst | unit |
| AC-12 | een lege database | `POST /api/todos` met de body `{"titel":"  Melk kopen "}` | krijg ik status 201 en een todo met `titel` "Melk kopen", `gedaan` false en een geheel getal als `id` | unit |
| AC-13 | een lege database | `POST /api/todos` met elk van deze bodies: `{"titel":"   "}`, `{}`, `{"titel":123}`, de ongeldige JSON `{`, en een titel van 201 tekens | krijg ik telkens status 400, en `GET /api/todos` geeft daarna `[]` | unit |
| AC-14 | een lege database | `POST /api/todos` met een titel van precies 200 tekens | krijg ik status 201 en is de titel volledig opgeslagen | unit |
| AC-44 | een lege database | `POST /api/todos` met een geldige JSON-body `{"titel":"Melk kopen","opvulling":"<x'en>"}`, waarbij de opvulling zo lang is dat de body precies 10 240 bytes is; daarna dezelfde body van precies 10 241 bytes; en daarna een body van 20 000 bytes die zonder `Content-Length` (chunked) wordt verstuurd | krijg ik eerst status 201, daarna status 413 en daarna status 413, en geeft `GET /api/todos` precies één todo "Melk kopen" terug | unit |

### Slice B: afvinken en terugzetten

| ID | Gegeven | Als | Dan | Test |
| --- | --- | --- | --- | --- |
| AC-15 | de lijst bevat "Melk kopen", "Brood" en "Kaas", geen ervan afgevinkt | ik vink "Brood" aan | is de checkbox "Brood" aangevinkt, heeft de titel "Brood" de CSS `text-decoration-line: line-through` en blijft de volgorde "Melk kopen", "Brood", "Kaas" | e2e |
| AC-16 | "Brood" is afgevinkt | ik herlaad de pagina | is de checkbox "Brood" nog aangevinkt | e2e |
| AC-17 | "Brood" is afgevinkt | ik klik opnieuw op de checkbox "Brood" en herlaad daarna de pagina | is de checkbox "Brood" niet aangevinkt en heeft de titel geen `line-through`, zowel vóór als na het herladen | e2e |
| AC-18 | de lijst bevat "Melk kopen", niet afgevinkt, en de API antwoordt met status 500 op `PATCH /api/todos/<id>` | ik vink "Melk kopen" aan | toont een alert de tekst "Afvinken mislukt" en is de checkbox "Melk kopen" niet aangevinkt | e2e |
| AC-19 | de lijst bevat "Melk kopen" op het scherm, maar de todo is intussen via de API verwijderd | ik vink "Melk kopen" aan | toont een alert de tekst "Afvinken mislukt" en staat "Melk kopen" niet meer in de lijst | e2e |
| AC-20 | een todo "Melk kopen" met `gedaan` false | `PATCH /api/todos/<id>` met `{"gedaan":true}` | krijg ik status 200 met `gedaan` true, en `GET /api/todos` geeft die todo met `gedaan` true | unit |
| AC-21 | een todo "Melk kopen" met `gedaan` false | `PATCH /api/todos/<id>` met `{"gedaan":"ja"}` en daarna met `{}` | krijg ik telkens status 400 en heeft de todo nog `gedaan` false | unit |
| AC-22 | een database zonder todo met id 9999 | `PATCH /api/todos/9999` met `{"gedaan":true}`, en `PATCH /api/todos/abc` met `{"gedaan":true}` | krijg ik telkens status 404 | unit |
| AC-45 | een todo "Melk kopen" met `gedaan` false | `PATCH /api/todos/<id>` met de geldige JSON-body `{"gedaan":true,"opvulling":"<x'en>"}` van precies 10 241 bytes | krijg ik status 413 en heeft de todo nog `gedaan` false | unit |

### Slice C: verwijderen

| ID | Gegeven | Als | Dan | Test |
| --- | --- | --- | --- | --- |
| AC-23 | de lijst bevat "Melk kopen" en "Brood" | ik klik op "Verwijder Melk kopen" | staat alleen "Brood" nog in de lijst, ook na herladen | e2e |
| AC-24 | de lijst bevat alleen "Melk kopen" | ik klik op "Verwijder Melk kopen" | zie ik de tekst "Nog niets te doen." en geen listitem | e2e |
| AC-25 | de lijst bevat "Melk kopen", en de API antwoordt met status 500 op `DELETE /api/todos/<id>` | ik klik op "Verwijder Melk kopen" | toont een alert de tekst "Verwijderen mislukt" en staat "Melk kopen" nog in de lijst | e2e |
| AC-26 | een todo "Melk kopen" | `DELETE /api/todos/<id>` en daarna nog een keer `DELETE /api/todos/<id>` | krijg ik eerst status 204 en daarna 404, en `GET /api/todos` geeft de todo niet meer terug | unit |

### Slice D: de titel aanpassen

| ID | Gegeven | Als | Dan | Test |
| --- | --- | --- | --- | --- |
| AC-27 | de lijst bevat "Melk kopen" | ik klik op "Wijzig Melk kopen" | verschijnt het bewerkveld "Titel wijzigen" met de waarde "Melk kopen", en het heeft de focus | e2e |
| AC-28 | het bewerkveld van "Melk kopen" is open | ik vervang de tekst door "Havermelk kopen" en druk op Enter | is het bewerkveld weg, staat er een listitem "Havermelk kopen" en geen "Melk kopen", ook na herladen | e2e |
| AC-29 | het bewerkveld van "Melk kopen" is open | ik vervang de tekst door "Havermelk kopen" en klik op "Opslaan" | is het bewerkveld weg en staat er een listitem "Havermelk kopen" en geen "Melk kopen" | e2e |
| AC-30 | het bewerkveld van "Melk kopen" is open en ik heb er "Havermelk kopen" in getypt | ik druk op Escape | is het bewerkveld weg en staat er "Melk kopen", ook na herladen | e2e |
| AC-31 | het bewerkveld van "Melk kopen" is open en ik heb er "Havermelk kopen" in getypt | ik klik op "Annuleren" | is het bewerkveld weg en staat er "Melk kopen" | e2e |
| AC-32 | het bewerkveld van "Melk kopen" is open | ik vervang de tekst door "  Brood  " en druk op Enter | staat er een listitem met de tekst "Brood", zonder spaties aan begin of eind | e2e |
| AC-33 | het bewerkveld van "Melk kopen" is open | ik maak het veld leeg (of vul alleen spaties in) en druk op Enter | toont een alert de tekst "Titel mag niet leeg zijn", blijft het bewerkveld open en staat er na herladen "Melk kopen" | e2e |
| AC-34 | "Melk kopen" is afgevinkt | ik pas de titel aan naar "Havermelk kopen" en druk op Enter | is de checkbox "Havermelk kopen" aangevinkt, ook na herladen | e2e |
| AC-35 | de lijst bevat "Melk kopen", "Brood" en "Kaas" | ik pas de titel van "Brood" aan naar "Volkorenbrood" | blijft de volgorde "Melk kopen", "Volkorenbrood", "Kaas" | e2e |
| AC-36 | de lijst bevat "Melk kopen" en "Brood", het bewerkveld van "Melk kopen" is open en ik heb "Havermelk kopen" getypt | ik klik op "Wijzig Brood" | staat er één bewerkveld, met de waarde "Brood", en staat er "Melk kopen" (niet opgeslagen) | e2e |
| AC-37 | het bewerkveld van "Melk kopen" is open, en de API antwoordt met status 500 op `PATCH /api/todos/<id>` | ik vervang de tekst door "Havermelk kopen" en druk op Enter | toont een alert de tekst "Opslaan mislukt", blijft het bewerkveld open met de waarde "Havermelk kopen" en staat er na herladen "Melk kopen" | e2e |
| AC-38 | de lijst bevat "Melk kopen" | ik open het bewerkveld | heeft het bewerkveld de eigenschap `maxlength="200"` | unit |
| AC-39 | een todo "Melk kopen" met `gedaan` false | `PATCH /api/todos/<id>` met `{"titel":"  Havermelk kopen "}` | krijg ik status 200 met `titel` "Havermelk kopen" en `gedaan` false, en `GET /api/todos` geeft dezelfde waarden | unit |
| AC-40 | een todo "Melk kopen" met `gedaan` false | `PATCH /api/todos/<id>` met `{"titel":"Brood","gedaan":true}` | krijg ik status 200 met `titel` "Brood" en `gedaan` true | unit |
| AC-41 | een todo "Melk kopen" met `gedaan` false | `PATCH /api/todos/<id>` met elk van deze bodies: `{"titel":"   "}`, `{"titel":123}`, een titel van 201 tekens, en `{"titel":"Brood","gedaan":"ja"}` | krijg ik telkens status 400 en geeft `GET /api/todos` nog `titel` "Melk kopen" en `gedaan` false | unit |
| AC-42 | een todo "Melk kopen" | `PATCH /api/todos/<id>` met een titel van precies 200 tekens | krijg ik status 200 en is de titel volledig opgeslagen | unit |
| AC-43 | een database zonder todo met id 9999 | `PATCH /api/todos/9999` met `{"titel":"Brood"}` | krijg ik status 404 | unit |
| AC-46 | het bewerkveld van "Melk kopen" is open en ik heb er "Havermelk kopen" in getypt | ik klik in het invoerveld "Nieuwe taak" | is het bewerkveld nog open met de waarde "Havermelk kopen", en staat er na herladen "Melk kopen" | e2e |

## Buiten scope

- Accounts, inloggen en meerdere lijsten. Iedereen met toegang ziet dezelfde lijst.
- Rate limiting op de API.
- Andere tabbladen of apparaten bijwerken zonder te herladen.
- Een bevestiging vragen bij verwijderen, en verwijderen ongedaan maken.
- Alle afgevinkte todo's in één keer wissen, filteren (alles, open, gedaan) en een teller van open todo's.
- Volgorde aanpassen met slepen.
- Dubbele titels weren: twee todo's met dezelfde titel zijn toegestaan.
- Bewerken starten door te dubbelklikken op de titel. Bewerken begint alleen met de knop "Wijzig <titel>".
- Opslaan of annuleren wanneer het bewerkveld de focus verliest. Wegklikken verandert niets; het bewerkveld blijft open (AC-46).
- Een lege titel bij het aanpassen gebruiken om de todo te verwijderen (zoals in TodoMVC). Een lege titel wordt geweigerd (AC-33).
- Een eigen melding in de interface voor status 413. Het invoerveld en het bewerkveld laten geen titel van meer dan 200 tekens toe, dus de interface komt niet aan de limiet.
- Offline werken.

## Nieuwe dependencies

| Pakket | Versie | Waarom | Alternatief zonder dependency |
| --- | --- | --- | --- |
| geen |  |  | Alles kan met wat er al is: Angular (`FormsModule`), `node:http` en `node:sqlite` |

## Raakt gevoelige gebieden

- `server/**` (`server/api.ts`):
  - Slice A: `leesJson` stopt met inlezen zodra de body groter is dan 10 240 bytes, en het verzoek krijgt status 413 (AC-44). Dat geldt voor `POST` en `PATCH`, met of zonder `Content-Length`. Dit beperkt hoeveel geheugen één verzoek kan kosten.
  - Slice B: geen verandering aan de API verwacht; alleen tests, waaronder de body-limiet op `PATCH` (AC-45).
  - Slice C: geen verandering aan de API verwacht; alleen tests.
  - Slice D: `PATCH /api/todos/<id>` accepteert voortaan `titel`, `gedaan` of beide. Minstens één van de twee moet aanwezig zijn en alle aanwezige velden moeten geldig zijn, anders volgt 400 en verandert er niets. `titel` volgt dezelfde regels als bij `POST`. Een body met alleen `{"gedaan":<boolean>}` blijft werken zoals nu.
- `server/db.ts`: slice D krijgt een query die de titel bijwerkt (bijv. `UPDATE todos SET titel = ? WHERE id = ?`), of een `werkBij` die beide velden in één statement bijwerkt. Het schema verandert niet en er is geen migratie.
- `package.json`: nee.
- `proxy.conf.json`: nee.

## Specialisten

- Verplicht volgens het profiel: security, ui, ux.
- Extra voor deze spec: backend in slice D, omdat het `PATCH`-contract verandert (gedeeltelijk bijwerken, alles of niets bij een ongeldig veld).

## Opknippen

| Slice | Gedrag in één zin | Criteria | Hangt af van |
| --- | --- | --- | --- |
| A | De gebruiker voegt een todo met een titel toe, ziet hem onderaan de lijst en ziet een melding als laden of toevoegen mislukt; de API weigert een te grote body. | AC-1 t/m AC-14, AC-44 | – |
| B | De gebruiker vinkt een todo af of zet hem terug, en dat blijft bewaard. | AC-15 t/m AC-22, AC-45 | A (body-limiet) |
| C | De gebruiker verwijdert een todo, en die blijft weg. | AC-23 t/m AC-26 | A |
| D | De gebruiker past de titel van een todo aan, en die blijft bewaard. | AC-27 t/m AC-43, AC-46 | B (zelfde `PATCH`-endpoint en dezelfde foutafhandeling) |

De body-limiet staat in slice A omdat `POST` het eerste verzoek met een body is en `leesJson` door `POST` en `PATCH` wordt gedeeld. Een aparte slice voor alleen de limiet zou geen gedrag voor de gebruiker opleveren.

## Inschatting

| Slice | Gewijzigde regels | Bestanden | Rondes | Verbruik |
| --- | --- | --- | --- | --- |
| A | ~65 | ~4 (`app.ts`, `app.html`, `todo.service.ts`, `api.ts`) | 1 | laag, ~4% van het weeklimiet |
| B | ~30 | ~3 (`app.ts`, `todo.service.ts`, eventueel `app.html`) | 1 | laag, ~3% |
| C | ~25 | ~2 (`app.ts`, `todo.service.ts`) | 1 | laag, ~2% |
| D | ~150 | ~6 (`api.ts`, `db.ts`, `todo.service.ts`, `app.ts`, `app.html`, `app.css`) | 1–2 | middel, ~8% |

Alle slices blijven ruim onder de alarmgrens van 400 regels en 15 bestanden. Tests tellen niet mee.

## Open vragen

- geen

## Spec-wijzigingen

Na goedkeuring wordt deze spec nooit stilletjes aangepast. Een wijziging komt hier als verschil met de vorige versie, met de spec-bevinding die de aanleiding was.

| Versie | Datum | Aanleiding | Wijziging | Goedgekeurd door |
| --- | --- | --- | --- | --- |
