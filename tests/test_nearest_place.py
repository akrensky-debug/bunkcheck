"""Near me: a position becomes the nearest town we know, and nothing else."""

from __future__ import annotations

from campfinder.services.geo import nearest_place


def test_a_point_in_town_gives_that_town() -> None:
    assert nearest_place(41.8240, -71.4128) == "Providence, RI"
    assert nearest_place(41.8137, -71.3701) == "East Providence, RI"  # names keep every word


def test_a_point_between_towns_gives_the_closest() -> None:
    # A few hundred metres from Barrington town centre.
    assert nearest_place(41.7390, -71.3050) == "Barrington, RI"


def test_far_from_any_town_gives_none() -> None:
    assert nearest_place(37.7749, -122.4194) is None  # San Francisco


def test_api_near_me(client) -> None:
    r = client.post("/api/v1/places/nearest", json={"lat": 41.82, "lng": -71.41})
    assert r.status_code == 200 and r.json() == {"location": "Providence, RI"}
    far = client.post("/api/v1/places/nearest", json={"lat": 37.77, "lng": -122.42})
    assert far.status_code == 404 and "New England" in far.json()["detail"]
    assert client.post("/api/v1/places/nearest", json={"lat": 120, "lng": 0}).status_code == 422


def test_api_takes_only_two_finite_numbers(client) -> None:
    url = "/api/v1/places/nearest"
    for bad in ({"lat": "41.8", "lng": "-71.4"},          # strings
                {"lat": 41.8},                             # missing
                {"lat": 41.8, "lng": -71.4, "name": "x"},  # extra field
                {"lat": True, "lng": -71.4}):              # not a number
        assert client.post(url, json=bad).status_code == 422, bad
    for raw in ('{"lat": NaN, "lng": -71.4}', '{"lat": 41.8, "lng": Infinity}'):
        r = client.post(url, content=raw, headers={"Content-Type": "application/json"})
        assert r.status_code == 422, raw


def test_api_rounds_and_answers_the_same_for_a_precise_position(client) -> None:
    a = client.post("/api/v1/places/nearest", json={"lat": 41.823989, "lng": -71.412834}).json()
    b = client.post("/api/v1/places/nearest", json={"lat": 41.82, "lng": -71.41}).json()
    assert a == b == {"location": "Providence, RI"}


def test_api_limits_lookups_per_address(client) -> None:
    url = "/api/v1/places/nearest"
    codes = [client.post(url, json={"lat": 41.82, "lng": -71.41}).status_code for _ in range(31)]
    assert codes[:30] == [200] * 30 and codes[30] == 429
