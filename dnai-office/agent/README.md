# D²nAI Office — agent local Windows

Agent en arrière-plan qui pilote Outlook desktop sur le poste de l'utilisateur
pour générer des réponses automatiques signées « **Hamza's digital twin —
D²nAI** » — sans accès EWS côté serveur Exchange, sans intervention IT
centrale.

## Pourquoi local plutôt que serveur

- **Aucune demande IT** pour ouvrir Exchange Web Services. L'agent
  s'authentifie comme l'utilisateur (AD/Kerberos via MAPI/COM).
- **Les mails ne quittent jamais la machine** sauf le strict minimum
  nécessaire à l'appel LLM, qui reste dans le tenant OCP (proxy D²nAI
  déjà déployé).
- **Évolutivité** : chaque manager pilote installe le `.exe` sur son
  poste — IT n'a qu'à autoriser un binaire signé, pas à reconfigurer le
  serveur de mail.

## Architecture

```
Outlook desktop  ⇄  MAPI/COM (pywin32)
                       │
                       ▼
              ┌─────────────────────┐
              │ dnai_office.agent   │  scan → classify → draft → validate
              │  ├─ outlook.py      │
              │  ├─ classifier.py   │
              │  ├─ guardrails.py   │
              │  ├─ llm.py          │
              │  └─ config.py       │
              └─────────────────────┘
                       │
                       ▼
      HTTPS via VPN ⇒ D²nAI proxy (backend LLM dans le tenant OCP)
```

Côté Outlook, l'agent ne touche que trois surfaces :
- **Inbox** : scan des nouveaux mails depuis le dernier cycle.
- **Drafts** : écriture des réponses générées (avec délai d'envoi
  révocable via `DeferredDeliveryTime`).
- **Catégorie `D2nAI-Office-processed`** : marqueur de dédoublonnage.

## Garde-fous (double couche)

1. **Classifier d'entrée** (`guardrails.classify_input`) — détecte
   pricing / budget / confidentiel / engagement / HR / juridique et
   **escalade sans générer**.
2. **Validateur de sortie** (`guardrails.validate_output`) — scanne le
   draft généré pour les phrases interdites avant qu'il n'atterrisse
   dans la file d'envoi.

Les listes sont localisées FR / EN / PT-BR et reconfigurables depuis la
console d'administration (plugin WordPress `dnai-office`).

## Installation (POC personnel)

Prérequis sur le poste cible :

- Windows 10/11
- Outlook desktop installé et connecté à la boîte cible
- Accès VPN OCP (pour atteindre le backend D²nAI)
- Python 3.11+ (pour le build .exe — non requis pour exécuter le .exe
  packagé)

Pour exécuter en mode dev :

```bat
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

Pour générer le `.exe` distribuable :

```bat
pip install pyinstaller
build.bat
```

Le `.exe` produit est dans `dist\dnai-office-agent.exe`. Il se lance
sans console et tourne en arrière-plan. Pour qu'il démarre avec la
session Windows, créer un raccourci dans `shell:startup`.

## Configuration

L'agent lit `%APPDATA%\dnai-office\config.json` à chaque cycle.
La console d'admin (`/dnai-office` côté WordPress) écrit ce fichier.

Champs principaux :

```json
{
  "backend_url": "https://.../v1/chat",
  "backend_token": "...",
  "poll_seconds": 30,
  "delay_send_minutes": 5,
  "delay_send_enabled": true,
  "digest_to": "hamza@...",
  "personal_context": "Hamza Koh, Global Head Data & AI...",
  "whitelist": ["@partner.com", "person@bu.com"],
  "blacklist": [],
  "watchlist": ["ceo@..."],
  "auto_send_enabled": true
}
```

## Activity log + daily digest

Chaque cycle écrit une ligne JSON dans
`%APPDATA%\dnai-office\activity.jsonl`. La console d'admin lit ce
fichier pour afficher :

- nb de mails traités, drafted, blocked, escalated
- historique recherchable par expéditeur / sujet
- digest 18h prêt à expédier par mail à `digest_to`

## Limites du POC

- Marche uniquement quand Outlook desktop tourne. Si la machine est
  éteinte, le bot dort.
- Pas de gestion des pièces jointes (V0).
- Indexation du corpus à venir (V1) — pour le POC le `personal_context`
  est saisi à la main dans la console.
