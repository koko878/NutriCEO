"""
D²nAI Office Agent — configuration loader.

Reads the agent config from a JSON file in the user's profile directory,
so we don't bake secrets into the .exe.

Default location on Windows: %APPDATA%\\dnai-office\\config.json
The admin console (WordPress plugin) writes here when the user saves
settings; the agent reads here on every poll cycle (cheap, supports
live config updates without restart).
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class AgentConfig:
    backend_url: str = ""
    backend_token: str = ""
    poll_seconds: int = 30
    delay_send_minutes: int = 5
    delay_send_enabled: bool = True
    digest_to: str = ""           # email address that receives the daily digest
    personal_context: str = ""    # corpus / projects summary injected into system prompt
    whitelist: list[str] = field(default_factory=list)  # bot-first contacts
    blacklist: list[str] = field(default_factory=list)  # never bot for these
    watchlist: list[str] = field(default_factory=list)  # always escalate immediately
    allowed_topics: list[str] = field(default_factory=lambda: [
        "project_questions", "info_requests", "meeting_screening", "contact_routing",
    ])
    # Whether the agent is allowed to actually send (vs. only save drafts).
    auto_send_enabled: bool = False
    last_scan_ts: str = ""        # ISO timestamp of the previous scan


def _config_dir() -> Path:
    base = os.environ.get("APPDATA") or os.path.expanduser("~/.config")
    return Path(base) / "dnai-office"


def config_path() -> Path:
    return _config_dir() / "config.json"


def load(path: Optional[Path] = None) -> AgentConfig:
    p = path or config_path()
    if not p.exists():
        logger.info("Config file not found at %s — using defaults", p)
        return AgentConfig()
    try:
        raw: dict[str, Any] = json.loads(p.read_text(encoding="utf-8"))
        cfg = AgentConfig()
        for k, v in raw.items():
            if hasattr(cfg, k):
                setattr(cfg, k, v)
        return cfg
    except Exception:
        logger.exception("Failed to read config from %s — falling back to defaults", p)
        return AgentConfig()


def save(cfg: AgentConfig, path: Optional[Path] = None) -> None:
    p = path or config_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(
        json.dumps(cfg.__dict__, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
