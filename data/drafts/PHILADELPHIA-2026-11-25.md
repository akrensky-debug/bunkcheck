# Philadelphia: first camps, drafted on 25 November 2026

These 75 camps came from a search of Philadelphia and its suburbs in Montgomery, Delaware, Chester and Bucks counties: city programs, township recreation, YMCA branches, private day camps, independent schools, colleges, nature centers, arts centers and three overnight camps. Claude read each camp's own pages with the repo fetcher (BunkcheckBot) and wrote the draft by hand, every filled field tied to the page that states it. Prices are the non-resident or non-member (guest) rate, and missing ZIPs come from the Census geocoder where the camp gives a street address.

43 are ready and 32 need a decision from you. The branch adds `data/camps/philadelphia.json` (metro "Philadelphia, PA") and 35 towns and townships to `campfinder/seed/cities.py` from the Census Bureau 2024 Gazetteer. Five postal towns the Census doesn't list are filed under the township the Census geocoder gives for the camp's address: Gladwyne under Lower Merion, Havertown under Haverford, Ottsville under Tinicum, Chester Springs under West Pikeland, Huntingdon Valley under Lower Moreland.

## Ready to promote

Open a few and read their `first_pass`, then `python -m campfinder.ingest.promote --ready data/drafts/philadelphia --by "Andrew Krensky"` and `python -m campfinder.seed.import_real --check`. Publishing also needs a migration naming the new camps, like 0037.

| Camp | Town | Season |
| --- | --- | --- |
| [Arrowhead Day Camp](philadelphia/arrowhead-day-camp-west-chester.json) | West Chester | 2027 |
| [Benchmark Camp](philadelphia/benchmark-summer-camp-media.json) | Media | 2027 |
| [Briar Bush Nature Center Summer Camp](philadelphia/briar-bush-nature-center-summer-camp-abington.json) | Abington | 2027 |
| [Camp Galil](philadelphia/camp-galil-ottsville.json) | Tinicum | 2027 |
| [Camp Kweebec](philadelphia/camp-kweebec-schwenksville.json) | Schwenksville | 2027 |
| [Camp Saginaw](philadelphia/camp-saginaw-oxford.json) | Oxford | 2027 |
| [Camp Schuylkill](philadelphia/camp-schuylkill-philadelphia.json) | Philadelphia | 2027 |
| [Camp TPS](philadelphia/camp-tps-philadelphia.json) | Philadelphia | 2026 |
| [Camp Walnut](philadelphia/camp-walnut-philadelphia.json) | Philadelphia | 2027 |
| [Cheltenham Center for the Arts Summer Art Camp](philadelphia/cheltenham-center-for-the-arts-summer-art-camp-cheltenham.json) | Cheltenham | 2026 |
| [College Settlement Day Camp](philadelphia/college-settlement-day-camp-horsham.json) | Horsham | 2026 |
| [DEAN Camps at Haverford College](philadelphia/dean-adventure-camp-at-haverford-college-haverford.json) | Haverford | 2027 |
| [Dragon Gym Summer Camp (Berwyn)](philadelphia/dragon-gym-summer-camp-berwyn.json) | Berwyn | 2027 |
| [Dragon Gym Summer Camp (Exton)](philadelphia/dragon-gym-summer-camp-exton.json) | Exton | 2027 |
| [Dragon Gym Summer Camp (Malvern)](philadelphia/dragon-gym-summer-camp-malvern.json) | Malvern | 2027 |
| [Easttown Township Summer Camp](philadelphia/easttown-township-summer-camp-devon.json) | Devon | 2026 |
| [ESF Summer Camps at Devon Preparatory School](philadelphia/esf-summer-camps-at-devon-prep-devon.json) | Devon | 2027 |
| [ESF Summer Camps at Friends Select School](philadelphia/esf-summer-camps-at-friends-select-school-philadelphia.json) | Philadelphia | 2027 |
| [ESF Summer Camps at Montgomery School](philadelphia/esf-summer-camps-at-montgomery-school-chester-springs.json) | West Pikeland | 2027 |
| [ESF Summer Camps at Norwood-Fontbonne Academy](philadelphia/esf-summer-camps-at-norwood-fontbonne-academy-philadelphia.json) | Philadelphia | 2027 |
| [ESF Summer Camps at The Haverford School](philadelphia/esf-summer-camps-at-the-haverford-school-haverford.json) | Haverford | 2027 |
| [Tenderfoot Camp](philadelphia/friends-central-tenderfoot-camp-wynnewood.json) | Wynnewood | 2027 |
| [GA Day Camp](philadelphia/ga-day-camp-fort-washington.json) | Fort Washington | 2026 |
| [Hill Top Summer Camps](philadelphia/hill-top-summer-camps-bryn-mawr.json) | Bryn Mawr | 2026 |
| [Holy Child Academy Summer Camp](philadelphia/holy-child-academy-summer-camp-drexel-hill.json) | Drexel Hill | 2027 |
| [Jefferson STEM Summer Camp Experience](philadelphia/jefferson-stem-summer-camp-experience-philadelphia.json) | Philadelphia | 2026 |
| [Lionville YMCA Camp (Camp Lionville)](philadelphia/lionville-ymca-camp-exton.json) | Exton | 2026 |
| [Lower Merion Playground Activities Camp](philadelphia/lower-merion-playground-activities-camp-wynnewood.json) | Wynnewood | 2026 |
| [Lower Merion Special Recreation Afternoon Camp](philadelphia/lower-merion-special-recreation-afternoon-camp-bala-cynwyd.json) | Bala Cynwyd | 2026 |
| [Lower Merion Youth Firefighter Camp](philadelphia/lower-merion-youth-firefighter-camp-bala-cynwyd.json) | Bala Cynwyd | 2026 |
| [Main Line Art Center Summer Art Camp](philadelphia/main-line-art-center-summer-art-camp-haverford.json) | Haverford | 2026 |
| [Miquon Day Camp](philadelphia/miquon-day-camp-conshohocken.json) | Conshohocken | 2027 |
| [Oscar Lasko YMCA Camp (Camp OLY)](philadelphia/oscar-lasko-ymca-camp-west-chester.json) | West Chester | 2026 |
| [Settlement Music School Wynnefield Summer Jazz Camp](philadelphia/settlement-music-school-wynnefield-summer-jazz-camp-philadelphia.json) | Philadelphia | 2026 |
| [Silver Lake Nature Center Summer Camp](philadelphia/silver-lake-nature-center-summer-camp-bristol.json) | Bristol | 2027 |
| [Summer at AIS](philadelphia/summer-at-ais-rosemont.json) | Rosemont | 2026 |
| [Summer Camp at AFS](philadelphia/summer-camp-at-afs-jenkintown.json) | Jenkintown | 2026 |
| [Summer Camp at Riverbend's Gladwyne Preserve](philadelphia/summer-camp-at-riverbends-gladwyne-preserve-gladwyne.json) | Lower Merion | 2027 |
| [Summer Friends at MPFS](philadelphia/summer-friends-at-mpfs-media.json) | Media | 2026 |
| [Temple Ambler Middle School Summer Programs](philadelphia/temple-ambler-middle-school-summer-programs-ambler.json) | Ambler | 2026 |
| [Tredyffrin Township Summer Day Camp](philadelphia/tredyffrin-township-summer-day-camp-chesterbrook.json) | Chesterbrook | 2026 |
| [Upper Main Line YMCA Camp (Camp UMLY)](philadelphia/upper-main-line-ymca-camp-berwyn.json) | Berwyn | 2026 |
| [West Chester YMCA Camp](philadelphia/west-chester-ymca-camp-west-chester.json) | West Chester | 2026 |

## Need a decision

- **YMCA branches with nothing posted for 2027 yet:** Columbia North, Haverford, Northeast Family, Phoenixville, Rocky Run, Roxborough, West Philadelphia, Willow Grove, Doylestown, Newtown, Warminster, Ambler and Christian Street. Registration opens 6 January. List them now with ages, address and care, or wait?
- **Residents or members only:** Haverford Township's two camps, Lower Moreland, Philadelphia Parks & Rec art camps, Peace Valley Nature Center, Wayne Art Center.
- **New ways a date was read:** Camp NAC and Village Farm (dates from a chart image), Kamp Kol Emet (a scanned flyer), Camp Curiosity (the page's raw code). Each file was fetched once as BunkcheckBot; nothing refused.
- **Year or price unclear:** Future Stars at Villanova (dates with no year), People's Light (a session printed as ending on a Sunday), The Creative Living Room ("per day" next to weekly-looking fees), Tyler Arboretum and Riverbend's McKaig and Wetherill sites (2027 dates to come).
- **Upper Darby Summer Stage** is a youth theater production program, and its page gives no address.

- [Ambler YMCA Summer Camp](philadelphia/ambler-ymca-summer-camp-ambler.json), [Camp Curiosity](philadelphia/camp-curiosity-doylestown.json), [Camp NAC](philadelphia/camp-nac-newtown.json), [Christian Street YMCA Summer Camp](philadelphia/christian-street-ymca-summer-camp-philadelphia.json), [Columbia North YMCA Summer Camp](philadelphia/columbia-north-ymca-summer-camp-philadelphia.json), [Doylestown YMCA Summer Camp](philadelphia/doylestown-ymca-summer-camp-doylestown.json), [Future Stars Summer Day Camp at Villanova University Cabrini Campus](philadelphia/future-stars-day-camp-at-villanova-cabrini-radnor.json), [Haverford Township Full Day Summer Camp (ECP)](philadelphia/haverford-township-full-day-summer-camp-ecp-haverford.json), [Haverford Township Playground Camp](philadelphia/haverford-township-playground-camp-havertown.json), [Haverford YMCA Summer Camp](philadelphia/haverford-ymca-summer-camp-havertown.json), [Kamp Kol Emet](philadelphia/kamp-kol-emet-yardley.json), [Lower Moreland Summer Recreation](philadelphia/lower-moreland-summer-recreation-huntingdon-valley.json), [Newtown YMCA Summer Camp at Bucks County Community College](philadelphia/newtown-ymca-summer-camp-newtown.json), [Northeast Family YMCA Summer Camp](philadelphia/northeast-family-ymca-summer-camp-philadelphia.json), [Peace Valley Nature Center Summer Camp](philadelphia/peace-valley-nature-center-summer-camp-doylestown.json), [Philadelphia Parks & Rec Visual Arts Summer Camp](philadelphia/philadelphia-parks-rec-visual-arts-summer-camp-philadelphia.json), [Philly Art Center Summer Camps](philadelphia/philly-art-center-summer-camps-philadelphia.json), [Phoenixville YMCA Summer Camp](philadelphia/phoenixville-ymca-summer-camp-phoenixville.json), [Riverbend Summer Camp at McKaig Nature Center](philadelphia/riverbend-summer-camp-at-mckaig-nature-center-wayne.json), [Riverbend Summer Camp at The Wetherill School](philadelphia/riverbend-summer-camp-at-the-wetherill-school-gladwyne.json), [Rocky Run YMCA Summer Camp](philadelphia/rocky-run-ymca-summer-camp-media.json), [Roxborough YMCA Summer Camp](philadelphia/roxborough-ymca-summer-camp-philadelphia.json), [Summer Studios at People's Light](philadelphia/summer-studios-at-peoples-light-malvern.json), [Summerside Day Camp](philadelphia/summerside-day-camp-philadelphia.json), [The Creative Living Room Summer Camp](philadelphia/the-creative-living-room-summer-camp-swarthmore.json), [Tyler Arboretum Summer Camp](philadelphia/tyler-arboretum-summer-camp-media.json), [Upper Darby Summer Stage Children's Theatre](philadelphia/upper-darby-summer-stage-childrens-theatre-havertown.json), [Village Farm Camp](philadelphia/village-farm-camp-langhorne.json), [Warminster YMCA Summer Camp](philadelphia/warminster-ymca-summer-camp-warminster.json), [Wayne Art Center Summer Art Camp](philadelphia/wayne-art-center-summer-art-camp-wayne.json), [West Philadelphia YMCA Summer Camp](philadelphia/west-philadelphia-ymca-summer-camp-philadelphia.json), [Willow Grove YMCA Summer Camp](philadelphia/willow-grove-ymca-summer-camp-hatboro.json)

## Ask the owner for the brochure

These refused BunkcheckBot, so nothing was fetched another way: the Philadelphia Zoo, Westtown, Radnor Day Camp, Upper Merion Adventure Day Camp, Upper Dublin, Penn State Abington, Snipes Farm, DelVal Kids U.

## Not listed

- Philadelphia Parks & Recreation's 100-plus neighborhood camps and the free Summer Achievers program list their sites only in the city's location finders, so there is no single camp page to draft from.
- GSK Science in the Summer is run through host organizations, not enrolled by families.
- Camp Garrett shows no year, and its site carries injected spam text.
- Unreachable from here ("host is not a public address"): Green Lane and Breezy Point Day Camps, the Morris Arboretum, Theatre Arts Center Bucks County, Willistown Township, Music Theatre Philly.
- No dated page yet: Penn, Drexel, Episcopal Academy, Penn Charter, Baldwin, Germantown Friends, George School, Girl Scouts of Eastern PA.
