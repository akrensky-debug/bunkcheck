-- Registration opening dates from each camp's own site (29 camps, 0 verified
-- by a person). Generated from data/registration/windows.json by
-- campfinder.seed.registration_windows. Safe to run again: owner-confirmed dates and
-- camps with another window for the season are left alone.

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '434fc070-8fe6-5aba-9749-2df8fb36d524'::uuid, 'c449c0bc-c7ef-5ac1-87a2-9344beb7167a'::uuid, NULL, '2026-09-15T00:00:00-04:00'::timestamptz, NULL::timestamptz, 'https://www.campfuller.org/registration', FALSE, 'From the camp''s site, checked 2026-11-13: "REGISTER FOR CAMP FULLER 2027 Open September 15th for 2 week program Open November 1st for 1 week Program"; date is for everyone (2 week program); earlier: one week program opened November 1 (2026-11-01); 2027 pricing applies from Nov. 1 on; day only, no time given; Year not printed next to the dates; under the 2027 heading both dates are already past (Sept 15 and Nov 1, 2026), registration is open now. The early-bird wording from 12 Nov is no longer on the page; it now says ''2027 PRICING (Price on Nov. 1st moving forward)''', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'c449c0bc-c7ef-5ac1-87a2-9344beb7167a'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'c449c0bc-c7ef-5ac1-87a2-9344beb7167a'::uuid
      AND o.session_id IS NULL AND o.id <> '434fc070-8fe6-5aba-9749-2df8fb36d524'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '6d0253e3-f5e4-5399-a26b-1176b61379c2'::uuid, 'b1eac234-94e7-57d9-8a58-e081533f5e40'::uuid, NULL, '2026-11-01T00:00:00-04:00'::timestamptz, NULL::timestamptz, 'https://kidstocktheater.com/summer-2027/', FALSE, 'From the camp''s site, checked 2026-11-13: "SAVE 20%! SUMMER 2027 Early Bird Registration is OPEN! ... Limited spots available starting November 1. Offer applies to SUMMERSTAGE 2027 Full Weeks only."; date is for everyone (Early Bird registration); earlier: Early Bird: save 20% on full week tuition when a family registers for two or more summer weeks, limited spots from November 1; day only, no time given; Year not printed for November 1; registration is already open, so it is November 1, 2026 (past)', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'b1eac234-94e7-57d9-8a58-e081533f5e40'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'b1eac234-94e7-57d9-8a58-e081533f5e40'::uuid
      AND o.session_id IS NULL AND o.id <> '6d0253e3-f5e4-5399-a26b-1176b61379c2'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT 'fad5dc80-6f19-50b4-a478-05874ee5e11f'::uuid, '1f03be5e-6d27-5161-859f-51cc2e1dfa78'::uuid, NULL, '2026-11-06T00:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://www.runningbrook.org/summer-family-resources/important-dates', FALSE, 'From the camp''s site, checked 2026-11-13: "November 1, 2026 First day for returning families to register for the 2027 season November 6, 2026 First day for new families to register for the 2027 season"; date is for new families; earlier: returning families 2026-11-01; day only, no time given; Both dates already past; registration is open', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = '1f03be5e-6d27-5161-859f-51cc2e1dfa78'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = '1f03be5e-6d27-5161-859f-51cc2e1dfa78'::uuid
      AND o.session_id IS NULL AND o.id <> 'fad5dc80-6f19-50b4-a478-05874ee5e11f'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '6b77b043-ae4a-51c1-96b0-975699b66e0f'::uuid, 'b83ad80f-cea5-5304-bad3-962937ad66c7'::uuid, NULL, '2026-11-19T00:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://www.dextersouthfield.org/summer', FALSE, 'From the camp''s site, checked 2026-11-13: "We look forward to welcoming your family back for our 2027 season. Registration will open for returning families on November 17 and new families on November 19."; date is for new families; earlier: returning families 2026-11-17; day only, no time given; Year and weekday not printed; 2026 inferred because the sentence is about the 2027 season and November 17/19 2026 are the next occurrences. No time given', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'b83ad80f-cea5-5304-bad3-962937ad66c7'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'b83ad80f-cea5-5304-bad3-962937ad66c7'::uuid
      AND o.session_id IS NULL AND o.id <> '6b77b043-ae4a-51c1-96b0-975699b66e0f'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '7656d23b-546e-53c7-a91c-852dc0c7e02e'::uuid, 'a7f3e796-3acb-547b-97a7-701edb723524'::uuid, NULL, '2026-11-19T10:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://wheelersummercamp.com/familyinfo/tuition/', FALSE, 'From the camp''s site, checked 2026-11-13: "Registration for 2027 is set to open November 19, 2026 at 10 am!"', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'a7f3e796-3acb-547b-97a7-701edb723524'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'a7f3e796-3acb-547b-97a7-701edb723524'::uuid
      AND o.session_id IS NULL AND o.id <> '7656d23b-546e-53c7-a91c-852dc0c7e02e'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT 'a15840c4-830a-5fd1-96fc-cd5eefcdf4a8'::uuid, '90ac86cd-d1fb-5f30-a0d9-669f743cf8d1'::uuid, NULL, '2026-12-01T00:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://www.providencecountryday.org/life-at-pcd/summer-at-pcd', FALSE, 'From the camp''s site, checked 2026-11-13: "Registration for summer 2027 will open on December 1, 2026. Check back soon for the complete schedule of camp offerings."; day only, no time given; No time given', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = '90ac86cd-d1fb-5f30-a0d9-669f743cf8d1'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = '90ac86cd-d1fb-5f30-a0d9-669f743cf8d1'::uuid
      AND o.session_id IS NULL AND o.id <> 'a15840c4-830a-5fd1-96fc-cd5eefcdf4a8'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT 'ab1a7cb8-7078-512f-a9ef-7350dd39a44b'::uuid, '2be53731-b636-525c-be0f-6074ee82a49a'::uuid, NULL, '2026-12-03T18:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://www.derbyacademy.org/summer2026', FALSE, 'From the camp''s site, checked 2026-11-13: "Registration Opens December 3 Stay tuned for registration opening on Thursday, December 3, 2026 at 6:00 PM."; Time changed from 7:00 PM to 6:00 PM. The ''Registration opens 12/3 at 7:00 PM'' line we quoted is gone from the programs pages (/summer2026/programs-and-tuition and .../summer-arts). Two Derby pages now say 6:00 PM: the summer home page above and /summer2026/about (''Registration will open Thursday, December 3, 2026 at 6:00 PM.''). One registration for all Derby summer programs', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = '2be53731-b636-525c-be0f-6074ee82a49a'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = '2be53731-b636-525c-be0f-6074ee82a49a'::uuid
      AND o.session_id IS NULL AND o.id <> 'ab1a7cb8-7078-512f-a9ef-7350dd39a44b'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '49e81fef-ef42-522f-8018-ba167ef463cf'::uuid, '76231546-08e8-56c6-8c2f-400005de19e5'::uuid, NULL, '2026-12-03T18:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://www.derbyacademy.org/summer2026', FALSE, 'From the camp''s site, checked 2026-11-13: "Registration Opens December 3 Stay tuned for registration opening on Thursday, December 3, 2026 at 6:00 PM."; Time changed from 7:00 PM to 6:00 PM. The ''Registration opens 12/3 at 7:00 PM'' line we quoted is gone from the programs pages (/summer2026/programs-and-tuition and .../summer-arts). Two Derby pages now say 6:00 PM: the summer home page above and /summer2026/about (''Registration will open Thursday, December 3, 2026 at 6:00 PM.''). One registration for all Derby summer programs', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = '76231546-08e8-56c6-8c2f-400005de19e5'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = '76231546-08e8-56c6-8c2f-400005de19e5'::uuid
      AND o.session_id IS NULL AND o.id <> '49e81fef-ef42-522f-8018-ba167ef463cf'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '0a6153f0-faea-5a73-bc3e-caa52b5b55d9'::uuid, '7cb54608-0b60-5864-8133-10633f38a310'::uuid, NULL, '2026-12-04T12:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://www.summeratpark.org/', FALSE, 'From the camp''s site, checked 2026-11-13: "Registration Opens for Returning Families: Wednesday, 12/02/2026 at 12:00PM Registration Opens for New Families: Friday, 12/04/2026 at 12:00PM"; date is for new families; earlier: returning families 2026-12-02 12:00; Weekdays match the dates. Same page lists a separate Swim Club at Park registration ''Wednesday, 12/14/2026 at 06:00PM'', but 14 Dec 2026 is a Monday, so that line has a weekday/date mismatch (not our camp''s date). The 2027 camp dates also say ''No Camp: Friday, 7/5/2027'' though 5 July 2027 is a Monday', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = '7cb54608-0b60-5864-8133-10633f38a310'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = '7cb54608-0b60-5864-8133-10633f38a310'::uuid
      AND o.session_id IS NULL AND o.id <> '0a6153f0-faea-5a73-bc3e-caa52b5b55d9'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '800d23e6-bbcd-5f7f-b3e8-8f3d48cc2e23'::uuid, 'e15de38d-b1e9-5ffc-bb80-adbbc8f4c250'::uuid, NULL, '2026-12-08T00:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://www.mfa.org/programs/studio-art-classes/kids', FALSE, 'From the camp''s site, checked 2026-11-13: "Summer 2027On sale December 8"; date is for everyone (classes go on sale); day only, no time given; Year and weekday not printed; December 8, 2026 inferred because Fall 2026, Winter 2027 and February Vacation 2027 are already ''On sale now''. No time given', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'e15de38d-b1e9-5ffc-bb80-adbbc8f4c250'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'e15de38d-b1e9-5ffc-bb80-adbbc8f4c250'::uuid
      AND o.session_id IS NULL AND o.id <> '800d23e6-bbcd-5f7f-b3e8-8f3d48cc2e23'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '6e933de8-2597-5d2d-87e8-4d9d2d6a8675'::uuid, 'f0f8efd1-3bdb-5615-b662-b49ddba5709f'::uuid, NULL, '2026-12-10T10:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://wsymca.org/camp-chickami', FALSE, 'From the camp''s site, checked 2026-11-13: "Summer 2027 Registration Dates Overnight camp registration: November 2, 2026 at 10AM Day camp returning camper registration: December 3, 2026 at 10AM Day camp open registration: December 10, 2026 at 10AM"; date is for everyone (day camp open registration); earlier: returning day campers 2026-12-03 10:00 (overnight camp registration opened 2026-11-02 10:00)', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'f0f8efd1-3bdb-5615-b662-b49ddba5709f'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'f0f8efd1-3bdb-5615-b662-b49ddba5709f'::uuid
      AND o.session_id IS NULL AND o.id <> '6e933de8-2597-5d2d-87e8-4d9d2d6a8675'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '866b4133-5535-5ce6-817d-132421060338'::uuid, '652e2217-2479-5064-9df3-c87f2491b2e4'::uuid, NULL, '2026-12-10T10:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://wsymca.org/camp-pikati', FALSE, 'From the camp''s site, checked 2026-11-13: "Summer 2027 Registration Dates Overnight camp registration: November 2, 2026 at 10AM Day camp returning camper registration: December 3, 2026 at 10AM Day camp open registration: December 10, 2026 at 10AM"; date is for everyone (day camp open registration); earlier: returning day campers 2026-12-03 10:00 (overnight camp registration opened 2026-11-02 10:00)', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = '652e2217-2479-5064-9df3-c87f2491b2e4'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = '652e2217-2479-5064-9df3-c87f2491b2e4'::uuid
      AND o.session_id IS NULL AND o.id <> '866b4133-5535-5ce6-817d-132421060338'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '9e44520f-dd4a-5219-aeae-4f386152b748'::uuid, 'cb1b6d2d-672c-5430-895a-183db266bde3'::uuid, NULL, '2026-12-28T00:00:00-05:00'::timestamptz, '2027-01-31T23:59:00-05:00'::timestamptz, 'https://sailnewport.org/youth-sailing-programs/youth-instruction/', FALSE, 'From the camp''s site, checked 2026-11-13: "The 2027  application will be available December 28, 2026.  All applications received as of January 31, 2027, will be placed in classes based on experience, age, and size.  Families will be notified of placements on or by February 5, 2027."; date is for applications (placement, not first come); day only, no time given; Also: ''The initial application period runs December 28, 2026 – January 31, 2027'' and ''Applications are not managed on a first come, first in basis.'' An alert should say applications open, not that spots go first come', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'cb1b6d2d-672c-5430-895a-183db266bde3'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'cb1b6d2d-672c-5430-895a-183db266bde3'::uuid
      AND o.session_id IS NULL AND o.id <> '9e44520f-dd4a-5219-aeae-4f386152b748'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '4a07e953-54bd-57f4-b360-def368ef86a7'::uuid, '7dca1335-c82b-5714-879d-1b84361acbdc'::uuid, NULL, '2027-01-02T00:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://www.studioplayground.org/summercamp', FALSE, 'From the camp''s site, checked 2026-11-13: "Session 1: June 28 — July 1, 2027 Session 2: August 16—20, 2027 Registration opens January 2nd. We encourage early registration due to limited availability."; day only, no time given; Year and weekday not printed for January 2nd; 2027 inferred from the Summer 2027 sessions on the same page. No time given', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = '7dca1335-c82b-5714-879d-1b84361acbdc'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = '7dca1335-c82b-5714-879d-1b84361acbdc'::uuid
      AND o.session_id IS NULL AND o.id <> '4a07e953-54bd-57f4-b360-def368ef86a7'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '34a03538-3854-5de8-9f6d-feebd531a691'::uuid, 'aabf3101-0ef9-5b83-b699-7b878cd4327b'::uuid, NULL, '2027-01-07T00:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://thetrustees.org/program/farmer-forester-chef/', FALSE, 'From the camp''s site, checked 2026-11-12: "2027 Registration Begins Thursday, January 7, 2027 ... [portal] Trustees Members are eligible for early bird registration starting in January and the YMCA''s member discount."; earlier: Trustees members: early bird starting in January (day not stated); day only, no time given; Re-check 2026-11-13: thetrustees.org refused our fetcher (403); this is the 12 November read, not re-confirmed', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'aabf3101-0ef9-5b83-b699-7b878cd4327b'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'aabf3101-0ef9-5b83-b699-7b878cd4327b'::uuid
      AND o.session_id IS NULL AND o.id <> '34a03538-3854-5de8-9f6d-feebd531a691'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '45ce2585-9633-5cee-adc5-0a5ed0bc5aab'::uuid, '3e717071-930a-5a55-86ea-2d79ce1c5693'::uuid, NULL, '2027-01-07T00:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://thetrustees.org/program/south-shore-camps/', FALSE, 'From the camp''s site, checked 2026-11-12: "2027 Registration Begins Thursday, January 7, 2027 [portal https://trusteescampsouthshore.campbrainregistration.com/: ''Registration & Financial Assistance Applications for Summer 2027 will open in January.'']"; day only, no time given; Re-check 2026-11-13: thetrustees.org refused our fetcher (403); this is the 12 November read, not re-confirmed', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = '3e717071-930a-5a55-86ea-2d79ce1c5693'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = '3e717071-930a-5a55-86ea-2d79ce1c5693'::uuid
      AND o.session_id IS NULL AND o.id <> '45ce2585-9633-5cee-adc5-0a5ed0bc5aab'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '90e1b000-9a08-568b-98d9-c4c955bb1fd5'::uuid, 'ab567b2b-2f35-5550-ad0b-c378b01b6ac4'::uuid, NULL, '2027-01-07T00:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://thetrustees.org/program/south-shore-camps/', FALSE, 'From the camp''s site, checked 2026-11-12: "2027 Registration Begins Thursday, January 7, 2027 [portal https://trusteescampsouthshore.campbrainregistration.com/: ''Registration & Financial Assistance Applications for Summer 2027 will open in January.'']"; day only, no time given; Re-check 2026-11-13: thetrustees.org refused our fetcher (403); this is the 12 November read, not re-confirmed', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'ab567b2b-2f35-5550-ad0b-c378b01b6ac4'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'ab567b2b-2f35-5550-ad0b-c378b01b6ac4'::uuid
      AND o.session_id IS NULL AND o.id <> '90e1b000-9a08-568b-98d9-c4c955bb1fd5'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '642f4a7b-8c34-5c89-a5ae-4821d2b78f40'::uuid, 'dd049d21-b75a-53a4-ad57-4785c68d1b9c'::uuid, NULL, '2027-01-12T12:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://www.tenacrecds.org/summer-programs', FALSE, 'From the camp''s site, checked 2026-11-13: "Return Family Enrollment Will Begin On Tuesday, January 5th at Noon! New Family Enrollment Will Begin on Tuesday, January 12th at Noon!"; date is for new families; earlier: returning families 2027-01-05 12:00; Year not printed. 2027 worked out from the weekdays: 5 Jan 2027 and 12 Jan 2027 are both Tuesdays (in 2026 they were Monday and Monday). Fairly confident, but the page itself never says 2027', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'dd049d21-b75a-53a4-ad57-4785c68d1b9c'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'dd049d21-b75a-53a4-ad57-4785c68d1b9c'::uuid
      AND o.session_id IS NULL AND o.id <> '642f4a7b-8c34-5c89-a5ae-4821d2b78f40'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '8cb65c3e-f80f-5914-a284-58cc77faa48b'::uuid, 'a25c277d-9e43-5e53-91fa-0fac8ffa8fd6'::uuid, NULL, '2027-01-13T12:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://eliotschool.org/summer-program-for-children', FALSE, 'From the camp''s site, checked 2026-11-13: "Registration for this program opens on Wednesday, January 13, 2027 at 12:00 PM."; date is for everyone (first come, first served); Weekday matches. A later line on the page has a typo: ''Registration for the 2026 Summer Program for Children opens at 12:00 PM Wednesday, January 13, 2027.'' The program dates are June 28 - August 13, 2027, so the 2026 is a slip', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'a25c277d-9e43-5e53-91fa-0fac8ffa8fd6'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'a25c277d-9e43-5e53-91fa-0fac8ffa8fd6'::uuid
      AND o.session_id IS NULL AND o.id <> '8cb65c3e-f80f-5914-a284-58cc77faa48b'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT 'cc9b09f2-7f45-5364-a0a0-450f4cb2d67a'::uuid, 'd50d2807-3409-5ab8-bd69-96abf22ef22a'::uuid, NULL, '2027-01-13T09:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://tastebudskitchen.com/east-greenwich/kids-cooking-camps/', FALSE, 'From the camp''s site, checked 2026-11-13: "2027 Summer Camp Registration will open January 13, 2027 at 9 AM!"; earlier: VIP list (no separate date given); Also: ''Taste Buds Kitchen Summer Camps will open for registration on January 13th for the 2027 season!''', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'd50d2807-3409-5ab8-bd69-96abf22ef22a'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'd50d2807-3409-5ab8-bd69-96abf22ef22a'::uuid
      AND o.session_id IS NULL AND o.id <> 'cc9b09f2-7f45-5364-a0a0-450f4cb2d67a'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '9baa984e-479e-5317-9d5d-f23d05a14962'::uuid, '07e6c4da-dbf2-5b97-9c90-3e1cdd4fab8a'::uuid, NULL, '2027-01-15T00:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://www.ppacri.org/outreach/next-stop-broadway', FALSE, 'From the camp''s site, checked 2026-11-13: "Registration for Summer 2027 opens January 15."; date is for everyone (Next Stop BROADWAY first come, first served; ENCORE! requires acceptance first); day only, no time given; Year and weekday not printed for January 15; 2027 inferred from ''Summer 2027''. No time given. The same sentence appears under both the Next Stop BROADWAY and ENCORE! sections', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = '07e6c4da-dbf2-5b97-9c90-3e1cdd4fab8a'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = '07e6c4da-dbf2-5b97-9c90-3e1cdd4fab8a'::uuid
      AND o.session_id IS NULL AND o.id <> '9baa984e-479e-5317-9d5d-f23d05a14962'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '18a763d7-3c14-5011-a58a-5fc24a09dea8'::uuid, 'abbb6054-82c6-566a-8f44-93ce34af9b9f'::uuid, NULL, '2027-01-22T09:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://levitatecamps.com/registration/', FALSE, 'From the camp''s site, checked 2026-11-13: "2027 Registration Opens 1/22 9am"; Year and weekday not printed; 2027 inferred from ''2027 Registration''. Banner also says ''2027 Camp Registration January 22 9AM''. One registration page for all Levitate camps', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'abbb6054-82c6-566a-8f44-93ce34af9b9f'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'abbb6054-82c6-566a-8f44-93ce34af9b9f'::uuid
      AND o.session_id IS NULL AND o.id <> '18a763d7-3c14-5011-a58a-5fc24a09dea8'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT 'e66d35b6-58c0-5707-a9bb-1770c3c2a464'::uuid, 'a01a72be-64fe-5123-9d3b-f95d7f35ee73'::uuid, NULL, '2027-01-22T09:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://levitatecamps.com/registration/', FALSE, 'From the camp''s site, checked 2026-11-13: "2027 Registration Opens 1/22 9am"; Year and weekday not printed; 2027 inferred from ''2027 Registration''. Banner also says ''2027 Camp Registration January 22 9AM''. One registration page for all Levitate camps', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'a01a72be-64fe-5123-9d3b-f95d7f35ee73'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'a01a72be-64fe-5123-9d3b-f95d7f35ee73'::uuid
      AND o.session_id IS NULL AND o.id <> 'e66d35b6-58c0-5707-a9bb-1770c3c2a464'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '0a2610b3-115b-514c-8e21-247bd0fd1ec5'::uuid, '6fd7f9fd-a91d-5697-b2c5-eb7f92020522'::uuid, NULL, '2027-01-22T09:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://levitatecamps.com/registration/', FALSE, 'From the camp''s site, checked 2026-11-13: "2027 Registration Opens 1/22 9am"; Year and weekday not printed; 2027 inferred from ''2027 Registration''. Banner also says ''2027 Camp Registration January 22 9AM''. One registration page for all Levitate camps', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = '6fd7f9fd-a91d-5697-b2c5-eb7f92020522'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = '6fd7f9fd-a91d-5697-b2c5-eb7f92020522'::uuid
      AND o.session_id IS NULL AND o.id <> '0a2610b3-115b-514c-8e21-247bd0fd1ec5'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT 'cbed88a2-6e5a-5f3b-b7d4-325eac25e4aa'::uuid, 'e1abc437-e472-51bd-a3a3-0591108be4d7'::uuid, NULL, '2027-02-01T00:00:00-05:00'::timestamptz, '2027-02-15T23:59:00-05:00'::timestamptz, 'https://courageoussailing.org/signup/', FALSE, 'From the camp''s site, checked 2026-11-13: "2027 Summer Youth Program lottery registration is open February 1st - 15th."; date is for lottery entries; day only, no time given; Important Dates list: ''Lottery Registration Opens: February 1 / Lottery Registration Closes: February 15 / Confirmation Letters emailed: March 1'' (no year). BUT the Steps To Lead section on the same page still says ''The lottery will open for registration from February 1-15, 2026.'' Looks like a stale line from last year; the 2027 date is inferred from the page''s 2027 heading. Worth flagging before an alert goes out. Lottery, so no advantage to registering early', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'e1abc437-e472-51bd-a3a3-0591108be4d7'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'e1abc437-e472-51bd-a3a3-0591108be4d7'::uuid
      AND o.session_id IS NULL AND o.id <> 'cbed88a2-6e5a-5f3b-b7d4-325eac25e4aa'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '706bb0ab-c286-576e-9e09-13c76fa5523b'::uuid, 'f2466b0d-2e8a-54c1-afb8-024fd18ee608'::uuid, NULL, '2027-02-01T00:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://edgewoodsailing.org/youth/registration/closed', FALSE, 'From the camp''s site, checked 2026-11-13: "All youth classes for 2026 have concluded. Registration for 2027 will open February 1."; day only, no time given; Also: ''Youth registrations are closed for 2026. Registrations for the 2027 season will open on February 1.'' Weekday not printed. The direct fetch of this URL came back nearly empty once; it loaded fine via the site''s own Register link (edgewoodsailing.org/node/add/youth-registration redirects here)', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = 'f2466b0d-2e8a-54c1-afb8-024fd18ee608'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = 'f2466b0d-2e8a-54c1-afb8-024fd18ee608'::uuid
      AND o.session_id IS NULL AND o.id <> '706bb0ab-c286-576e-9e09-13c76fa5523b'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '458d13a6-e307-5a16-83ab-afc16b6d3cdd'::uuid, '8d44c93c-d39b-5398-8736-210ece4b411a'::uuid, NULL, '2027-03-01T00:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://peopleincfr.org/wp-content/uploads/Camp-Jack-Brochure-2-1.pdf', FALSE, 'From the camp''s site, checked 2026-11-13: "Every year, registration for Camp Jack begins on March 1st. Registration is on a first come first serve basis."; date is for everyone (first come, first served; campers must be Type 1 diabetics); day only, no time given; Recurring rule, not a 2027-specific date; the brochure lists ''2025 theme weeks'', so it is an older brochure. March 1, 2027 is an inference from ''every year''', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = '8d44c93c-d39b-5398-8736-210ece4b411a'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = '8d44c93c-d39b-5398-8736-210ece4b411a'::uuid
      AND o.session_id IS NULL AND o.id <> '458d13a6-e307-5a16-83ab-afc16b6d3cdd'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT '05d4e3ef-c3b5-54ef-a467-5c97e341b1c4'::uuid, '8d83f5c5-cb9c-5156-870a-ad59821c8a40'::uuid, NULL, '2027-03-01T00:00:00-05:00'::timestamptz, NULL::timestamptz, 'https://franklinma.gov/1158/Summer-Camp', FALSE, 'From the camp''s site, checked 2026-11-13: "2027 Summer Camp We will begin registration on March 1, 2027"; day only, no time given; No time given', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = '8d83f5c5-cb9c-5156-870a-ad59821c8a40'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = '8d83f5c5-cb9c-5156-870a-ad59821c8a40'::uuid
      AND o.session_id IS NULL AND o.id <> '05d4e3ef-c3b5-54ef-a467-5c97e341b1c4'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';

INSERT INTO registration_windows (id, camp_id, session_id, opens_at, closes_at, source_url, verified, notes, updated_at)
SELECT 'dbacbcc0-0dac-5a67-a6df-02f6f600e2a4'::uuid, '6ca06b28-fa3d-5b4a-ab08-4c3f7fc48df6'::uuid, NULL, '2027-04-05T00:00:00-04:00'::timestamptz, NULL::timestamptz, 'https://www.watupparowingcenter.org/summer-rowing', FALSE, 'From the camp''s site, checked 2026-11-13: "Registration for summer 2027 opens April 5, 2027!"; day only, no time given; No time given', now()
WHERE EXISTS (SELECT 1 FROM camps WHERE id = '6ca06b28-fa3d-5b4a-ab08-4c3f7fc48df6'::uuid)
  AND NOT EXISTS (SELECT 1 FROM registration_windows o WHERE o.camp_id = '6ca06b28-fa3d-5b4a-ab08-4c3f7fc48df6'::uuid
      AND o.session_id IS NULL AND o.id <> 'dbacbcc0-0dac-5a67-a6df-02f6f600e2a4'::uuid
      AND o.opens_at >= '2026-07-01T00:00:00+00:00'::timestamptz AND o.opens_at < '2027-09-01T00:00:00+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
  source_url = EXCLUDED.source_url, verified = EXCLUDED.verified, notes = EXCLUDED.notes, updated_at = now()
  WHERE registration_windows.notes IS NULL OR registration_windows.notes NOT LIKE 'From the owner%';
