/**
#Author:    CronJ IT Technologies Private Limited
#Website:   www.cronj.com
#Title:     Uber-X
**/

var socket = io();
var isservice = true;
var faker = false;
var inited = false;
//Allows to locate user using Geolocation API firing a locationfound event with location data on success or a locationerror event on failure
map.locate({
    maxZoom: 15,
    watch: true, //starts continuous watching of location changes of driver

});

//Event listeners
map.on('locationfound', success);
map.on('zoomend', _changeLocateMaxZoom);

//Detects when map finishes zooming
function _changeLocateMaxZoom(e) {
    if (map._locateOptions) {
        map._locateOptions.maxZoom = map.getZoom();
    }
}

//initialise serviceman first location 
function init(position) {
    latLong = getLatLong(position);
    map.setView(latLong, 15);
    mymarker = L.Marker.movingMarker([
        latLong,
        latLong
    ], 0, {
        autostart: true,
        zoom: 15,
        icon: serviceIcon
    }).addTo(map);

    socket.emit('initservice', {
        isservice: isservice,
        latLong: latLong
    });
    inited = true;
}

//function listens for location change
function success(position) {
    if (!inited)
        init(position)
    else {
        var loc = mymarker.getLatLng();
        var latLong = getLatLong(position)
        mymarker.moveTo(latLong, 5000)
        socket.emit('servicelocChanged', {
            latLong: latLong
        });
    }
}

//event listener for driver-path,shows navigation path to driver to reach customer's location
socket.on('servicepath', function(id) {
    L.Routing.control({
        waypoints: [
            L.latLng(mymarker.getLatLng()),
            L.latLng(id.lat, id.lng)
        ],
        createMarker: function() {
            return null;
        }
    }).addTo(map);
});

//If user is not located using geolocation api,function throws respective error
function error(err) {
    console.log('ERROR ' + err.message);
}

//function to return latlong 
function getLatLong(position) {
    return ([position.latitude, position.longitude])
}