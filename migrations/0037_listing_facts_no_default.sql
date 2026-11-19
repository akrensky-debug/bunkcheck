-- Extended care, transportation, meals and financial aid are yes, no, or not listed.
-- NULL means the listing doesn't say. 0001_base gave these columns DEFAULT FALSE, so a camp
-- written without them was recorded as a no. Drop the default so a missing fact stays NULL.
-- Existing rows keep their values: nothing here turns a stored false into NULL.
-- Safe to run twice: DROP DEFAULT on a column with no default does nothing.
ALTER TABLE camps ALTER COLUMN extended_care DROP DEFAULT;
ALTER TABLE camps ALTER COLUMN transportation DROP DEFAULT;
ALTER TABLE camps ALTER COLUMN meals_included DROP DEFAULT;
ALTER TABLE camps ALTER COLUMN financial_aid DROP DEFAULT;
