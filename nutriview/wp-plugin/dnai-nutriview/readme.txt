=== D²nAI NutriView ===
Contributors: dnai-nutricrops
Tags: dgssi, classification, securite, data, ocp, nutricrops
Requires at least: 6.0
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 0.7.0
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

= 0.7.0 =
Alignement complet sur le process métier (création → ingestion → extraction → validation) :
* Région obligatoire à la création (Global / Brazil / LATAM / South West Asia / Africa) — affichée sur les cartes Projets, la synthèse et le livrable PDF.
* Auto-mapping data domain : chaque donnée extraite est rattachée à son data domain (et donc à son owner) par recoupement avec les référentiels ; correction manuelle au Catalogue.
* Validation multi-propriétaires : la classification part vers CHAQUE data domain owner concerné ; chacun valide/signe uniquement les données de son périmètre ; le projet n'est clos (signé) que lorsque tous les périmètres ont été signés. Signature SHA-256 par périmètre + signature composite du projet à la clôture. Inbox et vue Validate scopées au périmètre, vue d'ensemble multi-propriétaires.
* Ingestion PowerPoint (.pptx) : extraction du texte des slides côté navigateur (sans réseau).
* Scan d'URL d'application : nouveau proxy souverain (inc/rest-api-scan.php) qui récupère la page côté serveur, en extrait le texte visible et le passe au pipeline d'extraction. Garde-fous : http(s) uniquement, timeout, taille plafonnée, content-type HTML/texte.
* Images (photo/scan) : acceptées à l'ingestion mais l'extraction par vision IA souveraine (Databricks multimodal) reste à brancher avec le modèle confirmé — message explicite, pas d'OCR factice côté navigateur.

= 0.6.0 =
Export PDF du livrable opposable :
* nouveau document imprimable (composant PrintReport) — en-tête institutionnel OCP Nutricrops · D²nAI, verdict cloud net (résidence MA obligatoire si sensible), inventaire tracé ligne par ligne avec citations DGSSI, mesures Annexe I, bloc signature (signataire + horodatage + empreinte SHA-256 complète), mentions légales + souveraineté ;
* boutons « Export PDF » (synthèse) et « Exporter le livrable signé » (bandeau de signature) → window.print() natif, PDF fidèle sans dépendance lib ;
* CSS @media print : masque tout le chrome applicatif et n'imprime QUE le rapport (format A4, couleurs forcées) ;
* logique d'agrégation extraite dans lib/report.ts (pur, testé : 9 tests), partagée pour de futurs dashboards ;
* document non signé clairement marqué « non opposable » ; le verdict et l'empreinte ne s'impriment qu'à partir des données réellement classées.

= 0.5.0 =
Phase 6 — Administration (gouvernance + accès) :
* nouvel écran Admin in-app (5 onglets) : Entités, Functions/BU, Data Domains, Data Domain Owners, Accès ;
* édition inline des 4 référentiels, persistés côté serveur (options dnai_nview_refs / dnai_nview_roles, autoload=no) ;
* 4 rôles applicatifs (Administrateur, Chef de projet, Propriétaire des données, Lecteur) assignés par login (= futur UPN Azure AD) ;
* amorçage first-run : tant qu'aucun administrateur n'est défini, tout utilisateur connecté a l'accès complet ; dès qu'un admin existe, les inconnus retombent en lecteur ;
* gating UI : bouton « Nouveau projet » (chef de projet/admin), Inbox (propriétaire/admin), Admin (admin) ;
* création de projet branchée sur les référentiels (selects Entité/BU/Data domain, owner auto-rempli depuis le domaine) ;
* catalogue : data domain assignable par donnée (badge + select) ;
* backend rest-api-refs.php : GET /admin/config, PUT /admin/refs, PUT /admin/roles ; bridge boot injecte refs/roles/govReady ;
* note : un nouvel utilisateur dans l'onglet Accès n'a aucun rôle par défaut (évite que l'admin courant ne se verrouille en saisissant son propre login).

= 0.4.1 =
HOTFIX rendu /nutriview :
* le bundle Vite singlefile contient des littéraux JS "</head>" et "<body>" (code XLSX qui parse du HTML). Le str_replace('</head>', …) du template_redirect matchait la PREMIÈRE occurrence (dans le JS), injectant un <script></script> au milieu du bundle. Conséquence : le navigateur fermait la balise <script> prématurément, et le reste du bundle s'affichait en TEXTE BRUT sur la page (cf. capture utilisateur). Fix : strrpos pour cibler la DERNIÈRE </head> (la vraie). Smoke Playwright vs serveur PHP servant le HTML, ajouté pour ne plus passer à côté.

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
