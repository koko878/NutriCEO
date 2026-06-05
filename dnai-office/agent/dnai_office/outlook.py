"""
D²nAI Office Agent — Outlook MAPI integration.

Reads Hamza's Outlook desktop via the COM/MAPI bridge (pywin32).
Runs under the user's own AD credentials — no central service account
required, no IT involvement.

The bot only TOUCHES three Outlook surfaces:
- Inbox: scans new messages since last poll
- Drafts folder: writes generated replies (with delay-revocable sending)
- A custom "D²nAI Office · processed" mail flag/category for dedup
"""
from __future__ import annotations

import datetime as dt
import logging
import os
from dataclasses import dataclass, field
from typing import Iterable, Optional

try:
    import win32com.client  # type: ignore[import]
except ImportError:  # pragma: no cover - dev import on non-Windows
    win32com = None  # type: ignore[assignment]


PROCESSED_CATEGORY = "D2nAI-Office-processed"

logger = logging.getLogger(__name__)


@dataclass
class IncomingMail:
    """Lightweight snapshot of an incoming mail used by the rest of the pipeline."""

    entry_id: str
    sender_email: str
    sender_name: str
    subject: str
    body: str
    received_at: dt.datetime
    to_recipients: list[str] = field(default_factory=list)
    cc_recipients: list[str] = field(default_factory=list)
    conversation_id: Optional[str] = None
    importance: int = 1  # 0 low, 1 normal, 2 high


class OutlookBridge:
    """Thin wrapper over the Outlook COM Application object."""

    def __init__(self) -> None:
        if win32com is None:
            raise RuntimeError(
                "pywin32 is not installed — the agent only runs on Windows with Outlook desktop."
            )
        self._app = win32com.client.Dispatch("Outlook.Application")
        self._ns = self._app.GetNamespace("MAPI")

    def inbox_folder(self):
        # 6 = olFolderInbox; resolves to the default Inbox of the running user.
        return self._ns.GetDefaultFolder(6)

    def drafts_folder(self):
        # 16 = olFolderDrafts.
        return self._ns.GetDefaultFolder(16)

    def scan_inbox(self, since: dt.datetime, max_items: int = 50) -> Iterable[IncomingMail]:
        """Yield mails received after `since` that haven't been processed yet."""
        items = self.inbox_folder().Items
        # Newest first; the loop bails out as soon as it crosses the `since` window.
        items.Sort("[ReceivedTime]", True)
        for raw in items:
            if raw.Class != 43:  # 43 = olMail; anything else (meeting requests, etc.) is skipped here.
                continue
            received = self._to_dt(raw.ReceivedTime)
            if received <= since:
                break
            if PROCESSED_CATEGORY in (raw.Categories or ""):
                continue
            try:
                sender_email = (
                    raw.SenderEmailAddress
                    if raw.SenderEmailType == "SMTP"
                    else self._resolve_exchange_address(raw)
                )
            except Exception:
                sender_email = raw.SenderEmailAddress or ""
            yield IncomingMail(
                entry_id=raw.EntryID,
                sender_email=(sender_email or "").lower(),
                sender_name=raw.SenderName or "",
                subject=raw.Subject or "",
                body=raw.Body or "",
                received_at=received,
                to_recipients=self._recipients(raw, recipient_type=1),
                cc_recipients=self._recipients(raw, recipient_type=2),
                conversation_id=raw.ConversationID,
                importance=int(raw.Importance) if raw.Importance is not None else 1,
            )
            if max_items <= 0:
                break
            max_items -= 1

    def save_draft_reply(self, original_entry_id: str, body_html: str, send_after: Optional[dt.datetime] = None) -> str:
        """Create a reply draft in the user's Drafts folder.

        Returns the new draft EntryID. If `send_after` is provided, the draft is
        flagged with a deferred-send time (Outlook's `DeferredDeliveryTime` MAPI
        field), which gives the user a revocable window to intervene.
        """
        original = self._ns.GetItemFromID(original_entry_id)
        reply = original.Reply()
        reply.HTMLBody = body_html + (reply.HTMLBody or "")
        if send_after is not None:
            # The deferred delivery field is what lets us "send in 5 minutes" with
            # revocation. The agent can also withdraw the draft outright if a new
            # human intervention is detected before that time.
            reply.DeferredDeliveryTime = send_after
        reply.Save()
        return reply.EntryID

    def mark_processed(self, entry_id: str) -> None:
        item = self._ns.GetItemFromID(entry_id)
        existing = (item.Categories or "").split(";")
        if PROCESSED_CATEGORY not in existing:
            existing.append(PROCESSED_CATEGORY)
            item.Categories = ";".join(c.strip() for c in existing if c.strip())
            item.Save()

    def withdraw_draft(self, draft_entry_id: str) -> None:
        """Permanently delete a queued draft (for revocation cases)."""
        draft = self._ns.GetItemFromID(draft_entry_id)
        draft.Delete()

    # ----- internal helpers -----
    def _to_dt(self, raw_time) -> dt.datetime:
        # win32 returns a pywintypes.datetime which is already tz-aware; we
        # collapse it to a naive UTC for downstream simplicity.
        return dt.datetime(
            raw_time.year, raw_time.month, raw_time.day,
            raw_time.hour, raw_time.minute, raw_time.second,
        )

    def _resolve_exchange_address(self, mail) -> str:
        """Resolve an EX-style address (Exchange DN) to its SMTP form."""
        try:
            user = mail.Sender.GetExchangeUser()
            return user.PrimarySmtpAddress if user else mail.SenderEmailAddress
        except Exception:
            return mail.SenderEmailAddress or ""

    def _recipients(self, mail, recipient_type: int) -> list[str]:
        out = []
        for r in mail.Recipients:
            if r.Type == recipient_type:
                try:
                    addr = r.AddressEntry.GetExchangeUser().PrimarySmtpAddress
                except Exception:
                    addr = r.Address or ""
                if addr:
                    out.append(addr.lower())
        return out
