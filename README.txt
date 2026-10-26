T-REX hub, update 19 (26 Oct 2026)

Co nowego
- nowy link do protokołu v1.2 (przycisk Protocol, Links, Documents → General)
- Gdańsk: jako lead tylko P. Spychalski
- usunięty tekst pod listą Follow-up i sekcja "Queries and corrections" w instrukcji Ledidi
- Team & links: link do ClinicalTrials.gov (NCT07669298)
- wersja mobilna: menu na dole ekranu, pacjenci jako karty, okna na pełny ekran
- zawsze jasne tło; prostszy układ (nagłówek tylko na Overview, ośrodki: mapa + lista w jednej sekcji, Updates ukryte gdy puste)
- naprawione wyświetlanie badań w kolumnie "At this visit" (Pelvic MRI itp.)
- wizyta jest "booked" tylko gdy data różni się od wyliczonej albo została umówiona przez stronę
- ekran logowania: przy złym haśle pokazuje kontakt do koordynatorki zamiast podpowiedzi o nazwie kraju
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
