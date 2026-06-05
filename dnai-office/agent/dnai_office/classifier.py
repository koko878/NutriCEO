"""
D²nAI Office Agent — sender + topic classifier.

Decides whether the bot is allowed to draft a reply to a given mail.

Three input lists drive the routing:
- whitelist: bot-first contacts (delegated by Hamza)
- blacklist: never bot (always human)
- watchlist: always escalate immediately (e.g. CEO, EVPs)

If the sender is not in any list, the agent falls back to "draft only,
do not send" — Hamza reviews everything from unknown senders in his
daily digest.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Iterable


class Routing(str, Enum):
    BOT_AUTOSEND = "bot_autosend"
    BOT_DRAFT_ONLY = "bot_draft_only"
    HUMAN = "human"
    ESCALATE = "escalate"


@dataclass
class SenderVerdict:
    routing: Routing
    reason: str


def _match(addr: str, patterns: Iterable[str]) -> bool:
    addr = addr.lower().strip()
    for p in patterns:
        p = p.lower().strip()
        if not p:
            continue
        # Domain match: "@domain.com"
        if p.startswith("@") and addr.endswith(p):
            return True
        # Full address match
        if addr == p:
            return True
    return False


def classify_sender(
    sender_email: str,
    whitelist: list[str],
    blacklist: list[str],
    watchlist: list[str],
    auto_send_enabled: bool,
) -> SenderVerdict:
    if _match(sender_email, watchlist):
        return SenderVerdict(Routing.ESCALATE, "Sender is on the watchlist (immediate human review).")
    if _match(sender_email, blacklist):
        return SenderVerdict(Routing.HUMAN, "Sender is on the blacklist — never bot.")
    if _match(sender_email, whitelist):
        if auto_send_enabled:
            return SenderVerdict(Routing.BOT_AUTOSEND, "Sender on whitelist + auto-send enabled.")
        return SenderVerdict(Routing.BOT_DRAFT_ONLY, "Sender on whitelist; auto-send disabled.")
    # Unknown sender → bot drafts but does not send.
    return SenderVerdict(Routing.BOT_DRAFT_ONLY, "Unknown sender — drafting for Hamza's review.")
