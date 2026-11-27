# Providence and Boston, round two, drafted on 22 November 2026

These 42 camps came from a second search around Providence and Boston, aimed at the gaps the first one left: town programs, Boston city centers, STEM camps, colleges, the North and South Shore, and riding and surf camps. Each was checked against everything published, drafted or tried before. Claude read each camp's own pages with the repo fetcher (BunkcheckBot) and wrote the draft by hand, every filled field tied to the page that states it. Prices are the non-resident rate, and missing ZIPs come from the Census geocoder where the camp gives a street address.

21 are ready and 21 need a decision from you. Hopkinton, RI is added to `campfinder/seed/cities.py` from the Census Bureau 2024 Gazetteer.

## Ready to promote

Open a few and read their `first_pass`, then run `python -m campfinder.ingest.promote --ready data/drafts/<folder> --by "Andrew Krensky"` for each folder and `python -m campfinder.seed.import_real --check`.

### Providence

| Camp | Town | Season |
| --- | --- | --- |
| [Cast No Shadows Stables Summer Camp](providence/cast-no-shadows-stables-summer-camp-hopkinton.json) | Hopkinton | 2027 |
| [Federal Hill House Summer Camp](providence/federal-hill-house-summer-camp-providence.json) | Providence | 2026 |
| [United Sports Arena Recreational Summer Camp](providence/united-sports-arena-recreational-summer-camp-franklin.json) | Franklin | 2026 |

### Boston

| Camp | Town | Season |
| --- | --- | --- |
| ["e" inc. Summer Science Discovery Program](boston/e-inc-summer-science-discovery-program-boston.json) | Boston | 2026 |
| [All-Star Summer Program](boston/bcyf-charlestown-all-star-summer-program-boston.json) | Boston | 2026 |
| [Camp Devereux](boston/camp-devereux-marblehead.json) | Marblehead | 2027 |
| [Code & Circuit Summer Sessions](boston/code-and-circuit-summer-sessions-amesbury.json) | Amesbury | 2026 |
| [Design at Advent Summer Program](boston/design-at-advent-summer-program-boston.json) | Boston | 2026 |
| [Esh Circus Arts Youth Summer Program](boston/esh-circus-arts-youth-summer-program-somerville.json) | Somerville | 2026 |
| [Exxcel Gymnastics & Climbing Summer Camp](boston/exxcel-gymnastics-and-climbing-summer-camp-newton.json) | Newton | 2026 |
| [KidsArts Summer Program](boston/kidsarts-summer-program-boston.json) | Boston | 2026 |
| [NEOC (New England Outdoor Camps)](boston/neoc-new-england-outdoor-camps-wellesley.json) | Wellesley | 2027 |
| [Natick Boathouse Summer Camps](boston/natick-boathouse-summer-camps-natick.json) | Natick | 2027 |
| [Penguin Coding School Summer Sessions, Brookline](boston/penguin-coding-school-summer-sessions-brookline.json) | Brookline | 2027 |
| [STEM Camp at EHS](boston/stem-camp-at-ehs-marblehead.json) | Marblehead | 2026 |
| [Summer Camp at Camp Fire North Shore](boston/camp-fire-north-shore-summer-camp-salem.json) | Salem | 2026 |
| [Summer Science Academy](boston/summer-science-academy-bridgewater.json) | Bridgewater | 2027 |
| [Summer at Tower](boston/summer-at-tower-marblehead.json) | Marblehead | 2026 |
| [Summer@Riverbend and Riverbend Adventure Camp](boston/summer-at-riverbend-natick.json) | Natick | 2026 |
| [SummerScape](boston/summerscape-north-reading.json) | North Reading | 2026 |
| [iD Tech Camps held at MIT](boston/id-tech-at-mit-cambridge.json) | Cambridge | 2027 |

## Need a decision

Each draft's `for_andrew` has the question. The common ones:

- **No ZIP:** 5 camps give no street address on their own pages (Northeastern Accelerate, BCYF Leahy Holloran, Dedham All Day Playground, Milton's Cunningham Park program, Hull Fishing Camp).
- **Who can enroll:** DownCity Design (paid, Providence County high schoolers, closer to an internship), GT STEAM Academy (Providence Public Schools students), Milton (residents only), BCYF Leahy Holloran (Boston residents first).
- **One listing or several:** Bryant's three precollege programs, GT STEAM's two sites, North Shore Glass School's two studios, and South Kingstown's 40 or so short town camps in the same guide.
- **Year or price unclear:** Hull Fishing Camp and Hopkinton Center for the Arts show weeks with no year; Starland's $349 has no year; Explore Your Environment's "$150 per session" could mean the day or the week.

- **Providence:** [Bryant University Precollege Summer Programs](providence/bryant-university-precollege-summer-programs-smithfield.json), [Discovery Camp](providence/south-kingstown-discovery-camp-south-kingstown.json), [Explore Your Environment (E.Y.E.)](providence/explore-your-environment-new-bedford.json), [GT STEAM Academy (Providence)](providence/gt-steam-academy-providence.json), [Peter Pan Surfing Academy Surf Camps](providence/peter-pan-surfing-academy-surf-camps-narragansett.json), [Summer Design Studios](providence/downcity-design-summer-design-studios-providence.json)
- **Boston:** [AI Institute Summer Camp](boston/ai-institute-summer-camp-boston.json), [Accelerate Pre-College Programs (Boston campus)](boston/accelerate-pre-college-programs-boston.json), [All Day Playground](boston/all-day-playground-dedham.json), [Boston Explorers Summer Camp](boston/boston-explorers-summer-camp-boston.json), [Capitol Debate Summer Camp at Dana Hall School](boston/capitol-debate-camp-at-dana-hall-wellesley.json), [Champ Camp Great Outdoors at Brandeis University](boston/champ-camp-great-outdoors-brandeis-waltham.json), [Einstein's Workshop Summer Camp](boston/einsteins-workshop-summer-camp-burlington.json), [Hull Fishing Camp](boston/hull-fishing-camp-hull.json), [LHCC Summer Fun](boston/bcyf-leahy-holloran-summer-fun-boston.json), [North Shore Glass School Kids Summer Workshops](boston/north-shore-glass-school-kids-summer-workshops-salem.json), [Starland Summer Break Rec Program](boston/starland-summer-break-rec-program-hanover.json), [Summer Art Camp](boston/the-boston-artistry-summer-art-camp-hingham.json), [Summer Fun in the Arts](boston/hopkinton-center-for-the-arts-summer-fun-in-the-arts-hopkinton.json), [Summer Recreation Program at Cunningham Park](boston/summer-recreation-program-at-cunningham-park-milton.json)
- **Connecticut:** [YMCA Camp Cove](connecticut/ymca-camp-cove-mystic.json)

## Ask the owner for the brochure

These refused BunkcheckBot, so nothing was fetched another way: New England Aquarium, Westwood Recreation, Marblehead Recreation, Woonsocket Recreation, Snapology Burlington, Code Wiz, Brandeis Genesis, BGC Metro North, Providence College camps, Wentworth and Simmons, and others listed in the discovery notes.

## No listing

- No current season on the camp's own site: EXPLORE Marshfield, Nicole's Art Spot, Camp Greenway (Hampton, NH).
- Wrong place: the Rehoboth Art League found is in Rehoboth Beach, Delaware.
- Still to find: most Rhode Island town rec departments (North Providence, Cumberland, Warwick, Portsmouth and others) and many Boston-area towns list summer camps only in their registration systems, which show fall programs now. Search again in March.
