function updateLocationState(course_id, location, visited) {
    var reqdata = {
        "course_id":course_id,
        "action":"update_locations_visited",
        "data": {}
    };
    reqdata["data"][location] = visited;
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        console.log(this);
        if (this.readyState != 4) {return;}
        if (this.status == 200) {
            messageInfo("Success!!1!");
            window.location.reload(true);
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
    // xhr.open("POST", basePath + "/course/create/api", true);
    xhr.open("POST", BASE_PATH + "/course/update/api", true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.send(JSON.stringify(reqdata));
}

function createRoute(course_id, location, visited) {
    var reqdata = {
        "course_id":course_id,
        "action":"update_locations_visited",
        "data": {}
    };
    reqdata["data"][location] = visited;
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        console.log(this);
        if (this.readyState != 4) {return;}
        if (this.status == 200) {
            messageInfo("Success!!1!");
            window.location.reload(true);
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
    // xhr.open("POST", basePath + "/course/create/api", true);
    xhr.open("POST", BASE_PATH + "/course/update/api", true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.send(JSON.stringify(reqdata));
}
