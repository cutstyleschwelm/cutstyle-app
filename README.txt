CutStyle – Cloud-Version (erste Synchronisationsversion)

Sprache der App: Deutsch.
Backend: Supabase Free. Die App verwendet die Supabase Publishable Key im Browser und meldet Benutzer per E-Mail/Passwort an.

WICHTIG:
- Niemals einen Supabase Secret Key oder service_role-Key in diese App eintragen.
- Der Zugriff wird über Supabase Auth und Row Level Security (RLS) begrenzt.
- Diese Version ist für den internen Salonbetrieb vorgesehen. Öffentliche Online-Terminbuchung ist noch NICHT aktiviert.
- Vor echten Kundendaten bitte zunächst mit Testdaten auf Telefon/Tablet prüfen.
- Supabase Free ist ein kostenloser Tarif mit Nutzungsgrenzen; kostenlos bedeutet nicht unbegrenzt oder garantiert dauerhaft verfügbar.

Dateien:
index.html, app.js, style.css, sw.js, manifest.webmanifest, Icons.

Deployment: Ersetze die bisherigen Dateien im GitHub-Repository cutstyle-app durch diese Dateien und warte auf GitHub Pages.
