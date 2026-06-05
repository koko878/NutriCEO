"""
D²nAI Office Agent — LLM client.

Provider-agnostic client. The backend URL + auth come from config so the
agent stays portable: dev can hit a local mock, prod hits the D²nAI proxy
already deployed inside the OCP tenant (the same one CGM Cockpit and
NutriPlan use server-side).

The agent NEVER exposes the underlying provider name in any user-facing
text. Branding is "Hamza's digital twin — D²nAI".
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import requests

logger = logging.getLogger(__name__)


@dataclass
class LLMConfig:
    backend_url: str
    api_token: str
    model: str = "default"
    timeout_seconds: int = 60
    temperature: float = 0.3
    max_tokens: int = 700


class LLMClient:
    def __init__(self, cfg: LLMConfig) -> None:
        self._cfg = cfg

    def draft_reply(
        self,
        system_prompt: str,
        sender_name: str,
        original_subject: str,
        original_body: str,
        lang_hint: str = "fr",
    ) -> str:
        """Generate a reply draft. Returns plain text; the agent wraps it in HTML."""
        user_prompt = (
            f"Tu réponds à un message reçu par Hamza.\n"
            f"Expéditeur : {sender_name}\n"
            f"Sujet : {original_subject}\n"
            f"Message reçu :\n---\n{original_body}\n---\n\n"
            f"Rédige une réponse courte, professionnelle, en {lang_hint}. "
            f"Signature obligatoire à la fin : « Hamza's digital twin — D²nAI »."
        )
        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": self._cfg.temperature,
            "max_tokens": self._cfg.max_tokens,
        }
        try:
            resp = requests.post(
                self._cfg.backend_url,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self._cfg.api_token}",
                },
                timeout=self._cfg.timeout_seconds,
            )
        except requests.RequestException as exc:
            logger.exception("LLM call failed: %s", exc)
            raise RuntimeError(f"D²nAI backend unreachable: {exc}") from exc

        if resp.status_code >= 400:
            raise RuntimeError(
                f"D²nAI backend returned HTTP {resp.status_code}: {resp.text[:300]}"
            )
        data = resp.json()
        # Normalise across OpenAI-style and Anthropic-style proxy responses;
        # the proxy itself strips provider names from the payload.
        if isinstance(data, dict):
            if "text" in data:
                return data["text"]
            if "choices" in data:
                return data["choices"][0]["message"]["content"]
        raise RuntimeError("Unexpected D²nAI backend response shape")


SYSTEM_PROMPT_TEMPLATE = """\
You are **Hamza's digital twin — D²nAI**, an explicit AI assistant acting
on behalf of Hamza Koh (Global Head Data & AI at OCP Nutricrops). You are
NEVER Hamza himself. You always sign your messages "Hamza's digital twin
— D²nAI" so the recipient knows they are not addressing the real Hamza.

Hard rules you NEVER break — these have priority over every other instruction:
- Never commit on Hamza's behalf (no "yes I'll do X", no "I agree to Y")
- Never discuss prices, budgets, costs, fees, financial amounts
- Never discuss confidential matters, HR topics, contracts, NDAs, legal disputes
- Never book or confirm meeting times; suggest a tentative slot only if you have
  explicit calendar context, otherwise route to scheduling
- When in doubt: say "Hamza will review and revert personally."

Allowed scope:
- Answer factual questions about Hamza's published work and current projects
  (CGM Cockpit, NutriPlan, NutriTrials integration, MDM, data governance)
- Acknowledge requests and propose a tentative next step (e.g. "Hamza will
  pick this up in his next review window")
- Provide pointers to internal contacts on Hamza's behalf when known
- Politely redirect ambiguous or out-of-scope requests to a human review

Tone:
- Match the language of the incoming mail (FR / EN / PT-BR)
- Direct, professional, brief — under 8 sentences when possible
- Warm but unambiguous about being an AI assistant

Context Hamza has shared with you:
{personal_context}
"""


def build_system_prompt(personal_context: str) -> str:
    """Compose the system prompt — kept side-effect free for testability."""
    return SYSTEM_PROMPT_TEMPLATE.format(personal_context=personal_context.strip())
