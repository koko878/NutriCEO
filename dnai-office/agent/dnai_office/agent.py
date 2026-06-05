"""
D²nAI Office Agent — main polling loop.

Runs as a tray-resident background process on Hamza's Windows machine.
Every `poll_seconds` it pulls new mails from Outlook, routes each through
the classifier + guardrails, asks the LLM for a draft, validates the
output, and either saves a draft (always) or queues it for delayed send
(when the sender is whitelisted and auto_send is enabled).

Every cycle ends with a write to the activity log so the daily digest
has a single source of truth.
"""
from __future__ import annotations

import datetime as dt
import json
import logging
import time
from pathlib import Path
from typing import Optional

from .classifier import Routing, classify_sender
from .config import AgentConfig, config_path, load as load_config, save as save_config
from .guardrails import GuardDecision, classify_input, validate_output
from .llm import LLMClient, LLMConfig, build_system_prompt
from .outlook import IncomingMail, OutlookBridge

logger = logging.getLogger(__name__)


SIGNATURE_BLOCK = (
    "<br><br>"
    "<p style='font-size:11px;color:#5c6b62;border-top:1px solid #e3ebe5;padding-top:8px'>"
    "<b>Hamza's digital twin — D²nAI</b><br>"
    "<i>This message was drafted by Hamza Koh's AI assistant on his behalf. "
    "Hamza reviews escalations personally and will pick this thread up if needed.</i>"
    "</p>"
)


def _activity_log_path() -> Path:
    base = config_path().parent
    return base / "activity.jsonl"


def _append_activity(entry: dict) -> None:
    p = _activity_log_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    entry["ts"] = dt.datetime.utcnow().isoformat() + "Z"
    with p.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _detect_lang(body: str) -> str:
    body_lc = body.lower()
    fr_markers = (" je ", " nous ", " bonjour", "merci", "cordialement")
    pt_markers = (" eu ", " você ", "obrigado", "atenciosamente", "olá")
    fr_score = sum(1 for m in fr_markers if m in body_lc)
    pt_score = sum(1 for m in pt_markers if m in body_lc)
    if pt_score > fr_score and pt_score >= 2:
        return "pt"
    if fr_score >= 2:
        return "fr"
    return "en"


def process_one(
    mail: IncomingMail,
    cfg: AgentConfig,
    outlook: OutlookBridge,
    llm: LLMClient,
) -> dict:
    """Process a single incoming mail. Returns an activity entry."""
    entry = {
        "subject": mail.subject,
        "sender": mail.sender_email,
        "received": mail.received_at.isoformat(),
        "decision": None,
        "reason": None,
        "draft_id": None,
    }

    sender_verdict = classify_sender(
        mail.sender_email, cfg.whitelist, cfg.blacklist, cfg.watchlist,
        cfg.auto_send_enabled,
    )
    entry["routing"] = sender_verdict.routing.value
    if sender_verdict.routing in (Routing.HUMAN, Routing.ESCALATE):
        entry["decision"] = "skip_human"
        entry["reason"] = sender_verdict.reason
        return entry

    input_verdict = classify_input(mail.body, mail.subject)
    if input_verdict.decision == GuardDecision.ESCALATE:
        entry["decision"] = "escalate_input"
        entry["reason"] = input_verdict.reason
        entry["matched"] = input_verdict.matched
        return entry

    try:
        draft_text = llm.draft_reply(
            system_prompt=build_system_prompt(cfg.personal_context or ""),
            sender_name=mail.sender_name,
            original_subject=mail.subject,
            original_body=mail.body,
            lang_hint=_detect_lang(mail.body),
        )
    except Exception as exc:
        entry["decision"] = "llm_error"
        entry["reason"] = str(exc)
        return entry

    output_verdict = validate_output(draft_text)
    if output_verdict.decision == GuardDecision.BLOCK:
        entry["decision"] = "block_output"
        entry["reason"] = output_verdict.reason
        entry["matched"] = output_verdict.matched
        return entry

    # Render to HTML (very light), append the explicit signature block.
    body_html = "<p>" + draft_text.replace("\n\n", "</p><p>").replace("\n", "<br>") + "</p>"
    body_html += SIGNATURE_BLOCK

    send_after: Optional[dt.datetime] = None
    if sender_verdict.routing == Routing.BOT_AUTOSEND and cfg.delay_send_enabled:
        send_after = dt.datetime.now() + dt.timedelta(minutes=cfg.delay_send_minutes)

    draft_id = outlook.save_draft_reply(mail.entry_id, body_html, send_after=send_after)
    outlook.mark_processed(mail.entry_id)

    entry["draft_id"] = draft_id
    entry["decision"] = "drafted_autosend" if send_after else "drafted_only"
    entry["reason"] = sender_verdict.reason
    return entry


def run_once(cfg: AgentConfig, outlook: OutlookBridge, llm: LLMClient) -> int:
    since = (
        dt.datetime.fromisoformat(cfg.last_scan_ts)
        if cfg.last_scan_ts
        else dt.datetime.utcnow() - dt.timedelta(hours=1)
    )
    processed = 0
    for mail in outlook.scan_inbox(since=since):
        entry = process_one(mail, cfg, outlook, llm)
        _append_activity(entry)
        processed += 1
    cfg.last_scan_ts = dt.datetime.utcnow().isoformat()
    save_config(cfg)
    return processed


def main_loop() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    while True:
        cfg = load_config()
        if not (cfg.backend_url and cfg.backend_token):
            logger.warning(
                "D²nAI Office is not configured yet. Open the admin console "
                "to set backend URL and token. Sleeping 60s."
            )
            time.sleep(60)
            continue
        try:
            outlook = OutlookBridge()
        except RuntimeError as exc:
            logger.error("Outlook bridge unavailable: %s", exc)
            time.sleep(60)
            continue
        llm = LLMClient(LLMConfig(backend_url=cfg.backend_url, api_token=cfg.backend_token))
        try:
            n = run_once(cfg, outlook, llm)
            if n:
                logger.info("Processed %d new mails this cycle", n)
        except Exception:
            logger.exception("Unhandled error in cycle — sleeping then retrying")
        time.sleep(max(10, cfg.poll_seconds))


if __name__ == "__main__":
    main_loop()
