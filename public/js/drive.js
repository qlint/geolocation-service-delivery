/**
#Author:    CronJ IT Technologies Private Limited
#Website:   www.cronj.com
#Title:     Uber-X
**/

var socket = io();  //create socket connection
var isDriver = true;
var faker = false;  //Initially setting the faker profile as false, if switched to true then it will switch to faker profile and driver icon aminate on Click event
var inited = false;

//Allows to locate user using Geolocation API firing a locationfound event with location data on success or a locationerror event on failure
map.locate({
    maxZoom: 15,
    watch: true, //starts continuous watching of location changes of driver

});

//Events
map.on('locationfound', success);
map.on('click', onMapClick)
map.on('zoomend', _changeLocateMaxZoom);

//Detects when map finishes zooming
function _changeLocateMaxZoom(e) {
    if (map._locateOptions) {
        map._locateOptions.maxZoom = map.getZoom();
    }
}

//button to switch from driver to faker mode
L.easyButton('fa fa-toggle-on', function(btn, map) {
    faker = true;
    map.stopLocate();
}).addTo(map);

//button to switch back faker to driver mode
L.easyButton('fa fa-toggle-off', function(btn, map) {
    faker = false;
    map.locate();
}).addTo(map);

//initialise driver first location 
function init(position) {
    latLong = getLatLong(position);
    map.setView(latLong, 15);
    mymarker = L.Marker.movingMarker([
        latLong,
        latLong
    ], 0, {
        autostart: true,
        zoom: 15,
        icon: carIcon
    }).addTo(map);

    socket.emit('init', {
        isDriver: isDriver,
        latLong: latLong
    });
    inited = true;
}

//function for onclick event
function onMapClick(e) {
    if (faker == true) {

        var loc = mymarker.getLatLng();
        var latLong = e.latlng;
        var angle = setangle(loc.lat, loc.lng, latLong.lat, latLong.lng)
        mymarker.setIconAngle(angle);
        mymarker.moveTo([e.latlng.lat, e.latlng.lng], 3000)
        socket.emit('locChanged', {
            latLong: [e.latlng.lat, e.latlng.lng]
        });
    }
}

//function listens for location change
function success(position) {
    if (!inited)
        init(position)
    else {
        var loc = mymarker.getLatLng();
        var latLong = getLatLong(position)
        var angle = setangle(loc.lat, loc.lng, latLong[0], latLong[1])
        mymarker.setIconAngle(angle);
        mymarker.moveTo(latLong, 5000)
           socket.emit('locChanged', {
            latLong: latLong
        });
    }
}

//event listener for driver-path,shows navigation path to driver to reach customer's location
socket.on('drivepath', function(id) {
    //drawing path from drivers location to customer location and showing it to the driver
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

//set angle of the car marker for animation on the map
function setangle(slat, slong, dlat, dlong) {

    var dLon = (dlong - slong);
    var y = Math.sin(dLon) * Math.cos(dlat);
    var x = Math.cos(slat) * Math.sin(dlat) - Math.sin(slat) * Math.cos(dlat) * Math.cos(dLon);
    angle1 = Math.atan2(y, x);
    angle1 = (180 * angle1) / 3.1454;
    angle1 = (angle1 + 360) % 360;
    return angle1;
}

//if user is not located using geolocation api,function throws respective error
function error(err) {
    console.log('ERROR ' + err.message);
}

//function to return latlong 
function getLatLong(position) {
    return ([position.latitude, position.longitude])
}