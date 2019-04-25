import base64
import boto3
import copy
from datetime import datetime, timedelta
from decimal import Decimal
import hashlib
import json
import os
import traceback
import urllib
import urllib.parse
from sneks.ddb import make_json_safe
from sneks.sam import events
from sneks.sam.response_core import make_response, redirect, ApiException
from sneks.sam.decorators import register_path, returns_json, returns_html
from sneks.sam.exceptions import *
import time

def dumps(obj, *args, **kwargs):
    return json.dumps(make_json_safe(obj), *args, **kwargs)

def _load_properties():
    bucket_name = os.environ["DATA_BUCKET"]
    all_properties = json.loads(boto3.client("s3").get_object(Bucket=bucket_name, Key="properties.json")["Body"].read().decode("utf-8"))
    properties = [x for x in all_properties if x.get("homeStatus","") == "FOR_SALE"]
    return properties

PROPERTIES = _load_properties()

@register_path("HTML", r"^/properties.html")
@returns_html("properties.html")
def properties_page_synchronous(event, *args, **kwargs):
    return {"properties":[], "async":False, "properties_json":json.dumps(PROPERTIES)}

@register_path("HTML", r"^/properties_async.html")
@returns_html("properties.html")
def properties_page_asynchronous(event, *args, **kwargs):
    # return {"properties":[], "async":True, "properties_json":json.dumps(PROPERTIES)}
    return {"properties":[], "async":True, "properties_json":"{}"}

@register_path("API", r"^/properties.json")
@returns_json
def properties_api(event, *args, **kwargs):
    return PROPERTIES

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
