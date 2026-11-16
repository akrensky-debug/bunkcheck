"""The camp-card widget each assistant gets (campfinder/chatgpt/widget.html)."""

from __future__ import annotations

from pathlib import Path

from campfinder.mcp_server import WIDGET_URI, _widget_resource, hosts

WIDGET = (Path(__file__).parent.parent / "campfinder" / "chatgpt" / "widget.html").read_text()


def test_claude_may_load_its_font_and_chatgpt_keeps_an_empty_allowlist() -> None:
    ui = {h.path: _widget_resource(h).meta["ui"] for h in hosts()}
    assert ui["/claude/mcp"]["csp"]["resourceDomains"] == ["https://assets.claude.ai"]
    assert ui["/mcp"]["csp"]["resourceDomains"] == ["https://assets.claude.ai"]
    assert ui["/chatgpt/mcp"]["csp"]["resourceDomains"] == []
    assert all(u["prefersBorder"] is False for u in ui.values())


def test_widget_lets_the_chat_show_through_and_ends_its_loader_on_errors() -> None:
    assert WIDGET_URI == "ui://campfinder/camps-v6.html"  # hosts cache by URI: bump it with the file
    assert '<meta name="color-scheme" content="light dark">' in WIDGET
    assert "html, body { margin: 0; background: transparent; }" in WIDGET
    assert "r.isError || !r.structuredContent" in WIDGET
    assert "ui/notifications/tool-cancelled" in WIDGET
