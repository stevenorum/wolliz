function countCharacters(fieldToCount, countFieldId) {
    console.log(fieldToCount);
    maxLength = parseInt(fieldToCount.getAttribute("maxlength"));
    var countField = document.getElementById(countFieldId);
    countField.innerHTML = `${fieldToCount.value.length} / ${maxLength}`;
    // if ( fieldToCount.value.length > maxlimit ) {
    //     fieldToCount.value = fieldToCount.value.substring( 0, maxlimit );
    //     return false;
    // } else {
    //     countfield.value = maxlimit - field.value.length;
    // }
}

function addLocation() {
    var locations = document.getElementsByClassName("location");
    var locationCount = locations.length;
    var newLocationHtml = `<div class="location" data-index="${locationCount}">
           Location ${locationCount+1}<br/>
           Address:<input type="text" id="address-${locationCount}" class="address" size="100"><br>
           Notes:<input type="text" id="notes-${locationCount}" class="notes" size="100"><br>
           <hr/>
         </div>`;
    document.getElementById('locations').appendChild(htmlToElement(newLocationHtml));
}

function createCourse() {
    var returnToStart = document.getElementById("returnToStartCheckbox").checked;
    var reqdata = {
        "city":document.getElementById("courseCity").value.trim(),
        "locations":[],
        "notes":document.getElementById("courseNotes").value.trim()
    };
    var locationElements = document.getElementsByClassName("location");
    for (var i = 0; i < locationElements.length; i++) {
        var locationDiv = locationElements[i];
        var index = locationDiv.dataset.index;
        var addressElement = document.getElementById(`address-${index}`);
        var notesElement = document.getElementById(`notes-${index}`);
        if (null == addressElement || null == notesElement) {continue;}
        var address = addressElement.value.trim().replace('"','').replace("'","");
        var notes = notesElement.value.trim();
        if (address.length == 0) { continue; }
        var newLocation = { address: address, notes: notes, start: false, end: false };
        if (reqdata["locations"].length == 0) {
            newLocation["start"] = true;
            if (returnToStart) { newLocation["end"] = true; }
        }
        reqdata["locations"].push(newLocation);
    }
    if (!returnToStart) { reqdata["locations"][reqdata["locations"].length - 1]["end"] = true; }

    if (reqdata["locations"].length < 4) {
        errorMessage("No point creating a course with fewer than 4 distinct locations.");
        return false;
    }

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        console.log(this);
        if (this.readyState != 4) {return;}
        if (this.status == 200) {
            infoMessage("Redirecting...");
            console.log(this);
            console.log(this.responseText);
            var data = JSON.parse(this.responseText);
            console.log("RESPONSE:");
            console.log(data);
            if ('redirect' in data) {
                window.location.replace(data['redirect']);
            } else if ('course_id' in data) {
                window.location.replace(BASE_PATH + "/course/view?course_id=" + data['course_id']);
            } else {
                errorMessage("A very strange error occurred.  Retrying may or may not help.");
            }
        } else {
            clearMessages();
            if (this.status >= 500) {
                errorMessage("An unspecified error occurred.  Retrying may or may not help.");
            } else if (this.status >= 400) {
                var data = JSON.parse(this.responseText);
                if ('message' in data) {
                    errorMessage(data["message"]);
                } else {
                    errorMessage("An unspecified error occurred.  Retrying won't help.");
                }
            }
        }
    };
    xhr.open("POST", BASE_PATH + "/course/create/api", true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xhr.send(JSON.stringify(reqdata));
}

function setMessages(infoMessage, errorMessage) {
    var errNode = $("#errormessage")[0];
    var infNode = $("#infomessage")[0];
    errNode.innerText = errorMessage;
    errNode.style.display = (errorMessage.length == 0 ? "none" : "block");
    infNode.innerText = infoMessage;
    infNode.style.display = (infoMessage.length == 0 ? "none" : "block");
}

function errorMessage(message) {
    setMessages("", message);
}

function infoMessage(message) {
    setMessages(message, "");
}

function clearMessages() {
    setMessages("", "");
}
