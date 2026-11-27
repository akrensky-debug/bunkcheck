# Westchester County: first camps, drafted on 25 November 2026

Bunkcheck's first region outside New England. These 50 camps came from a search of Westchester's town and village recreation departments, the county parks, YMCAs and JCCs, private day camps, schools, colleges, nature centers and arts programs. Claude read each camp's own pages with the repo fetcher (BunkcheckBot) and wrote the draft by hand, every filled field tied to the page that states it. Prices are the non-resident rate, and missing ZIPs come from the Census geocoder where the camp gives a street address.

32 are ready and 18 need a decision from you. The branch adds `data/camps/westchester.json` (metro "Westchester County, NY") and 15 towns, villages and hamlets to `campfinder/seed/cities.py` from the Census Bureau 2024 Gazetteer. Three hamlets the Census doesn't list are filed under their town: Cross River under Lewisboro, North White Plains under North Castle, Purchase under Harrison.

## Ready to promote

Open a few and read their `first_pass`, then `python -m campfinder.ingest.promote --ready data/drafts/westchester --by "Andrew Krensky"` and `python -m campfinder.seed.import_real --check`. Publishing also needs a migration naming the new camps, like 0037.

| Camp | Town | Season |
| --- | --- | --- |
| [Boys & Girls Club of Mount Vernon Summer Program](westchester/boys-and-girls-club-of-mount-vernon-summer-program-mount-vernon.json) | Mount Vernon | 2026 |
| [Camp PGT](westchester/camp-pgt-white-plains.json) | White Plains | 2027 |
| [Challenge Camp](westchester/challenge-camp-new-rochelle.json) | New Rochelle | 2027 |
| [Clay Art Center Summer Camp](westchester/clay-art-center-summer-camp-port-chester.json) | Port Chester | 2027 |
| [Cranberry Lake Nature Camp](westchester/cranberry-lake-nature-camp-north-white-plains.json) | North Castle | 2026 |
| [Destination Science at Iona University](westchester/destination-science-iona-bronxville.json) | Bronxville | 2026 |
| [Elmwood Day Camp](westchester/elmwood-day-camp-white-plains.json) | White Plains | 2027 |
| [Hackley Summer Programs](westchester/hackley-summer-programs-tarrytown.json) | Tarrytown | 2027 |
| [Harvey Summer Camp](westchester/harvey-summer-camp-katonah.json) | Katonah | 2026 |
| [Hillside Day Camp](westchester/hillside-day-camp-hastings-on-hudson.json) | Hastings-on-Hudson | 2026 |
| [Hudson Country Montessori Summer Camp](westchester/hudson-country-montessori-summer-camp-new-rochelle.json) | New Rochelle | 2026 |
| [JBFC Summer Camps](westchester/jbfc-summer-camps-pleasantville.json) | Pleasantville | 2026 |
| [Lenoir Nature Camp](westchester/lenoir-nature-camp-yonkers.json) | Yonkers | 2026 |
| [Marshlands Nature Camp](westchester/marshlands-nature-camp-rye.json) | Rye | 2026 |
| [Mohawk Day Camp](westchester/mohawk-day-camp-white-plains.json) | White Plains | 2027 |
| [Mount Tom Day Camp](westchester/mount-tom-day-camp-new-rochelle.json) | New Rochelle | 2027 |
| [Muscoot Farm Young Farmers Camp](westchester/muscoot-farm-young-farmers-camp-somers.json) | Somers | 2026 |
| [New Rochelle YMCA Summer Camp](westchester/new-rochelle-ymca-summer-camp-new-rochelle.json) | New Rochelle | 2026 |
| [Nike Soccer Camp at Pace University](westchester/nike-soccer-camp-pace-university-pleasantville.json) | Pleasantville | 2026 |
| [Oasis Day Camp Dobbs Ferry](westchester/oasis-day-camp-dobbs-ferry.json) | Dobbs Ferry | 2027 |
| [Purchase Day Camp](westchester/purchase-day-camp-purchase.json) | Harrison | 2027 |
| [RCDS Summer Camps](westchester/rcds-summer-camps-rye.json) | Rye | 2026 |
| [Read Nature Camp](westchester/read-nature-camp-rye.json) | Rye | 2026 |
| [Rye Brook Day Camp](westchester/rye-brook-day-camp-rye-brook.json) | Rye Brook | 2026 |
| [Summer Camp at the Nature Center at Greenburgh](westchester/summer-camp-at-the-nature-center-at-greenburgh-scarsdale.json) | Scarsdale | 2026 |
| [Summer Days at the J](westchester/summer-days-at-the-j-scarsdale.json) | Scarsdale | 2027 |
| [Summer Youth Programs in the Arts](westchester/summer-youth-programs-in-the-arts-purchase.json) | Harrison | 2026 |
| [SummerStage](westchester/summerstage-arc-stages-pleasantville.json) | Pleasantville | 2026 |
| [Trailside Nature Camp](westchester/trailside-nature-camp-cross-river.json) | Lewisboro | 2026 |
| [Westchester Summer Day](westchester/westchester-summer-day-mamaroneck.json) | Mamaroneck | 2027 |
| [Westchester County Summer Programs (YMCA of Central and Northern Westchester)](westchester/ymca-of-central-and-northern-westchester-summer-program-white-plains.json) | White Plains | 2026 |
| [YMCA of Yonkers Summer Camp](westchester/ymca-of-yonkers-summer-camp-yonkers.json) | Yonkers | 2026 |

## Need a decision

- **Residents only:** most Westchester town and village camps take only residents (White Plains, Scarsdale, Larchmont, Briarcliff Manor, New Castle, Bedford, Somers). Their one posted rate is recorded and the description says who can enroll.
- **One listing or several:** White Plains, Scarsdale, Briarcliff, New Castle and Bedford run grade camps at different sites with shared dates. Each is one listing for now.
- **Membership required:** Rye Nature Center and its Paddle Adventure Camp ($125), and Teatown from 2027 ($85 family). Fold the membership into the price, or show it separately?
- **Prices:** Yorktown posts resident fees and "non-residents add 20%"; the computed figure was left out. Rye Y's rates are only in an image flipbook.
- **Who can enroll:** Masters of Innovation says it is for Masters students. Camp N.O.W. gives no ages.
- **ZIP:** J Sports Academy's page prints 10502, while the Census geocoder puts its address in 10522.

- [Town of Bedford Day Camp](westchester/bedford-town-day-camp-bedford-hills.json), [Briarcliff Manor Day Camps (Tree Camp, Super Camp, Camp Adventure)](westchester/briarcliff-manor-day-camps-briarcliff-manor.json), [Camp Horizon](westchester/camp-horizon-briarcliff-manor.json), [Camp N.O.W.](westchester/camp-now-new-rochelle.json), [City of White Plains Summer Camp](westchester/city-of-white-plains-summer-camp-white-plains.json), [Flint Park Day Camp](westchester/flint-park-day-camp-larchmont.json), [J Sports Academy](westchester/j-sports-academy-dobbs-ferry.json), [Masters of Innovation Summer Camp](westchester/masters-of-innovation-summer-camp-dobbs-ferry.json), [New Castle Summer Day Camps (Tots Camp, Camp Adventure, On the Go)](westchester/new-castle-summer-day-camps-chappaqua.json), [Paddle Adventure Camp](westchester/paddle-adventure-camp-rye.json), [Rye Brook Teen Travel Camp](westchester/rye-brook-teen-travel-camp-rye-brook.json), [Rye Y Camp](westchester/rye-y-camp-rye.json), [Scarsdale Day Camp](westchester/scarsdale-day-camp-scarsdale.json), [Somers Day Camp](westchester/somers-day-camp-somers.json), [Summer Camp at RNC](westchester/summer-camp-at-rnc-rye.json), [Teatown Natural Science Summer Day Camp](westchester/teatown-summer-camp-ossining.json), [Teen Get-A-Way](westchester/teen-get-a-way-bedford-hills.json), [Yorktown Summer Day Camp](westchester/yorktown-summer-day-camp-yorktown-heights.json)

## Ask the owner for the brochure

These refused BunkcheckBot, so nothing was fetched another way: Yonkers Parks (Camp Rays), Rye Camp 78, Dobbs Ferry, Tarrytown, Village of Ossining and Pound Ridge recreation, Breezemont, Summer Trails, Sprout Westchester, A-Game Sports, Steve & Kate's Tarrytown.

## Still to find

- Towns with no camp page found yet: Mount Kisco, Peekskill, Cortlandt, Croton, Mount Pleasant, North Salem, Eastchester, Pelham, Tuckahoe, Bronxville, Sleepy Hollow, Harrison, Ardsley, Lewisboro, Greenburgh.
- Pages with no season year yet: Rippowam Cisqua, Katonah Art Center, Steffi Nossen, Pelham Art Center, Sportime, Shames JCC River Friends.
- Irvington's camp shows "Dates: TBA" and was not drafted.
