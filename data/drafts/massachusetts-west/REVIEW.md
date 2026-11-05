# Drafts to check: massachusetts-west

Each draft is what the listing tool read from the camp's own page. Check every field against the page, fix the errors, then promote it:

    python -m campfinder.ingest.promote data/drafts/massachusetts-west/<file> --by <your name>

Nothing here is on the site until it is promoted and imported.

| Camp | Town | Sessions | Errors | Unsure | Warnings | Status |
|---|---|---|---|---|---|---|
| [Arcadia Nature Camp](arcadia-nature-camp-easthampton.json) | Easthampton | 0 | 2 | 0 | 4 | unchecked |
| [Belvoir Terrace](belvoir-terrace-lenox.json) | Lenox | 0 | 0 | 3 | 5 | unchecked |
| [Berkshire Nature Camp at Pleasant Valley](berkshire-nature-camp-at-pleasant-valley-lenox.json) | Lenox | 5 | 1 | 1 | 5 | unchecked |
| [Broad Meadow Brook Nature Camp](broad-meadow-brook-nature-camp-worcester.json) | Worcester | 17 | 1 | 4 | 6 | unchecked |
| [Camp Becket and Chimney Corners Camp (Becket-Chimney Corners YMCA)](camp-becket-and-chimney-corners-camp-becket-chimney-corners-ymca-becket.json) | Becket | 14 | 0 | 2 | 6 | unchecked |
| [Camp Bonnie Brae](camp-bonnie-brae-east-otis.json) | East Otis | 39 | 1 | 2 | 7 | unchecked |
| [Camp Danbee](camp-danbee-peru.json) | Peru | 0 | 1 | 2 | 4 | unchecked |
| [Camp Farley Day Camp](camp-farley-day-camp-mashpee.json) | Mashpee | 0 | 0 | 4 | 4 | unchecked |
| [Camp Farley](camp-farley-mashpee.json) | Mashpee | 22 | 2 | 1 | 7 | unchecked |
| [Camp Greylock](camp-greylock-becket.json) | Becket | 0 | 1 | 0 | 4 | unchecked |
| [Camp Mah-Kee-Nac – Mini Mak Two-Week Sleepaway Camp](camp-mah-kee-nac-mini-mak-two-week-sleepaway-camp-lenox.json) | Lenox | 2 | 0 | 1 | 5 | unchecked |
| [Camp Taconic](camp-taconic-hinsdale.json) | Hinsdale | 2 | 0 | 0 | 4 | unchecked |
| [Camp TAG (The Allergy Gang)](camp-tag-the-allergy-gang.json) | ? | 2 | 3 | 0 | 5 | unchecked |
| [Camp Weber](camp-weber-west-springfield.json) | West Springfield | 0 | 2 | 2 | 5 | unchecked |
| [Camp Winadu](camp-winadu-pittsfield.json) | Pittsfield | 1 | 0 | 3 | 8 | unchecked |
| [Day Camp @ Eisner](day-camp-eisner-great-barrington.json) | Great Barrington | 7 | 0 | 7 | 7 | unchecked |
| [Discovery Adventures](discovery-adventures-sturbridge.json) | Sturbridge | 0 | 0 | 5 | 6 | unchecked |
| [EcoTarium Summer Discovery Camp and Vacation Week Camp](ecotarium-summer-discovery-camp-and-vacation-week-camp-worcester.json) | Worcester | 13 | 0 | 3 | 5 | unchecked |
| [FA Summer (Falmouth Academy Summer Camps)](fa-summer-falmouth-academy-summer-camps-falmouth.json) | Falmouth | 8 | 0 | 7 | 5 | unchecked |
| [Hitchcock Center Nature Summer Camp](hitchcock-center-nature-summer-camp-amherst.json) | Amherst | 11 | 0 | 2 | 7 | unchecked |
| [Kimama Half Moon](kimama-half-moon.json) | ? | 0 | 5 | 3 | 5 | unchecked |
| [Nantucket Community Sailing Youth Camps & Classes](nantucket-community-sailing-youth-camps-and-classes-nantucket.json) | Nantucket | 90 | 1 | 3 | 11 | unchecked |
| [Nantucket Nature Bound Program (Teen Naturalist Leadership Program)](nantucket-nature-bound-program-teen-naturalist-leadership-program-nantucket.json) | Nantucket | 6 | 0 | 2 | 7 | unchecked |
| [Springfield JCC Summer Camp](springfield-jcc-summer-camp-springfield.json) | Springfield | 1 | 0 | 0 | 5 | unchecked |
| [URJ Crane Lake Camp](urj-crane-lake-camp-west-stockbridge.json) | West Stockbridge | 19 | 0 | 1 | 5 | unchecked |
| [Wellfleet Bay Nature Camp](wellfleet-bay-nature-camp-wellfleet.json) | Wellfleet | 0 | 3 | 0 | 2 | unchecked |
| [Worcester Art Museum Youth Summer Classes](worcester-art-museum-youth-summer-classes-worcester.json) | Worcester | 0 | 3 | 0 | 4 | unchecked |
| [Worcester Center for Crafts Youth Summer Program](worcester-center-for-crafts-youth-summer-program-worcester.json) | Worcester | 26 | 0 | 1 | 5 | unchecked |
| [YMCA Camp Blanchard](ymca-camp-blanchard-sutton.json) | Sutton | 9 | 0 | 1 | 6 | unchecked |
| [YMCA of Central Massachusetts Camps (multi-branch overview)](ymca-of-central-massachusetts-camps-multi-branch-overview.json) | ? | 4 | 3 | 12 | 8 | unchecked |

## Ask the owner for the brochure

These hosts refused the fetcher. That is the answer: ask the camp to send its brochure.

- Camp Ramah in New England: https://www.campramahne.org
- Camp Falmouth: https://ymcacapecod.org/programs/camp/falmouth-camp/
- Summer Camp at New England Botanic Garden: https://nebg.org/youth-family-programs/summer-camp/
- URJ Eisner Camp: https://eisnercamp.org/new-families/dates-rates/
- Camp Lyndon: https://ymcacapecod.org/programs/camp/camp-lyndon/

## Failed

- Camp Mah-Kee-Nac: https://campmkn.com/ (no camp on the page: the page names no camp)
- Wachusett Meadow Nature Camp: https://massaudubon.org/places-to-explore/wildlife-sanctuaries/wachusett-meadow/camp/about-camp (no camp on the page: the page names no camp)
- Broad Meadow Brook Nature Camp: https://www.massaudubon.org/programs/broad-meadow-brook/100428-broad-meadow-brook-nature-camp-exploring-mass-audubon (fetch: https://www.massaudubon.org/programs/broad-meadow-brook/100428-broad-meadow-brook-nature-camp-exploring-mass-audubon returned 404)
- Longmeadow Parks & Recreation Summer Programs: https://lprd.net/424/Summer-Programs (no camp on the page: the page names no camp)
- Springfield Boys & Girls Club Summer Program: https://sbgc.org/events/summer-program-week-1-red-white-blue/ (no camp on the page: the page names no camp)
- Camp Hamp: https://ma-northampton.civicplus.com/903/Camp-Hamp (fetch: Host is not a public address)
- Camp KidZone: https://ma-northampton.civicplus.com/904/Camp-Kidzone (fetch: Host is not a public address)
- Northampton Safety Village: https://ma-northampton.civicplus.com/1402/Summer-Camps (fetch: Host is not a public address)
