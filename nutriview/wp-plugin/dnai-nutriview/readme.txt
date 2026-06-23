=== D²nAI NutriView ===
Contributors: dnai-nutricrops
Tags: dgssi, classification, securite, data, ocp, nutricrops
Requires at least: 6.0
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPL-2.0-or-later

Assistant DGSSI de classification des données pour OCP Nutricrops (équipe D²nAI). Sert l'application React mono-fichier en plein écran (`/nutriview`) ou via shortcode `[nutriview]`.

== Description ==

NutriView accompagne le chargé de projet sur le parcours complet de classification :

* inventaire des données du projet (ingestion Excel / PDF / Word / .eml / texte côté navigateur, ou saisie manuelle) ;
* attribution des niveaux Confidentialité / Intégrité / Disponibilité (échelle décret 2-21-406) ;
* calcul déterministe de la classe (I–V) et du verdict cloud (résidence MA obligatoire si données sensibles loi 05-20) ;
* mesures de protection Annexe I suggérées en fonction de la classe.

Les phases 4 (assistance IA via Databricks Model Serving souverain) et 5 (workflow validation/signature horodatée) seront branchées dans des versions ultérieures.

== Installation ==

1. Construire l'app : `cd nutriview-app && npm install && npm run build`.
2. Copier `nutriview-app/dist/index.html` vers `app/nutriview.html` dans ce plugin.
3. Téléverser le dossier `dnai-nutriview/` dans `wp-content/plugins/` et activer.
4. Accès direct : `https://votre-site/nutriview` (ou shortcode `[nutriview]`).

== Changelog ==

= 0.1.0 =
Phases 0-3 : scaffolding + moteur déterministe + UI catalog + ingestion multi-format (sans IA, sans backend).
