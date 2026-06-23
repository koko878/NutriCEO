# Shape brief — Composant `<Verdict>`

> Issu de `/impeccable shape verdict-cloud-panel`, confirmé par l'utilisateur.
> Source d'autorité design pour l'implémentation du composant. À lire avant tout `craft` ou `polish` qui touche au verdict cloud.

## 1. Feature Summary
Composant React unique `<Verdict>` qui matérialise le résultat de classification cloud. Deux densités (`inline` dans la classification par donnée, `synthese` dans la vue projet finale), deux issues (`eligible` cloud / `sensible` → résidence MA obligatoire). **Moment hero du produit** — c'est là que NutriView produit sa valeur métier.

## 2. Primary User Action
- *Chargé de projet* : **comprendre en 5 secondes** si le projet peut aller au cloud étranger, et — sinon — quelle action engager (hébergeurs MA, dérogation, ajustement périmètre).
- *Propriétaire des données* : **valider que la suggestion IA reflète la réalité** avant signature.

## 3. Design Direction
- **Color strategy** : *Committed* sur `synthese + sensible` (fond ambre porte le verdict, ~40% de surface). *Restrained* partout ailleurs. Override local justifié par "le verdict est un moment".
- **Scene** : *« Un chargé de projet ouvre la synthèse en sortant d'une réunion d'archi cloud, sur son laptop pro, en open-space en milieu d'après-midi. Il doit savoir, sans plisser les yeux, si le projet est bloqué ou pas. »* → light mode, contrastes nets.
- **Anchors** : (a) avis officiel de l'Autorité de la concurrence (titre serif posé, citation d'article, ton facilitateur), (b) Stripe payment receipt (page dédiée au verdict, vie d'écran complète), (c) NHS booking confirmation (institutionnel chaleureux, action button claire).
- Couleurs : accent **vert OCP** pour positif, **ambre profond** (oklch ~0.52 / 0.15 / 60) pour négatif. **Pas rouge alarmiste** — anti-pattern "panic page", dissonant avec "facilitateur". Rouge réservé aux erreurs système.

## 4. Scope
- Fidélité : **production-ready** (composant runtime).
- Breadth : un composant + 4 combinaisons effectives (2 densités × 2 issues).
- Interactivité : boutons d'action, expand inline → synthese (modale).
- Time intent : **polir jusqu'à devenir l'écran qu'on screenshot pour la démo CDO**.

## 5. Layout Strategy
- **`inline + eligible`** : une ligne discrète dans le flux — badge vert *Cloud éligible* + comptage *4 mesures à respecter* + chevron *voir détails*. Confirmation, pas annonce.
- **`inline + sensible`** : carte 2 lignes serrée, contraste haut — pictogramme + *Donnée sensible — résidence Maroc* + sous-ligne *loi 05-20 · classe II ou supérieure*. Cliquable → modale synthese.
- **`synthese + eligible`** : carte large posée — titre Cormorant *Projet éligible au cloud* + paragraphe (*Aucune donnée sensible identifiée. Hébergement autorisé hors territoire national sous réserve des mesures listées ci-dessous.*) + liste mesures graduées Annexe I + footer 2 actions (*Exporter PDF* / *Inviter à signer*).
- **`synthese + sensible`** : **pleine largeur**. Fond ambre clair (oklch ~0.96/0.05/75) + hairline ambre, **pas de side-stripe**. Titre Cormorant 38px *Résidence Maroc obligatoire*. Sous-titre Inter 15px *Ce projet contient {n} donnée(s) sensible(s) au sens loi 05-20*. **2 colonnes** : *Pourquoi* (blockquote citation art. 26 loi 05-20, niveaux CID atteints, classe) / *Que faire maintenant ?* (3 actions : *Voir hébergeurs MA* / *Demander dérogation RSSI* / *Ajuster périmètre data*). Footer : *Comprendre le référentiel DGSSI →*.

**Bannis** : hero-metric, glassmorphism, gradient text, rouge alarmiste, emoji.

## 6. Key States
- `loading` : skeleton ≤ 200ms, sinon direct (calcul synchrone). Pas de spinner.
- `default eligible` (inline) : badge vert, 1 ligne.
- `default sensible` (inline) : carte ambre, 2 lignes.
- `default eligible` (synthese) : carte large vert subtil.
- `default sensible` (synthese) : pleine largeur ambre.
- `empty/incomplet` (≥ 1 dim non évaluée) : carte grise *Classification incomplète — évaluez les 3 dimensions*.
- `proposé par IA non validé` (inline) : liseré ambre clair + badge *IA · à valider*.
- `révisé par owner` (synthese) : indicator *révisé par {owner}* discret, historique cliquable.
- `error` (échec calcul, ne devrait pas arriver) : carte rouge *Erreur de calcul. Recharger.*

## 7. Interaction Model
- Clic sur `inline` → expand vers `synthese` en **modale** (préserve flux classification, ESC ferme).
- Hover citation loi → tooltip avec extrait étendu (`annexe2.ts`).
- *Voir hébergeurs MA conformes* → side-panel avec liste minimaliste hardcodée v1 : **Datacenter Nutricrops Khouribga, Datacenter OCP Casa, OVH Maroc, Inwi Cloud** (à valider RSSI). Évolution vers catalogue admin en phase 2.
- *Exporter PDF* → `window.print()` avec stylesheet print dédiée (synthese seulement).
- Motion : `opacity .15s + transform .25s ease-out-quart`. `prefers-reduced-motion` → crossfade instantané.

## 8. Content Requirements
**Titres exacts** :
- inline eligible : `Cloud éligible`
- inline sensible : `Donnée sensible — résidence Maroc`
- synthese eligible : `Projet éligible au cloud`
- synthese sensible : `Résidence Maroc obligatoire`

**Citation pied** : `loi 05-20 sur la cybersécurité · décret 2-21-406 · Guide DGSSI v1.0 (juillet 2025)`.

**Microcopy actions** : `Exporter le dossier PDF` · `Inviter le propriétaire à signer` (disabled v1, tooltip *Phase 5 — workflow signature*) · `Voir les hébergeurs MA conformes` · `Demander une dérogation RSSI` · `Ajuster le périmètre data`.

**Picto** : Phosphor (`ShieldCheck` eligible, `MapPinLine` résidence MA, `Info` pédagogique).

## 9. Recommended References
- `layout.md` — synthese sensible (asymétrique, 2 colonnes pédagogique / action).
- `typeset.md` — Cormorant 38px titre + Inter 15px corps + hiérarchie sans hero-metric.
- `colorize.md` — palette ambre + vert, contraste AA strict.
- `clarify.md` — affûter libellés et phrase pédagogique.
- `animate.md` (léger) — transition inline → modale, reduced-motion.

## 10. Decided defaults (open questions tranchées)
- Expand inline → synthese : **modale** (pas route).
- Catalogue hébergeurs MA : **4 entrées hardcodées v1**, vrai catalogue admin en phase 2.
- Verdict sensible ne **bloque pas** la signature : le propriétaire signe la classification (acte de constat), pas la décision d'archi.
- Bouton *Inviter à signer* présent mais **disabled v1** avec tooltip `Phase 5`.

---

*Brief shape · validé par l'utilisateur · juin 2026. À relire avant tout `craft` ou `polish` du verdict cloud.*
