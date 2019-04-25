function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

var filterNames = ["price","size","distance","ppa"];

function setSliderLabelUI(name, ui) {
    $( "#" + name + "-amount" ).val( ui.values[0] + " - " + ui.values[1] );
}

function minValue(name) {
    return $( "#" + name + "-slider-range" ).slider( "values", 0 );
}

function maxValue(name) {
    return $( "#" + name + "-slider-range" ).slider( "values", 1 );
}

function setSliderLabel(name) {
    $( "#" + name + "-amount" ).val(minValue(name) + " - " + maxValue(name));
}

function filterTable(name) {
    var matching = 0;
    $("#propertiesTable tr").filter(function() {
        var includeRow = true;
        if (! parseFloat(this.dataset["header"]) > 0) {
            for (const name of filterNames) {
                let nameData = parseFloat(this.dataset[name]);
                includeRow &= nameData >= parseFloat(minValue(name));
                includeRow &= nameData <= parseFloat(maxValue(name));
            }
            matching += (includeRow ? 1 : 0);
            this.style.display = (includeRow ? "table-row" : "none");
        }
    });
    $("#matchingCount").val(matching);
}

function configureSlider(name, min, max, step) {
    $( "#" + name + "-slider-range" ).slider({
        range: true,
        min: min,
        max: max,
        step: step,
        values: [ min, max ],
        slide: function( event, ui ) {
            setSliderLabelUI(name, ui);
            filterTable(name);
        }
    });
    setSliderLabel(name);
}

function loadImage(nodeID) {
    var imageNode = document.getElementById(nodeID);
    var imageURL = imageNode.dataset.url;
    imageNode.src = imageURL;
    imageNode.onclick = "";
}

function getRowHTML(prop) {
    return `<tr data-header="0" data-price="${ prop['price']}" data-distance="${ prop['mcv_distance_km']}" data-size="${ prop['lotSize_acres'] }" data-ppa="${ prop['price_per_acre'] }">
              <td>${ prop["streetAddress"] }, ${ prop["city"] }, ${ prop["zipcode"] }</td>
              <td>$${ prop["price"] }</td>
              <td>${ Math.round(prop["lotSize_acres"]) } a</td>
              <td>$${ Math.round(prop["price_per_acre"]) }/a</td>
              <td>${ prop["homeType"].replace("SINGLE_FAMILY","HOUSE").replace("MANUFACTURED","HOUSE").replace("MULTI_FAMILY","HOUSE").replace("LOT","LAND") }</td>
              <td>${ Math.round(prop["mcv_distance_km"]) } km</td>
              <td scope="row">
                <a href="${prop['zillow_url']}">[Zillow]</a>
                <a href="https://www.google.com/maps/dir/${prop['streetAddress']}, ${prop['city']}, ${prop['state']}/MCV+Campus+Virginia+Commonwealth+University,+Virginia+Commonwealth+University+Richmond,,+Virginia,+Richmond,+VA+23284">[MCV]</a>
                <a href="https://www.google.com/maps/dir/${prop['streetAddress']}, ${prop['city']}, ${prop['state']}/Amazon+Web+Services,+Worldgate+Drive,+Herndon,+VA">[IAD]</a>
              </td>
              <td scope="row"><image id="${prop['zpid']}-img" onclick="javascript:loadImage('${prop['zpid']}-img');" data-url="${prop['photo']}" src="${STATIC_BASE}/static/placeholder_house.png" width="400"/></td>
            </tr>
`;
}

function configureTable(properties) {
    var table = document.getElementById("propertiesTable");
    table.dataset["properties"] = properties;
    var tableBody = document.getElementById("propertiesTableBody");
    for (const prop of properties) {
        tableBody.appendChild(htmlToElement(getRowHTML(prop)));
    }
    // Ensure that the table has actually been loaded before configuring the following stuff, or else it doesn't always work nicely.
    configureSlider("price",0,1000000,10000);
    configureSlider("size",0,640,1);
    configureSlider("distance",0,100,1);
    configureSlider("ppa",0,500000,1000);
    $("#propertiesTable").tablesorter();
}

function loadPropertiesRemote() {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        console.log(this);
        if (this.readyState != 4) {return;}
        if (this.status == 200) {
            var data = JSON.parse(this.responseText);
            configureTable(data);
        } else {
            console.log(this.responseText);
        }
    };
    xhr.open("GET", BASE_PATH + "/properties.json", true);
    xhr.send();
}

$( function() {
    if (ASYNC) {
        loadPropertiesRemote();
    } else {
        configureTable(PROPERTIES);
    };
} );
