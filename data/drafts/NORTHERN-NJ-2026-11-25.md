# Northern New Jersey: first camps, drafted on 25 November 2026

These 66 camps came from a search of Bergen, Essex, Morris, Union, Passaic, Hudson and Somerset counties: town recreation departments, county parks, YMCAs and JCCs, private day camps (many with buses), independent schools, colleges, nature centers, museums and Girl Scout camps. Claude read each camp's own pages with the repo fetcher (BunkcheckBot) and wrote the draft by hand, every filled field tied to the page that states it. Prices are the non-resident or non-member rate, and missing ZIPs come from the Census geocoder where the camp gives a street address.

35 are ready and 31 need a decision from you. The branch adds `data/camps/northern-new-jersey.json` (metro "Northern New Jersey") and 39 towns to `campfinder/seed/cities.py` from the Census Bureau 2024 Gazetteer. Gladstone is filed under Peapack and Gladstone.

## Ready to promote

Open a few and read their `first_pass`, then `python -m campfinder.ingest.promote --ready data/drafts/northern-new-jersey --by "Andrew Krensky"` and `python -m campfinder.seed.import_real --check`. Publishing also needs a migration naming the new camps, like 0037.

| Camp | Town | Season |
| --- | --- | --- |
| [Camp Acorn at Somerset Hills YMCA](northern-new-jersey/camp-acorn-at-somerset-hills-ymca-basking-ridge.json) | Basking Ridge | 2026 |
| [Camp Clifton](northern-new-jersey/camp-clifton-clifton.json) | Clifton | 2026 |
| [Camp Riverbend](northern-new-jersey/camp-riverbend-warren.json) | Warren | 2027 |
| [Camp Sunrise Lake](northern-new-jersey/camp-sunrise-lake-morris-township.json) | Morris Township | 2026 |
| [Camp Timber at Bridgewater YMCA](northern-new-jersey/camp-timber-bridgewater-ymca-bridgewater.json) | Bridgewater | 2026 |
| [Camp Vacamas Sleepaway Camp](northern-new-jersey/camp-vacamas-sleepaway-camp-west-milford.json) | West Milford | 2027 |
| [Day Camp Sunshine](northern-new-jersey/day-camp-sunshine-basking-ridge.json) | Basking Ridge | 2026 |
| [Summer Explorations](northern-new-jersey/elisabeth-morrow-summer-explorations-englewood.json) | Englewood | 2027 |
| [Essex County Environmental Center Nature Camp](northern-new-jersey/essex-county-environmental-center-nature-camp-roseland.json) | Roseland | 2026 |
| [Flat Rock Brook Summer Day Camp](northern-new-jersey/flat-rock-brook-summer-day-camp-englewood.json) | Englewood | 2026 |
| [GSB Summer Camp](northern-new-jersey/gsb-summer-camp-gladstone.json) | Peapack and Gladstone | 2026 |
| [Harbor Hills Day Camp](northern-new-jersey/harbor-hills-day-camp-mendham.json) | Mendham | 2027 |
| [iD Tech at Montclair State University](northern-new-jersey/id-tech-at-montclair-state-university-montclair.json) | Montclair | 2027 |
| [JCC Camp Ruach](northern-new-jersey/jcc-camp-ruach-bridgewater.json) | Bridgewater | 2027 |
| [JCC MetroWest Exploration Camp](northern-new-jersey/jcc-metrowest-exploration-camp-west-orange.json) | West Orange | 2026 |
| [LSC Science Camp](northern-new-jersey/liberty-science-center-science-camp-jersey-city.json) | Jersey City | 2026 |
| [Mendham Day Camp](northern-new-jersey/mendham-day-camp-mendham.json) | Mendham | 2026 |
| [MiniQuest Camps](northern-new-jersey/miniquest-camps-madison.json) | Madison | 2026 |
| [Montclair State University & Yogi Berra Museum Youth Camp](northern-new-jersey/montclair-state-university-yogi-berra-museum-youth-camp-little-falls.json) | Little Falls | 2027 |
| [New Horizons Day Camp](northern-new-jersey/new-horizons-day-camp-florham-park.json) | Florham Park | 2027 |
| [Oak Crest Day Camp](northern-new-jersey/oak-crest-day-camp-somerset.json) | Somerset | 2027 |
| [Park Ridge Summer Camp](northern-new-jersey/park-ridge-summer-camp-park-ridge.json) | Park Ridge | 2026 |
| [Pequannock Summer Camp](northern-new-jersey/pequannock-summer-camp-pequannock.json) | Pequannock | 2026 |
| [Randolph Township Summer Day Camp](northern-new-jersey/randolph-recreation-summer-day-camp-randolph.json) | Randolph | 2026 |
| [Reeves-Reed Arboretum Summer Camps](northern-new-jersey/reeves-reed-arboretum-summer-camps-summit.json) | Summit | 2026 |
| [Ridgewood YMCA Camp Woods](northern-new-jersey/ridgewood-ymca-camp-woods-ridgewood.json) | Ridgewood | 2027 |
| [SpecialtyQuest Camp](northern-new-jersey/specialtyquest-camp-madison.json) | Madison | 2026 |
| [Spring Lake Day Camp](northern-new-jersey/spring-lake-day-camp-ringwood.json) | Ringwood | 2027 |
| [Summer at Far Brook](northern-new-jersey/summer-at-far-brook-short-hills.json) | Short Hills | 2026 |
| [Summer Arts Camp at The Growing Stage](northern-new-jersey/the-growing-stage-summer-arts-camp-netcong.json) | Netcong | 2026 |
| [Peck Summer Program](northern-new-jersey/the-peck-school-summer-program-morristown.json) | Morristown | 2026 |
| [Verona Recreation Summer Playgrounds](northern-new-jersey/verona-summer-playgrounds-verona.json) | Verona | 2026 |
| [Visual Arts Center of New Jersey Summer Art Camp for Kids](northern-new-jersey/visual-arts-center-of-new-jersey-summer-art-camp-summit.json) | Summit | 2026 |
| [Wayne Rec Summer Camp](northern-new-jersey/wayne-rec-summer-camp-wayne.json) | Wayne | 2026 |
| [Wayne Summer Day Camp](northern-new-jersey/wayne-summer-day-camp-wayne.json) | Wayne | 2026 |

## Need a decision

- **Residents only:** Summit, South Orange, Morris Plains, Bergenfield, North Bergen, Clifton and Hoboken's YWCAMP. Their one posted rate is recorded and the description says who can enroll.
- **Membership required:** the Summit Area and Westfield Area YMCA camps, and Tenafly Nature Center. Fold the membership into the price, or show it separately?
- **Outside the seven counties:** Jeff Lake Day Camp (Sussex County, buses from Essex, Morris and Somerset) and the Greater Bergen County YMCA camp on Lake Kanawauke in Harriman State Park, New York, listed at its New Milford bus stop.
- **Year unclear:** Alpine Day Camp, South Mountain YMCA, JCC Camp Deenie Riback, Boys & Girls Clubs of Hudson County and Branchburg's KidVenture print dates or prices without a clear year. Oak Knoll posts 2027 dates with 2026 prices.
- **No address, so no ZIP:** Madison YMCA's KidsQuest at Drew, Surf and Turf in Montclair, and Trailside in Mountainside (no town given).
- **Girl Scout day camps** (Lake Rickabear, Jockey Hollow): the pages don't say whether campers must be members.

- [Alpine Day Camp](northern-new-jersey/alpine-day-camp-alpine.json), [Bergenfield Summer Camp](northern-new-jersey/bergenfield-summer-camp-bergenfield.json), [Boys & Girls Clubs of Hudson County Summer Camp](northern-new-jersey/boys-girls-clubs-of-hudson-county-summer-camp-jersey-city.json), [KidVenture Summer Day Camp](northern-new-jersey/bsc-kidventure-summer-day-camp-branchburg.json), [Camp Lagoonland](northern-new-jersey/camp-lagoonland-berkeley-heights.json), [Greater Bergen County YMCA Harriman Day Camps (Kahagon, Oratam, TeenVenture)](northern-new-jersey/greater-bergen-county-ymca-harriman-day-camps-new-milford.json), [Summer Quest at the Greater Bergen County YMCA](northern-new-jersey/greater-bergen-county-ymca-summer-quest-new-milford.json), [JCC Camp Deeny Riback](northern-new-jersey/jcc-camp-deeny-riback-flanders.json), [Jeff Lake Day Camp](northern-new-jersey/jeff-lake-day-camp-stanhope.json), [Jockey Hollow Day Camp](northern-new-jersey/jockey-hollow-day-camp-mendham.json), [Jump Start](northern-new-jersey/jump-start-livingston.json), [KidsQuest Camp](northern-new-jersey/kidsquest-camp-madison.json), [Lake Rickabear Day Camp](northern-new-jersey/lake-rickabear-day-camp-kinnelon.json), [Morris Plains Recreation Summer Camp](northern-new-jersey/morris-plains-recreation-summer-camp-morris-plains.json), [North Bergen Summer Camp](northern-new-jersey/north-bergen-summer-camp-north-bergen.json), [Pioneer Trails Day Camp](northern-new-jersey/pioneer-trails-day-camp-caldwell.json), [Recky's Tiger Teen Camp](northern-new-jersey/reckys-tiger-teen-camp-tenafly.json), [South Mountain YMCA Day Camps](northern-new-jersey/south-mountain-ymca-day-camps-maplewood.json), [South Orange Recreation Summer Day Camp](northern-new-jersey/south-orange-recreation-summer-day-camp-south-orange.json), [Summer Adventures Day Camp](northern-new-jersey/summer-adventures-day-camp-summit.json), [Summer Days in the Park](northern-new-jersey/summer-days-in-the-park-clifton.json), [Summit Area YMCA Camps at Springfield Community Pool (Cannundus, Cannonball, Sports Camp)](northern-new-jersey/summit-area-ymca-camps-at-springfield-community-pool-springfield.json), [Summit Recreation Summer Camp](northern-new-jersey/summit-recreation-camp-summit.json), [Surf and Turf Adventure Camp](northern-new-jersey/surf-and-turf-adventure-camp-montclair.json), [Tenafly Nature Center Summer Nature Day Camp](northern-new-jersey/tenafly-nature-center-summer-nature-day-camp-tenafly.json), [Trailside Summer Camp](northern-new-jersey/trailside-summer-camp-mountainside.json), [Westfield Area YMCA Discovery Camp](northern-new-jersey/westfield-area-ymca-discovery-camp-westfield.json), [Westfield Area YMCA Pioneer Camp](northern-new-jersey/westfield-area-ymca-pioneer-camp-cranford.json), [Westfield Area YMCA Sunshine Camp](northern-new-jersey/westfield-area-ymca-sunshine-camp-westfield.json), [Willow Lake Day Camp](northern-new-jersey/willow-lake-day-camp-lake-hopatcong.json), [YWCAMP@Hoboken](northern-new-jersey/ywcamp-hoboken-hoboken.json)

## Ask the owner for the brochure

These refused BunkcheckBot, so nothing was fetched another way: Turtle Back Zoo, Montclair YMCA, Montclair Art Museum, Steve & Kate's Montclair and Hoboken, NJ Audubon, Somerset County Parks, the Kaplen JCC on the Palisades, Cornerstone Family Programs, Camp Hope, and JCC Camp Yachad (its rates page put up a bot challenge).

## Still to find

- Town programs not confirmed: Maplewood, Millburn, West Orange, Glen Ridge, Westfield, Cranford, Chatham, Madison, Morristown, Glen Rock, Fair Lawn, Teaneck, Englewood, Bernards, Bridgewater, Montclair and Englewood Cliffs (details only in a portal), Livingston (the listed site was Livingston, New York).
- Morris Township's and Paramus's 2026 brochures are over the fetcher's 8 MB limit.
- No dated page yet: Chatham Day School, Dwight-Englewood, Kent Place, Montclair Kimberley, Pingry, Delbarton, Stevens, NJIT, Seton Hall, Paper Mill Playhouse.
- New York camps that bus from New Jersey (Deerkill, Ramaquois and others) are left for a Rockland County pass.
