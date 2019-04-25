import base64
import boto3
import copy
from datetime import datetime, timedelta
from decimal import Decimal
import hashlib
import http.cookies
# import instagram
import json
from math import radians, degrees, cos, sin, asin, sqrt, fabs, log, tan, pi, atan2
import os
import traceback
import urllib
import urllib.parse
import uuid
from sneks.ddb import make_json_safe
from sneks.sam import events
from sneks.sam.response_core import make_response, redirect, ApiException
from sneks.sam.decorators import register_path, returns_json, returns_html
from sneks.sam.exceptions import *
from toco.object import CFObject
from orm import TeamObject, CourseObject, RouteObject
import time
import gmaps

TEAM_COOKIE_KEY = "astronav-team"

def dumps(obj, *args, **kwargs):
    return json.dumps(make_json_safe(obj), *args, **kwargs)

def _load_course(course_id):
    if not course_id:
        HTTP404.throw({"message":"No course ID provided!"})
    course = CourseObject(course_id=course_id)
    for location in course.locations:
        location["visited"] = location.get("visited", False)
    if not course._in_db:
        HTTP404.throw({"message":"Course not found!"})
    return course

def _load_route(course_id, route_id):
    if not course_id:
        HTTP404.throw({"message":"No course ID provided!"})
    if not route_id:
        HTTP404.throw({"message":"No route ID provided!"})
    route = RouteObject(course_id=course_id, route_id=route_id)
    if not route._in_db:
        HTTP404.throw({"message":"Route not found!"})
    return route

def get_route_id(addresses):
    base_string = " ".join(sorted(addresses))
    return hashlib.sha256(base_string.encode("utf-8")).hexdigest()

@register_path("HTML", r"^/?course/list$")
@returns_html("course/list.html")
def course_list_page(event, *args, next_token=None, **kwargs):
    response = CourseObject.scan(NextToken=next_token)
    courses = response["Items"]
    token = response["NextToken"]
    return {"courses":courses, "next_token":token, "GMAPS_API_KEY":os.environ["GMAPS_PUBLIC"]}

@register_path("HTML", r"^/?course/create$")
@returns_html("course/create.html")
def course_create_page(event, *args, copy_from=None, **kwargs):
    course_id = copy_from
    response = {"course":None, "GMAPS_API_KEY":os.environ["GMAPS_PUBLIC"]}
    if course_id:
        course = CourseObject(course_id=course_id)
        if course._in_db:
            response["course"] = course
            for i in range(len(course.locations)):
                course.locations[i]["index"] = i
    return response

@register_path("HTML", r"^/?course/view$")
@returns_html("course/view.html")
def course_view_page(event, *args, course_id=None, **kwargs):
    course = _load_course(course_id)
    # TODO: add pagination in some way, even if just by loading everything here.
    routes = RouteObject.query(course_id=course_id)["Items"]
    return {"course":course, "routes":routes, "GMAPS_API_KEY":os.environ["GMAPS_PUBLIC"]}

@register_path("HTML", r"^/?route/create$")
@returns_html("index.html")
# @returns_html("route_create.html")
def route_create_page(event, *args, course_id=None, **kwargs):
    course = _load_course(course_id)
    return {"title":"Create Route", "GMAPS_API_KEY":os.environ["GMAPS_PUBLIC"]}

@register_path("HTML", r"^/?route/view$")
@returns_html("route/view.html")
def route_view_page(event, *args, course_id=None, route_id=None, **kwargs):
    course = _load_course(course_id)
    route = _load_route(course_id=course_id, route_id=route_id)

    js_route = gmaps.convert_python_route_to_javascript(route.route)
    js_data = dumps(js_route, sort_keys=True, separators=(',',':'))
    return {"course":course, "route":route, "js_data":js_data, "title":"View Route", "GMAPS_API_KEY":os.environ["GMAPS_PUBLIC"]}

@register_path("API", r"^/?route/create/api$")
@returns_json
def route_create_api(event, *args, course_id=None, start_point=None, **kwargs):
    course = _load_course(course_id)
    addresses = [x["address"] for x in course.locations if not x.get("visited")]
    if start_point and not start_point == addresses[0]:
        addresses = [start_point] + addresses
    if course.end_address != addresses[-1]:
        addresses.append(course.end_address)
    route_id = get_route_id(addresses)
    try:
        route_obj = _load_route(course_id=course_id, route_id=route_id)
        return {"message":"Route already existed.","course_id":course_id,"route_id":route_id}
    except:
        route = gmaps.load_route_from_google(addresses)
        print(route)
        route_obj = RouteObject(course_id=course_id, route_id=route_id, route=route, addresses=addresses)
        route_obj._save()
        return {"message":"Route successfully created.","course_id":course_id,"route_id":route_id}

@register_path("API", r"^/?course/update/api$")
@returns_json
def course_update_api(event, *args, course_id=None, action=None, data=None, **kwargs):
    print(json.dumps(event))
    if not action:
        HTTP404.throw({"message":"No action provided!"})
    course = _load_course(course_id)

    if action.lower() == "update_locations_visited":
        for location in course.locations:
            if location["address"] in data:
                location["visited"] = data[location["address"]]
        course._save()
        return {"success":True}
    HTTP404.throw({"message":"Unknown action provided!"})

@register_path("API", r"^/?course/create/api$")
@returns_json
def course_create_api(event, *args, city=None, notes=None, locations=[], **kwargs):
    print(json.dumps(event))
    try:
        course_id = str(uuid.uuid1())
        start = [x for x in locations if x.get("start")][0]
        end = [x for x in locations if x.get("end")][-1]
        for location in locations:
            location["visited"] = location.get("visited", False)
            location.update(gmaps.load_location_from_google(location["address"]))
        params = {
            "course_id": course_id,
            "locations": locations,
            "city": city,
            "notes": notes
        }
        course = CourseObject(**params)
        course._save()
        return {"message":"Course successfully created.","course_id":course_id}
    except:
        traceback.print_exc()
        HTTP400.throw({"message":"<pre>\n" + traceback.format_exc() + "\n</pre>"})

def add_team_to_event(info, *args, **kwargs):
    return info

def _add_info_kwargs(info, kwargs):
    if not kwargs:
        return info
    existing_kwargs = list(info.keys())
    for k in kwargs:
        if k not in existing_kwargs:
            info[k] = kwargs[k]
    return info

def add_body_as_kwargs(info, *args, **kwargs):
    if not info["event"].get("body"):
        info["body"] = {}
        return info
    body = json.loads(info["event"]["body"])
    info["body"] = body
    return _add_info_kwargs(info, body)

def add_qs_as_kwargs(info, *args, **kwargs):
    qs_args = info["event"]["queryStringParameters"]
    info["qs_args"] = qs_args
    return _add_info_kwargs(info, qs_args)
