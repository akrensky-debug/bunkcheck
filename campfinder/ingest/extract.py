"""Ask Claude to read a camp's page and fill in the ProposedListing schema."""

from __future__ import annotations

from datetime import date

import anthropic
from pydantic import ValidationError

from campfinder.config import get_settings
from campfinder.ingest.fetch import Source
from campfinder.ingest.schema import ProposedListing

MAX_SOURCE_CHARS = 120_000

SYSTEM_PROMPT = """You turn a summer camp's website or brochure into a structured listing for parents.

Rules:
- Only record what the source states. If something is not stated, leave it null and name it in `unknowns`. Never guess a price, date or age.
- Prefer the upcoming season (the one whose dates are in the future relative to today). If the source only shows an old season, record it and say so in `warnings`, and set `season_year` to the year shown.
- Sessions: one entry per bookable session, week or block. Give full dates. If a page lists "Week 1: June 21-25" with no year, use the season year.
- Prices in US dollars as numbers. `price_per_week` is the typical weekly rate for a day camp. Session `price` is the total for that session.
- `camp_type`: "day" if campers go home each night, "sleepaway" if they stay overnight, "specialty" for a single-focus program (one sport, coding, theater) that is not a general camp.
- `description_short`: one or two plain sentences a parent would find useful. No marketing language.
- For every non-null field you fill, add an `evidence` entry with a short verbatim quote and your confidence.
- If the page is a directory, a blog, or otherwise not the camp's own material, say so in `warnings`.
"""


def _build_prompt(source: Source, today: date) -> str:
    text = source.text
    if len(text) > MAX_SOURCE_CHARS:
        text = text[:MAX_SOURCE_CHARS] + "\n\n[source truncated]"
    links = "\n".join(f"- {t}: {u}" for t, u in source.links[:80] if any(
        k in t.lower() or k in u.lower() for k in ("regist", "session", "date", "price", "tuition", "rate", "faq", "enroll")
    ))
    return (
        f"Today is {today.isoformat()}.\n"
        f"Source URL: {source.url}\n"
        f"Source title: {source.title or ''}\n\n"
        f"Relevant links on the page:\n{links or '- none'}\n\n"
        f"Source text:\n<<<\n{text}\n>>>"
    )


# A plain tool carries the schema. Structured outputs compile the schema into a grammar and cap
# optional and nullable fields (24 and 16); a listing has more of both. The answer is validated
# with Pydantic below instead.
TOOL = {
    "name": "record_listing",
    "description": "Record the camp listing read from the source. Call it exactly once.",
    "input_schema": ProposedListing.model_json_schema(),
}

async def extract_listing(
    source: Source,
    *,
    client: anthropic.AsyncAnthropic | None = None,
    model: str | None = None,
    today: date | None = None,
) -> ProposedListing:
    client = client or anthropic.AsyncAnthropic()
    model = model or get_settings().ingest_model
    response = await client.messages.create(
        model=model,
        max_tokens=16000,
        # The tool schema and system prompt are the same on every call (~1,800 tokens), so cache them;
        # only the page text after them changes. Tools render before system, so this covers both.
        system=[{"type": "text", "text": SYSTEM_PROMPT + "\nRecord the listing by calling record_listing once.",
                 "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": _build_prompt(source, today or date.today())}],
        tools=[TOOL],
        tool_choice={"type": "auto"},
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("The model declined to process this source")
    call = next((b for b in response.content if b.type == "tool_use" and b.name == TOOL["name"]), None)
    if call is None:
        raise RuntimeError(f"No listing returned (stop_reason {response.stop_reason})")
    try:
        listing = ProposedListing.model_validate(call.input)
    except ValidationError as e:
        raise RuntimeError(f"The listing didn't match the schema: {e.error_count()} errors") from e
    if listing.website_url is None and source.kind == "html":
        listing.website_url = source.url
    return listing
