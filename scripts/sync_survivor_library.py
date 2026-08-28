#!/usr/bin/env python3
"""Build NETRUNNA's Survivor Library catalog from survivorlibrary.com.

The source library is historical/public-domain material. NETRUNNA deliberately
omits clearly weapon, explosive, demolition, sabotage, and similar high-risk
manuals from the generated public index.
"""

from __future__ import annotations

import hashlib
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

INDEX_URL = "https://www.survivorlibrary.com/index.php/main-category-index/"
OUT_PATH = Path("data/survivor-library.json")
MAX_WORKERS = 4
TIMEOUT = 30

CATEGORY_BLOCK = re.compile(
    r"(?:firearms?|gunpowder|explosives?|weapons?|demolition|ordnance)", re.I
)
TITLE_BLOCK = re.compile(
    r"(?:\bweapon(?:s)?\b|\bexplosive(?:s)?\b|\bdemolition(?:s)?\b|"
    r"\bbomb(?:s|ing|making)?\b|\bsabotage\b|\bbooby\s*trap(?:s)?\b|"
    r"\bkill\s+tanks?\b|\bmarksmanship\b|\bpistol\b|\brifle\b)", re.I
)
GENERIC_LINK_TEXT = {
    "home", "download_books", "download books", "facebook page", "contact",
    "return to home page", "return to main index", "main index", "store", "faqs",
    "about us", "contact me",
}

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "NETRUNNA-SurvivorLibraryIndexer/1.0 (+https://netrunna.com/)",
    "Accept": "text/html,application/xhtml+xml",
})


def slugify(value: str) -> str:
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:80] or "resource"


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def get(url: str) -> requests.Response:
    last_error = None
    for attempt in range(3):
        try:
            response = SESSION.get(url, timeout=TIMEOUT)
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            last_error = exc
            time.sleep(1.25 * (attempt + 1))
    raise last_error  # type: ignore[misc]


def discover_categories() -> list[dict]:
    soup = BeautifulSoup(get(INDEX_URL).text, "html.parser")
    found: dict[str, dict] = {}
    for anchor in soup.find_all("a", href=True):
        title = clean(anchor.get_text(" ", strip=True))
        if not title or title.lower() in GENERIC_LINK_TEXT:
            continue
        href = urljoin(INDEX_URL, anchor["href"])
        parsed = urlparse(href)
        if parsed.netloc.lower().replace("www.", "") != "survivorlibrary.com":
            continue
        path = parsed.path.lower().rstrip("/")
        if "/index.php/" not in path:
            continue
        if any(part in path for part in ("main-category-index", "contact", "category", "tag", "author")):
            continue
        if CATEGORY_BLOCK.search(title):
            continue
        found[href] = {"title": title.replace("_", " "), "url": href}
    return sorted(found.values(), key=lambda row: row["title"].lower())


def title_from_filename(url: str) -> str:
    filename = urlparse(url).path.rsplit("/", 1)[-1]
    filename = re.sub(r"\.pdf$", "", filename, flags=re.I)
    return clean(filename.replace("_", " ").replace("-", " ")).title()


def scrape_category(category: dict) -> tuple[dict, list[dict], str | None]:
    url = category["url"]
    try:
        soup = BeautifulSoup(get(url).text, "html.parser")
        heading = soup.find("h1")
        category_name = clean(heading.get_text(" ", strip=True) if heading else category["title"])
        if CATEGORY_BLOCK.search(category_name):
            return category, [], "policy-excluded category"

        rows: list[dict] = []
        seen: set[str] = set()

        for anchor in soup.find_all("a", href=True):
            href = urljoin(url, anchor["href"])
            if not re.search(r"\.pdf(?:$|[?#])", href, re.I):
                continue
            if href in seen:
                continue

            tr = anchor.find_parent("tr")
            cells = [clean(cell.get_text(" ", strip=True)) for cell in tr.find_all(["td", "th"])] if tr else []
            title = cells[1] if len(cells) >= 2 else clean(anchor.get_text(" ", strip=True))
            if not title or title.lower().startswith("pdf"):
                title = title_from_filename(href)
            if TITLE_BLOCK.search(title):
                continue

            date_added = cells[0] if cells and re.match(r"^\d{4}-\d{2}-\d{2}$", cells[0]) else ""
            size = cells[2] if len(cells) >= 3 else clean(anchor.get_text(" ", strip=True)).replace("PDF", "").strip()
            short_hash = hashlib.sha1(href.encode("utf-8")).hexdigest()[:8]
            safe_category = clean(category_name).replace("_", " ")

            rows.append({
                "title": title,
                "slug": f"sl-{slugify(title)}-{short_hash}",
                "description": f"Downloadable historical/public-domain PDF from Survivor Library's {safe_category} collection.",
                "category": "survivor-library",
                "tags": ["survivor-library", slugify(safe_category), "ebook", "pdf", "public-domain"],
                "url": href,
                "affiliate_url": "",
                "use_affiliate": False,
                "rating": 4.2,
                "views": size.upper() if size else "PDF",
                "status": "PDF",
                "note": f"Survivor Library // {safe_category} // downloadable PDF",
                "dateAdded": date_added or "2026-07-01",
                "source": "survivor-library",
                "source_section": safe_category,
                "source_subsection": "PDF eBook",
                "source_page": url,
                "downloadable": True,
                "file_type": "pdf",
                "size": size,
            })
            seen.add(href)

        return {"title": category_name, "url": url}, rows, None
    except Exception as exc:  # one category should not abort the whole catalog
        return category, [], f"{type(exc).__name__}: {exc}"


def main() -> None:
    categories = discover_categories()
    resources: list[dict] = []
    completed_categories: list[dict] = []
    failures: list[dict] = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        jobs = {executor.submit(scrape_category, category): category for category in categories}
        for future in as_completed(jobs):
            category, rows, error = future.result()
            completed_categories.append(category)
            resources.extend(rows)
            if error and error != "policy-excluded category":
                failures.append({"category": category["title"], "url": category["url"], "error": error})

    deduped: dict[str, dict] = {}
    for item in resources:
        deduped[item["url"]] = item
    resources = sorted(deduped.values(), key=lambda item: (item["source_section"].lower(), item["title"].lower()))
    completed_categories = sorted(completed_categories, key=lambda item: item["title"].lower())

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": INDEX_URL,
        "source_name": "Survivor Library",
        "notice": "Historical/public-domain reference material. Verify historical medical, chemical, food, and engineering guidance against modern safety standards before practical use.",
        "excluded_policy": "NETRUNNA omits clearly weapon, explosive, demolition, sabotage, and similar high-risk manuals from the automatic public index.",
        "category_count": len(completed_categories),
        "resource_count": len(resources),
        "categories": completed_categories,
        "resources": resources,
        "failures": failures,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Survivor Library: {len(completed_categories)} categories, {len(resources)} downloadable PDFs, {len(failures)} category failures")


if __name__ == "__main__":
    main()
