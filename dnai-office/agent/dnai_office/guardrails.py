"""
D²nAI Office Agent — guardrails (input classifier + output validator).

Two-stage discipline, never one alone:

1. INPUT CLASSIFIER — runs on the raw incoming mail body. If the topic falls
   into the forbidden zone (pricing, budget, contracts, commitments,
   confidential matters, HR), we skip generation entirely and escalate.

2. OUTPUT VALIDATOR — runs on the LLM-generated draft. Even if the input
   passed, the LLM might still drift; we scan for forbidden patterns
   ("I confirm", "budget is", currency symbols, etc.) and block.

The forbidden topics are listed in `FORBIDDEN_TOPIC_KEYWORDS` per language
and can be tuned at runtime via the admin console.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class GuardDecision(str, Enum):
    ALLOW = "allow"
    ESCALATE = "escalate"
    BLOCK = "block"


@dataclass
class GuardrailVerdict:
    decision: GuardDecision
    reason: str
    matched: list[str]


# Default forbidden patterns. Localized in FR/EN/PT-BR because Hamza's
# incoming mails are tri-lingual at OCP Nutricrops.
FORBIDDEN_TOPIC_KEYWORDS: dict[str, list[str]] = {
    "money": [
        # numbers with currency markers
        r"\b(usd|eur|mad|\$|€)\s?\d", r"\b\d+\s?(usd|eur|mad|k|m)\b",
        # FR
        r"\bprix\b", r"\bbudget\b", r"\bdevis\b", r"\bcoût\s?(s|s?)\b",
        r"\btarif\b", r"\bhonoraires\b", r"\bmontant\b", r"\benveloppe\b",
        # EN
        r"\bprice\b", r"\bpricing\b", r"\bquote\b", r"\bcost\s?(s)?\b",
        r"\bbudget\b", r"\bamount\b", r"\bfee\s?(s)?\b",
        # PT-BR
        r"\bpreço\b", r"\borçamento\b", r"\bvalor\b", r"\bcusto\b",
    ],
    "commitment": [
        # FR — strong commitment verbs
        r"\bje\s+(confirme|m'engage|valide|approuve|signe|garantis)\b",
        r"\bcommitment\b", r"\bd'?accord pour\b",
        # EN
        r"\bI\s+(confirm|commit|agree to|approve|sign|guarantee)\b",
        # PT
        r"\b(confirmo|comprometo|aprovo|assino|garanto)\b",
    ],
    "confidential": [
        r"\bconfidentiel(?:le)?\b", r"\bconfidential\b", r"\bconfidencial\b",
        r"\bstrictement\s+confidentiel\b", r"\bstrictly\s+confidential\b",
        r"\bsensible\s+data\b", r"\bsecret\b", r"\bsegredo\b",
    ],
    "hr": [
        r"\baugmentation\b", r"\bsalaire\b", r"\bsalary\b", r"\bbonus\b",
        r"\bpromotion\b", r"\bcontract negotiation\b", r"\bnégociation\s+contrat\b",
        r"\brh\b", r"\bhuman resources\b",
    ],
    "legal": [
        r"\bcontrat\b", r"\bcontract\b", r"\bcontrato\b", r"\bnda\b",
        r"\baccord-cadre\b", r"\bmaster agreement\b", r"\blitiges?\b",
        r"\blawsuit\b", r"\baction en justice\b",
    ],
}


# Output patterns the LLM should NEVER emit. Even if input passes, we filter
# the draft before sending.
FORBIDDEN_OUTPUT_PATTERNS: list[str] = [
    # Commitments in any language
    r"\b(je confirme|i confirm|confirmo)\b",
    r"\b(je m'engage|i commit|me comprometo)\b",
    r"\b(d'accord pour|i agree to|de acordo com)\b",
    r"\b(je signe|i sign|eu assino)\b",
    # Money emissions
    r"\$\s?\d", r"€\s?\d", r"\bmad\s?\d",
    r"\b\d+\s?(k|m)?\s?(usd|eur|mad)\b",
    # Calendar bindings
    r"\b(le|on|in)\s+\d{1,2}/\d{1,2}\s+à\s+\d{1,2}h",
    r"\bbooked\b.*\bcalendar\b",
]


def classify_input(body: str, subject: str = "") -> GuardrailVerdict:
    """Decide whether the LLM is allowed to draft a reply at all."""
    haystack = f"{subject}\n{body}".lower()
    matched: list[str] = []
    for topic, patterns in FORBIDDEN_TOPIC_KEYWORDS.items():
        for pat in patterns:
            if re.search(pat, haystack, flags=re.IGNORECASE):
                matched.append(f"{topic}:{pat}")
    if matched:
        return GuardrailVerdict(
            decision=GuardDecision.ESCALATE,
            reason="Forbidden topic detected in input — escalating to human.",
            matched=matched,
        )
    return GuardrailVerdict(GuardDecision.ALLOW, "Input clean for drafting.", [])


def validate_output(draft_text: str) -> GuardrailVerdict:
    """Scan the LLM-generated draft. Block before it reaches the Outbox."""
    matched = [
        pat for pat in FORBIDDEN_OUTPUT_PATTERNS
        if re.search(pat, draft_text, flags=re.IGNORECASE)
    ]
    if matched:
        return GuardrailVerdict(
            decision=GuardDecision.BLOCK,
            reason="Draft contains forbidden phrasing — escalating to human.",
            matched=matched,
        )
    return GuardrailVerdict(GuardDecision.ALLOW, "Draft cleared.", [])
