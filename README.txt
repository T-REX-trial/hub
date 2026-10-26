T-REX hub, update 11 (22 Oct 2026)

Co nowego
- Follow-up: kliknięcie pacjenta otwiera umawianie wizyty (data, godzina, typ wizyty, lista badań przed wizytą lub w dniu wizyty)
- Kalendarz: przeciągnij wizytę na inny dzień, żeby ją umówić na ten termin; kliknięcie = umów / zmień / odwołaj
- "+ Add visit": dodatkowa wizyta (FUP with physician, MRI, CT, Labs, Rectoscopy, Colonoscopy, Other)
- wizyty z Airtable domyślnie: FUP with physician
- zapis: tabela "Visits" w Airtable (formularz "Book visit (hub)")
- (z update 10) wgrywanie dokumentów i dodawanie członków zespołu, protokół v1.2

Jak wgrać na GitHub
1. github.com/kpolomska/T-REX-hub → Add file → Upload files
2. Przeciągnij 6 plików: app.js, build.py, content.enc, saved.html, seal.js, template.html
3. Commit changes.

Opcjonalnie: szybsze odświeżanie (co 15 min zamiast co godzinę)
1. W repozytorium otwórz .github/workflows/deploy.yml → ikona ołówka (Edit)
2. Zmień linię   - cron: "17 * * * *"   na   - cron: "*/15 * * * *"
3. Commit changes.
