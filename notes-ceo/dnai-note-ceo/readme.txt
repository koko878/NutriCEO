=== D²nAI Note CEO ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 1.0.1
Requires at least: 6.0
Requires PHP: 7.4
License: GPL-2.0-or-later

Plugin léger qui héberge la note mensuelle « Statut & stratégie D²nAI »
adressée au CEO d'OCP Nutricrops. Le plugin n'a pas de dépendance externe :
il sert un HTML statique (charte D²nAI, responsive iPhone) sous une URL
plein écran prête à partager via WhatsApp, iMessage, e-mail.

== Install ==
1. Plugins → Add New → Upload Plugin → choisir dnai-note-ceo.zip → Install.
2. Activate.
3. Si les jolies URLs renvoient 404, aller dans Réglages → Permaliens → Save.

== Use ==
URL plein écran (à partager via WhatsApp — carte d'aperçu Open Graph
automatique, ouvre dans Safari par défaut sur iPhone) :
  https://VOTRE-SITE/note-ceo            (dernière note publiée)
  https://VOTRE-SITE/note-ceo/2026-06    (mois précis)

Shortcode pour intégration dans une page WP :
  [note_ceo]                  → dernière note
  [note_ceo month="2026-06"]  → mois précis

== Ajouter la note du mois suivant ==
1. Déposer app/note-ceo-AAAA-MM.html
2. Ajouter l'entrée dans dnai_nceo_files()
3. Mettre à jour la constante DNAI_NCEO_LATEST
4. Bumper la version du plugin

== Changelog ==

= 1.0.1 =
* Retrait des badges « Décision attendue avant le 30 juin » et radoucissement
  de la synthèse (« Deux décisions à arbitrer » au lieu de « tranchées d'ici
  fin juin ») — ton moins ultimatum, plus proposition.

= 1.0.0 =
* Première édition — note CEO juin 2026.
* Routing /note-ceo et /note-ceo/AAAA-MM (URL propres pour partage WhatsApp).
* Shortcode [note_ceo month="..."] avec iframe full-bleed.
* Headers : noindex/nofollow, no-cache, content-type HTML.
