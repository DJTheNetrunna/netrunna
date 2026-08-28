NETRUNNA STATIC DIRECTORY + ARCHIVE INGESTION

Included:
- branded NETRUNNA homepage
- 103 hand-curated listings in data/resources.json
- dynamic Awesome Piracy archive importer from awsomepiracy/readme.md
- dedicated Awesome Piracy section/subsection browser at awesome.html
- URL deduplication between NETRUNNA core listings and imported archive entries
- archive section/subsection metadata preserved as searchable tags
- search, filters, sorting, counters, random node discovery
- saved nodes + recent routes + share controls
- safe outbound redirect tracking (HTTP/HTTPS only)
- local dashboard with total/imported counts and saved-node export
- PWA manifest + service worker offline cache
- submit page + local storage fallback
- category pages
- deploy guide
- Supabase schema

Run locally:
python -m http.server 8000
Then open http://localhost:8000

Main directory:
http://localhost:8000/index.html

Awesome Piracy section browser:
http://localhost:8000/awesome.html

Important:
Awesome Piracy is an archived historical list. Imported entries are labeled UNVERIFIED and should not be assumed live, safe, legal in every jurisdiction, or trustworthy. Verify destinations before downloads, credentials, or software installation.

Edit data/resources.json to change NETRUNNA's hand-curated listings.
Edit awsomepiracy/readme.md to change the imported archive catalog.
Edit assets/js/catalog.js to change archive parsing/deduplication behavior.
Edit assets/js/awesome.js to change archive browser behavior.
Edit assets/css/style.css to change styling.
Replace affiliate_url values when ready.
