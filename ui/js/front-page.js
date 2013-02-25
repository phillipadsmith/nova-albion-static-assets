// Leaflet
var map = L.map('map', { doubleClickZoom: false } ).setView([52.2385, -123.1185], 6);
    L.tileLayer('http://{s}.tile.cloudmade.com/8df2e4e99eb94de2a136db10bf4e9afa/997/256/{z}/{x}/{y}.png', {
}).addTo(map);

// Leaflet Locate Control plug-in
// https://github.com/domoritz/leaflet-locatecontrol
L.control.locate().addTo(map);

// Polygon highlight styles
var style = {
    weight: 2,
    color: 'black',
    opacity: 0.2,
    fillColor: '#fff',
    fillOpacity: 0.5
};

var styleHighlight = {
    weight: 2,
    color: '#666',
    dashArray: '',
    fillColor: '#A8D14B',
    fillOpacity: 0.7
};

// Get the riding data from our local file
var geojson;
geojson = L.geoJson(ridingData, {
    style: style,
        onEachFeature: onEachFeature // Highlight polygons
}).addTo(map);

// For zooming into two Vancouver and Victoria
var VanSouthWest = new L.LatLng(48.927,-123.186),
    VanNorthEast = new L.LatLng(49.398,-122.353),
    vancouver = new L.LatLngBounds(VanSouthWest, VanNorthEast);

var VicSouthWest = new L.LatLng(48.268,-124.845),
    VicNorthEast = new L.LatLng(49.183,-123.179),
    victoria     = new L.LatLngBounds(VicSouthWest, VicNorthEast);

function zoomToRegion(LatLng) {
    map.fitBounds(LatLng);
}

// Leaflet control for riding info
var info = L.control();
info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
};
info.update = function ( properties ) {
    this._div.innerHTML = (properties ?
            '<h4>' + properties.name + '</h4><p><strong>Click</strong> to learn more about the riding</p><p><strong>TYEE CALL:</strong> Stay tuned.'
            : '<p><h4>Welcome to Tyee’s riding-by-riding source for election issues and action.</h4></p>' +
            '<p>Click on a riding for candidate info, fast facts and related Tyee reporting. Updated as stories break, so keep checking in. We want your input. See below.</p>' +
            '<p><a href="#riding-list">Scroll down</a> for a list of ridings</p>' +
            '<p>Zoom to <a href="#" onClick="event.preventDefault();zoomToRegion(vancouver);">Lower Mainland ridings</a>.</p>' +
            '<p>Zoom to <a href="#" onClick="event.preventDefault();zoomToRegion(victoria);">Victoria-area ridings</a>.</p>'
            );
};
info.addTo(map);

// Leaflet control for riding search
var search = L.control({ 
        //position: 'bottomleft' 
});
search.onAdd = function (map) {
    var div  = L.DomUtil.create('div', 'search');
    this._div = div 
    this.update();
    L.DomEvent.disableClickPropagation(this._div);
    return this._div;
};
search.update = function () {
    this._div.innerHTML = '<p><strong>Not sure what your riding is?</strong><br />' +
        'Type your address in the box below and we’ll get you there.' +
        '<form id="riding-search" class="riding-search">' +
        '<input type="text" size="25" placeholder="Your address: Street, City." autofocus />&nbsp;' + 
        '<input type="submit" value="Go" />' +
        '</form>' +
        '<div id="riding-message" class="riding-message"></div>'
};
search.addTo(map);

// Turn on/off polygon highlighting
function highlightFeature(e) {
    var layer = e.target;
    layer.setStyle(styleHighlight);
    if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
    }
    info.update(layer.feature.properties);
}
function resetHighlight(e) {
    var layer = e.target;
    layer.setStyle(style);
    info.update();
}

function goToRidingProfile(e) {
    var layer = e.target;
    var slug = layer.feature.properties.name;
    slug     = slug.toLowerCase().replace(/\s/g, "-");
    url        = '/riding/' + slug;
    window.location = url;
}

// Iterate over features in our GeoJSON collection
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout:  resetHighlight,
        click:     goToRidingProfile,
    });
};


// Let the user search for their riding by address
var message_div = $('.riding-message');
// Riding lookup based on user input
$('.riding-search').submit(function (e) {
    e.preventDefault();
    // First, find the latitude and longitude for this address
    var geocoder = new google.maps.Geocoder();
    var search   = $('#riding-search input[type=text]').val();
    var mobile   = $('#riding-search-mobile input[type=text]').val();
    var address  = search ? search : mobile;
    geocoder.geocode({'address': address,
        'region': 'ca'}, function(results, status) {
            show_options( results );
        });
});

function show_options(results) {
    message_div.children().remove();
    if ( results.length > 1 ) {
        // Resolve multiple possible addresses
        message_div.append('<p>Which of these looks like your address?</p>').removeClass("alert-error alert-success").addClass("alert alert-warning");
        $.each(results, function() {
            var result = this;
            message_div.append($('<a href="#" onClick="event.preventDefault();">' + this.formatted_address + '</a><br />').click(function () {
                districts_for_geocoder_result(result);
            }));
        })
    } 
    else if ( results.length == 0 ) {
        message_div.append('<p>No match for that address.</p>').removeClass("alert-warning").addClass("alert alert-error");
    }
    else {
        districts_for_geocoder_result( results[0] )
    }
}

// Try to automatically find the user
if (navigator.geolocation) {
    var geocoder = new google.maps.Geocoder();
    $('#geolocate-span').show();
    $('#geolocate-link').click(function (e) {
        e.preventDefault();
        navigator.geolocation.getCurrentPosition(function(position) {
            var geolocateLatLng = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
            geocoder.geocode({'latLng': geolocateLatLng},
                function(results, status) {
                    show_options( results );
                });
        });
    });
}

// With a lat/lng we can request information from Represent
function districts_for_geocoder_result(result) {
    // 'result' is a Google geocoder response object
    // latitude lives in result.geometry.location.lat()
    message_div.children().remove();
    message_div.append('<p>' + result.formatted_address + '</p>');
    var lat = result.geometry.location.lat();
    var lng = result.geometry.location.lng();
    var url = 'http://represent.opennorth.ca/boundaries/?callback=?&contains=' + lat + ',' + lng;
    $.getJSON(url, function (data) {
        data = data.objects;
        if ( data.length == 0 ) {
            message_div.append('<p>No ridings found. Is that address in Canada?</p>').removeClass("alert-success").addClass("alert-error");
        }
        $.each(data, function (index) {
            if ( this.boundary_set_name == 'British Columbia electoral district' ) {
                var link = this.name.toLowerCase().replace(' ', '-', "gi");
                message_div.append('<p>Your riding is <a href="/riding/' + link + '">' + this.name + ', visit the riding profile</a>.</p>').removeClass("alert-warning").addClass("alert alert-success");
                map.setView([lat, lng], 14);
            }
        });
    }
    );
}
