from sneks.sam import ui_stuff # not directly needed, but this loads the google maps creds into the environment so it must happen before this module can load properly.
import boto3
import copy
from datetime import datetime, timedelta
from decimal import Decimal
import googlemaps
import hashlib
import http.cookies
import json
import os
import traceback
import urllib
import uuid

from sneks.gps import bearing, haversine, minimize_gps

GMAPS_API_KEY = os.environ["GMAPS_SECRET"]

def load_route_from_google(addresses):
    kwargs = {
        "origin":addresses[0],
        "destination":addresses[-1],
        "mode":"walking",
        "waypoints":addresses[1:-1],
        "optimize_waypoints":True,
        "avoid":["tolls","ferries"]
    }
    gmaps = googlemaps.Client(key=GMAPS_API_KEY)
    route = gmaps.directions(**kwargs)[0]
    # route["bounds"]["northeast"] = minimize_gps(route["bounds"]["northeast"])
    # route["bounds"]["southwest"] = minimize_gps(route["bounds"]["southwest"])
    # for leg in route["legs"]:
    #     leg["start_location"] = minimize_gps(leg["start_location"])
    #     leg["end_location"] = minimize_gps(leg["end_location"])
    #     leg["distance"]["crow"] = haversine(leg["start_location"]["lat"],leg["start_location"]["lng"],leg["end_location"]["lat"],leg["end_location"]["lng"])
    #     leg["distance"]["waste_meters"] = leg["distance"]["value"] - leg["distance"]["crow"]
    #     leg["distance"]["waste_ratio"] = (leg["distance"]["value"] / leg["distance"]["crow"]) - 1
    #     for step in leg["steps"]:
    #         step["start_location"] = minimize_gps(step["start_location"])
    #         step["end_location"] = minimize_gps(step["end_location"])
    return route

def address_parts_from_geocode_result(result, short=False):
    return {"/".join(c["types"]):c["short_name" if short else "long_name"] for c in result.get("address_components",[])}

def canonical_address_from_geocode_result(result):
    if "vicinity" in result:
        return result["vicinity"]
    addr_parts = address_parts_from_geocode_result(result)
    if addr_parts:
        addr = ""
        if "street_number" in addr_parts:
            addr += addr_parts["street_number"] + " "
        if "route" in addr_parts:
            addr += addr_parts["route"] + ", "
        if "locality/political" in addr_parts:
            addr += addr_parts["locality/political"]
        return addr
    return None

def load_location_from_google(address):
    print("Loading address from google maps: {}".format(address))
    gmaps = googlemaps.Client(key=GMAPS_API_KEY)
    geocode_results = gmaps.geocode(address)
    print(geocode_results)
    geocode_result = geocode_results[0]
    canonical_addr = canonical_address_from_geocode_result(geocode_result)
    info = {
        "canonical_address": canonical_addr,
        "coordinates": minimize_gps(geocode_result["geometry"]["location"])
    }
    return info

def convert_python_route_to_javascript(route):
    response = {"routes":[copy.deepcopy(route)]}
    route = response["routes"][0]
    start_address = route["legs"][0]["start_address"]
    waypoints = [l["start_address"] for l in route["legs"][1:]]
    end_address = route["legs"][-1]["end_address"]
    response["request"] = {
        "destination":{"query":end_address},
        "origin":{"query":start_address},
        "optimizeWaypoints":True,
        "travelMode": "WALKING",
        "unitSystem": 1,
        "waypoints":[{"location":{"query":addr},"stopover":True} for addr in waypoints]
    }
    for route in response["routes"]:
        route["bounds"] = {
            "east": route["bounds"]["northeast"]["lng"],
            "north": route["bounds"]["northeast"]["lat"],
            "south": route["bounds"]["southwest"]["lat"],
            "west": route["bounds"]["southwest"]["lng"]
        }
        for leg in route["legs"]:
            leg["start_location"] = minimize_gps(leg["start_location"])
            leg["end_location"] = minimize_gps(leg["end_location"])
            for step in leg["steps"]:
                step["start_location"] = minimize_gps(step["start_location"])
                step["end_location"] = minimize_gps(step["end_location"])
                step["instructions"] = step["html_instructions"]
                step["path"] = [step["start_location"], step["end_location"]]
        route["overview_path"] = [route["legs"][0]["start_location"], route["legs"][-1]["end_location"]]
    return response
