=== D²nAI NutriView ===
Contributors: dnai-nutricrops
Tags: dgssi, classification, securite, data, ocp, nutricrops
Requires at least: 6.0
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 0.4.0
License: GPL-2.0-or-later

Assistant DGSSI de classification des données pour OCP Nutricrops (équipe D²nAI). Sert l'application React mono-fichier en plein écran (`/nutriview`) ou via shortcode `[nutriview]`. v0.4 : workflow signature SHA-256 + inbox propriétaire + notifications email.

== Description ==

NutriView accompagne le chargé de projet sur le parcours complet de classification :

* inventaire des données du projet (ingestion Excel / PDF / Word / .eml / texte côté navigateur, ou saisie manuelle) ;
* attribution des niveaux Confidentialité / Intégrité / Disponibilité (échelle décret 2-21-406) ;
* calcul déterministe de la classe (I–V) et du verdict cloud (résidence MA obligatoire si données sensibles loi 05-20) ;
* mesures de protection Annexe I suggérées en fonction de la classe ;
* assistance IA via Databricks Model Serving souverain (Sonnet 4.6 par défaut), citations obligatoires Annexe II ;
* workflow validation : envoi à l'inbox du propriétaire des données ;
* signature électronique simple : hash SHA-256 du contenu classifié, horodatée, apposée par le propriétaire.

== Installation ==

1. Construire l'app : `cd nutriview-app && npm install && npm run build`.
2. Copier `nutriview-app/dist/index.html` vers `app/nutriview.html` dans ce plugin.
3. Téléverser le dossier `dnai-nutriview/` dans `wp-content/plugins/` et activer.
4. Accès direct : `https://votre-site/nutriview` (ou shortcode `[nutriview]`).
5. (Optionnel — IA) Réglages → NutriView AI : renseigner workspace Databricks + PAT + modèle.
6. (Optionnel — audit) Outils → NutriView Validations : journal des envois et signatures.

== Changelog ==

= 0.4.0 =
Phase 5 — workflow signature + inbox propriétaire :
* nouvelle vue Inbox (header global) listant les projets `in_review` dont l'utilisateur est `dataOwner`, pastille compteur ;
* nouvelle vue Validate (ligne par ligne) : « Tout valider » + modale signature SHA-256 ;
* synthèse : CTA « Envoyer en validation » (drafting → in_review), bandeau « En attente » puis « Classification signée » avec hash hex ;
* backend `rest-api-validation.php` : POST /validation/submit (wp_mail propriétaire), POST /validation/sign (wp_mail chef de projet), GET /validation/log ;
* page admin Outils → NutriView Validations (journal 30 dernières entrées) ;
* catalogue : badge « IA · proposé » distinct pour les items extraits par l'IA.

= 0.3.x =
Phase 4 — IA Databricks (proxy WP souverain) : Sonnet 4.6 par défaut, JSON Schema strict, garde-fou citations Annexe II, mock local en standalone, extraction catalogue depuis brief texte.

= 0.1.0 =
Phases 0-3 : scaffolding + moteur déterministe + UI catalog + ingestion multi-format (sans IA, sans backend).
