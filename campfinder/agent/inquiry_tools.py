"""
Inquiry tools: send a camp the parent's question, and read the camp's answer.

Public (served at /mcp, /chatgpt/mcp and /claude/mcp, and used by our own agent), because a
question to a camp is how any assistant helps a parent who is choosing. What keeps it safe:
- send_inquiry only creates a pending inquiry and returns a preview. Nothing reaches the camp
  until the parent confirms on CampFinder (on our site, the card's button).
- The question may not hold contact details, and the tool takes none. The parent adds them
  herself on the confirm page, if she wants the camp to have them.
- The info kit goes only as a link to a package the parent already made; the tool takes the
  token and never sees the kit's contents.
- The channel (site, chatgpt, claude, assistant) comes from the server, not the model.
"""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from campfinder.agent.tools import ALL_TOOLS, CAMP_TOOLS, ToolOutput, ToolSpec
from campfinder.inquiries import service


class SendInquiryInput(BaseModel):
    program_id: UUID = Field(description="The camp's id (camp_id from search_camps, find_sessions or get_camp_details).")
    session_id: UUID | None = Field(default=None, description="The session the question is about, if one.")
    question: str = Field(
        min_length=service.QUESTION_MIN, max_length=service.QUESTION_MAX,
        description="The parent's question for the camp, in their words. No names, emails or phone numbers: "
                    "the parent adds contact details on the confirm page if they want to.")
    kit_share_token: str | None = Field(
        default=None, max_length=300,
        description="Only if the parent gives you a link to an info kit package they made on CampFinder: "
                    "the link or its token. Never type kit details into the question.")


class CheckInquiryInput(BaseModel):
    inquiry_id: UUID
    read_token: str = Field(description="The read_token send_inquiry returned.")


async def send_inquiry_tool(inp: SendInquiryInput, family_id: str | None, channel: str) -> ToolOutput:
    created = service.create(
        program_id=str(inp.program_id), session_id=str(inp.session_id) if inp.session_id else None,
        question=inp.question, kit_token=inp.kit_share_token, channel=channel, family_id=family_id,
    )
    content = {
        "inquiry_id": str(created.inquiry["id"]),
        "read_token": created.read_token,
        "status": "pending",
        "preview": created.preview,
        "note": "Nothing has been sent. Show the parent the preview. It goes to the camp only after they "
                "confirm. Later, check_inquiry with inquiry_id and read_token shows the camp's answer.",
    }
    if channel == "site":
        # Our own agent: the card's button confirms in the app; the model needs no link.
        view = service.view_for_parent(created.confirm_token)
        return ToolOutput(content=content, ui={"type": "inquiry", **view, "confirm_token": created.confirm_token})
    content["confirm_url"] = created.confirm_url
    content["note"] = ("Nothing has been sent. Show the parent the preview and the confirm_url: it goes to the "
                       "camp only after they confirm there, where they can also add their contact details. "
                       "Later, check_inquiry with inquiry_id and read_token shows the camp's answer.")
    return ToolOutput(content=content, ui={"type": "inquiry", "preview": created.preview,
                                           "confirm_url": created.confirm_url})


async def check_inquiry_tool(inp: CheckInquiryInput) -> ToolOutput:
    view = service.view_for_assistant(str(inp.inquiry_id), inp.read_token)
    return ToolOutput(content=view)


INQUIRY_TOOLS = [
    ToolSpec(
        "send_inquiry",
        "Ask a camp a question for the parent (and, if they give you one, attach an info kit package link "
        "they made). Creates it as pending and returns a preview of exactly what the camp will read. Nothing "
        "is sent until the parent confirms. Use when the parent wants to ask a camp something our data "
        "doesn't answer.",
        SendInquiryInput, send_inquiry_tool, needs_channel=True, writes=True, status="Preparing your question",
    ),
    ToolSpec(
        "check_inquiry",
        "Whether a question sent with send_inquiry was confirmed and delivered, and the camp's answers.",
        CheckInquiryInput, check_inquiry_tool, status="Checking for an answer",
    ),
]
CAMP_TOOLS.extend(INQUIRY_TOOLS)
ALL_TOOLS.update({t.name: t for t in INQUIRY_TOOLS})

INQUIRY_DISCOVERY_DESCRIPTIONS = {
    "send_inquiry": (
        "Send a camp the parent's question, with their yes. Use for 'can you find out if week 3 still has "
        "spots', 'ask the camp about bus routes', 'ask if they do sibling discounts', or 'ask whether my kid "
        "can come for just one week'. Returns a preview and a link where the parent confirms; nothing is sent "
        "before that. Don't include names, contact or health details: the parent adds contact details when "
        "confirming, if they want, and health details stay in their CampFinder info kit."
    ),
    "check_inquiry": (
        "Check whether a camp answered a question sent with send_inquiry. Use for 'did the camp reply' or "
        "'what did they say'."
    ),
}
INQUIRY_STATUS_TEXT = {
    "send_inquiry": ("Preparing your question…", "Ready for your yes"),
    "check_inquiry": ("Checking for an answer…", "Checked for an answer"),
}

INQUIRY_PROMPT = """

Questions to camps:
- When the parent wants to ask a camp something our data doesn't answer, offer to send it with \
send_inquiry, in their words. Leave out names, emails and phone numbers: the card lets them add \
contact details if they want the camp to have them.
- The card shows exactly what the camp will read and nothing is sent until they press Send on \
it. Say that in a few words; never say it was sent.
- If they want to include their info kit, they make a package on the Register page first; you \
only pass its link, never the details.
- Later, check_inquiry with the inquiry_id and read_token shows whether the camp answered.\
"""
