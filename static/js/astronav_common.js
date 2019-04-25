function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function messageNode(message, level) {
    return htmlToElement(`<div class="alert alert-${level} text-center" role="alert">${message}</div>`);
}

function addMessage(message, level) {
    document.getElementById(level + "Messages").appendChild(messageNode(message, level));
}

function messageError(message) {
    addMessage(message, "danger");
}

function messageWarning(message) {
    addMessage(message, "warning");
}

function messageInfo(message) {
    addMessage(message, "info");
}

function messageSuccess(message) {
    addMessage(message, "success");
}

function toClipboardOld(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }
    document.body.removeChild(textArea);
}

function toClipboard(text) {
    if (!navigator.clipboard) {
        toClipboardOld(text);
        return;
    }
    navigator.clipboard.writeText(text).then(function() {
        console.log('Async: Copying to clipboard was successful!!1!');
    }, function(err) {
        console.error('Async: Could not copy text: ', err);
        toClipboardOld(text);
    });
}

function getLocation(func=null) {
    if (null == func) {
        func = showPosition;
    }
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(func);
    } else {
        console.log("Geolocation is not supported by this browser.");
        messageError("Geolocation is not supported by this browser.");
    }
}

function showPosition(position) {
    console.log(position);
    document.getElementById("currentLocation").innerHTML = `Current LAT/LNG: ${position.coords.latitude}, ${position.coords.longitude}`;
}

function createRoute(course_id, start_point=null) {
    var reqdata = {
        "course_id":course_id
    };
    if (null != start_point) {
        reqdata["start_point"] = start_point;
    }
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        console.log(this);
        if (this.readyState != 4) {return;}
        if (this.status == 200) {
            var data = JSON.parse(this.responseText);
            messageInfo("Success!!1!");
            window.location.replace(`${BASE_PATH}/route/view?course_id=${data['course_id']}&route_id=${data['route_id']}`);
        } else {
            console.log(this.responseText);
            if (this.status >= 500) {
                messageError("An unspecified error occurred.  Retrying may or may not help.");
            } else if (this.status >= 400) {
                var data = JSON.parse(this.responseText);
                if ('message' in data) {
                    messageError(data["message"]);
                } else {
                    messageError("An unspecified error occurred.  Retrying won't help.");
                }
            }
        }
    };
    xhr.open("POST", BASE_PATH + "/route/create/api", true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.send(JSON.stringify(reqdata));
}

function createRouteFromHere(course_id) {
    getLocation(function(position) {
        createRoute(course_id, {"lat":position.coords.latitude,"lng":position.coords.longitude});
    });
}
