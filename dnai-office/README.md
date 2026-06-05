# D²nAI Office — Hamza's digital twin

Un assistant IA local qui filtre les sollicitations entrantes (mails Outlook,
puis Teams en V2), répond à ce qui rentre dans le scope autorisé, et te
transmet le reste — en se signant explicitement *"Hamza's digital twin — D²nAI"*
pour qu'il n'y ait aucune ambiguïté sur le fait que c'est un bot.

## Pourquoi c'est différent des "AI assistants" SaaS

- **Zéro intervention IT** sur Exchange. L'agent tourne sur ton poste,
  lit Outlook desktop via MAPI/COM avec tes credentials AD.
- **Tes mails ne quittent jamais ta machine**, sauf l'envoi au backend
  LLM, qui reste à l'intérieur du tenant OCP (proxy D²nAI déjà déployé).
- **Garde-fous durs en double couche** (input classifier + output validator).
  Le bot ne dira jamais "je confirme", "le prix est X", "le budget est Y".
- **Console d'administration WordPress** dans le même pattern que
  NutriPlan et CGM Cockpit — pas de réinvention de la roue.

## Structure du dépôt

```
dnai-office/
├─ agent/                              # Agent Python qui tourne sur le poste Windows
│  ├─ dnai_office/
│  │   ├─ outlook.py                   # MAPI/COM bridge → lit & écrit Outlook
│  │   ├─ classifier.py                # Routing par sender (whitelist/blacklist/watchlist)
│  │   ├─ guardrails.py                # Input/output validators (sujets interdits)
│  │   ├─ llm.py                       # Client LLM provider-agnostique
│  │   ├─ config.py                    # Chargement %APPDATA%\dnai-office\config.json
│  │   └─ agent.py                     # Boucle principale
│  ├─ run.py                           # Point d'entrée
│  ├─ requirements.txt
│  ├─ build.bat                        # PyInstaller → dnai-office-agent.exe
│  └─ README.md
└─ wp-plugin/dnai-office/              # Console d'administration WordPress
   ├─ dnai-office.php                  # Plugin + REST endpoints
   ├─ app/console.html                 # UI de la console
   └─ readme.txt
```

## Roadmap

| Vague | Quoi | Quand |
|---|---|---|
| V0 — POC perso | Agent + console fonctionnels sur le poste de Hamza · whitelist + drafts + log | Semaine 1-3 |
| V1 — Pilote managers | 5 managers OCP volontaires · indexation corpus · signed .exe | Semaine 4-7 |
| V2 — Teams + memory | Channel Teams bot · indexation conversationnelle · self-onboarding | Semaine 8-12 |
| V3 — GA D²nAI Office | Produit catalogue D²nAI · SSO Azure AD · 50 managers OCP | Q1 2027 |

## Disclaimer

Le bot s'identifie toujours comme un bot. La signature *"Hamza's digital twin
— D²nAI"* est non désactivable. Aucun engagement n'est jamais pris au nom de
Hamza par le bot.
