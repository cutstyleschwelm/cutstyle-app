CUTSTYLE – Salonverwaltung Cloud-Version

Diese Version verbindet die deutsche Verwaltungsoberfläche mit dem bestehenden Supabase-Projekt.

Funktionen:
- Anmeldung über Supabase Auth und Mitgliedschaft in cutstyle_members
- gemeinsame Cloud-Daten für Kunden, Termine, Leistungen und Mitarbeiter
- Terminübersicht Tag/Woche/Monat/Jahr
- Termin anlegen, bearbeiten, stornieren und reaktivieren
- Prüfung auf doppelte Termine je Mitarbeiter
- Kundenkarten anlegen und bearbeiten (Kontakt, Haarhinweise, Farbformel)
- Leistungen und Preise bearbeiten, Dauer eintragen, aktiv/inaktiv schalten
- Mitarbeiter bearbeiten und aktiv/inaktiv schalten
- responsive Oberfläche für PC, Tablet und Smartphone

WICHTIG:
- Bestehende Supabase-Daten werden nicht automatisch gelöscht oder neu angelegt.
- Die 33 aktiven Dienstleistungen haben derzeit keine Dauer. Diese kann im Menü „Leistungen & Preise“ eingetragen werden.
- Die Preis- und Dauerwerte können jederzeit direkt in der App geändert werden.
- Öffentliche Online-Terminbuchung für Kunden ist in dieser internen Verwaltungsoberfläche noch nicht aktiviert.
- Niemals einen Supabase Secret Key oder service_role-Key in den Browser eintragen. Verwendet wird nur der Publishable Key.
- Supabase RLS und cutstyle_members müssen korrekt eingerichtet sein. Die App kann nur auf Tabellen zugreifen, die dem angemeldeten Mitglied per RLS erlaubt sind.

DEPLOYMENT:
1. Vorhandenes GitHub-Repository „cutstyle-app“ öffnen.
2. Die Dateien index.html, app.js, style.css, manifest.webmanifest, sw.js, icon.svg, icon-192.png und icon-512.png im Repository-Stamm ersetzen bzw. hinzufügen.
3. Commit/Änderungen speichern.
4. GitHub Pages Deployment abwarten und die veröffentlichte Seite neu laden.
5. Zuerst mit dem Eigentümer-Konto anmelden und die Daten prüfen.

Diese ZIP-Datei enthält die Web-App-Dateien. Sie führt keine Änderungen am Supabase-Projekt aus.
