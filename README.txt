CutStyle – Cloud-Version 4

Diese Version lädt die Kundenliste ohne Sortier-Abhängigkeit und erkennt mehrere mögliche Namensfelder. Die App zeigt jetzt ausdrücklich an, wenn Supabase zwar verbunden ist, aber keine Kundenzeilen zurückliefert. In diesem Fall sind die Daten nicht automatisch gelöscht; wahrscheinlich müssen die SELECT-/RLS-Berechtigungen der Tabelle customers geprüft werden.

Dateien: index.html, app.js, style.css, sw.js, manifest.webmanifest, Icons.

WICHTIG: Nur den Supabase Publishable Key im Browser verwenden. Niemals Secret-/service_role-Key eintragen. Vor echten Kundendaten mit Testdaten prüfen.
