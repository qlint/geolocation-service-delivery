/**
#Author: 	CronJ IT Technologies Private Limited
#Website: 	www.cronj.com
#Title: 	Uber-X
**/
var isDriver = false;
var markers = {};
var inited = false;
var socket = io();
var isservice = false;
var send = {};
var key, eta, bookid;
//Allows to locate user using Geolocation API firing a locationfound event with location data on success or a locationerror event on failure
map.locate({
	maxZoom: 15,
	watch: true,		//starts continuous watching of location changes of customer
	enableHighAccuracy: true
});

map.on('locationfound', success);
map.on('zoomend', _changeLocateMaxZoom);

//detects when map finishes zooming
function _changeLocateMaxZoom(e) {
	if (map._locateOptions) {
		map._locateOptions.maxZoom = map.getZoom();
	}
}

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
		icon: clientIcon
	}).addTo(map);

	socket.emit('init', {
		isDriver: isDriver,
		latLong: latLong
	});

	socket.emit('initservice', {
		isservice: isservice,
		latLong: latLong
	});
	inited = true;
}

//function executes for location found event
function success(pos) {
	if (!inited)
		init(pos)
	else
		mymarker.moveTo(getLatLong(pos), 5000)
}

function getLatLong(position) {
	return ([position.latitude, position.longitude])
}

//Event listener to initialise driver first location and push it to markers object
socket.on('initDriverLoc', function(drivers) {
//iterate through all drivers
	_.each(drivers, function(driver) {

		markers[driver.id] = L.Marker.movingMarker([
			driver.latLong,
			driver.latLong
		], [0], {
			icon: carIcon,
			autostart: true,
			zoom: 15
		}).addTo(map);	//Add all drivers to the customer's map
	});
});

socket.on('initservicerLoc', function(drivers) {

	_.each(drivers, function(driver) {

		markers[driver.id] = L.Marker.movingMarker([
			driver.latLong,
			driver.latLong
		], [0], {
				icon: serviceIcon,
			autostart: true,
			zoom: 15
		}).addTo(map);
	});
});

//Event listener fired when any new driver comes online, it is pushed into markers object and added to the customer's map
socket.on('driverAdded', function(driver) {
	console.log("New driver joined.")
	markers[driver.id] = L.Marker.movingMarker([
		driver.latLong,
		driver.latLong
	], [0], {
		icon: carIcon,
		autostart: true,
		zoom: 15
	}).addTo(map);
});

//Event listener fired when any new serviceman comes online, it is pushed into markers and added to the customer's map
socket.on('servicemanAdded', function(driver) {
	console.log("New driver joined.")
	markers[driver.id] = L.Marker.movingMarker([
		driver.latLong,
		driver.latLong
	], [0], {
		icon: serviceIcon,
		autostart: true,
		zoom: 15
	}).addTo(map);
});

//event is fired when any driver goes offline
socket.on('driverRemoved', function(driver) {
	console.log("driver left.")
	map.removeLayer(markers[driver.id])		//driver icon removed from customer's map

});

//event is fired when any serviceman goes offline
socket.on('serviceRemoved', function(serviceman) {
	console.log("driver left.")
	map.removeLayer(markers[serviceman.id])		////serviceman icon removed from customer's map

});

//event is fired when location of driver changes,if changed then animate the change on the customer's map with proper direction and angle
socket.on('driverLocChanged', function(data) {
	var loc = markers[data.id].getLatLng();
	var angle = setangle(loc.lat, loc.lng, data.latLong[0], data.latLong[1])
	markers[data.id].setIconAngle(angle)
	markers[data.id].moveTo(data.latLong, 5000)
});

//event is fired when location of serviceman changes,if changed then animate the change on the customer's map with proper direction 
socket.on('serviceLocChanged', function(data) {
	var loc = markers[data.id].getLatLng();
	var angle = setangle(loc.lat, loc.lng, data.latLong[0], data.latLong[1])
	markers[data.id].moveTo(data.latLong, 5000)
});

function nearby(data) {
	send[0] = mymarker.getLatLng();
	send[1] = data;
	console.log('send[0]=' + send[0] + 'send[1]=' + send[1])
	socket.emit('book', send);
}

socket.on('bookid', function(id) {
	//To check booking of same cab again
	if (bookid == id[0])
		confirm("You cannot book same service again");
	else {

		if (id[0] == 0)
			confirm("Not available")
		else {
			var time = L.Routing.control({
				waypoints: [
					L.latLng(mymarker.getLatLng()),
					L.latLng(markers[id[0]].getLatLng())
				]
			});
			if (id[1] == 0)
				confirm('Your Ride has been booked');
			if (id[1] == 1)
				confirm('Your Service has been booked');

			for (key in markers) {
				if (markers[id[0]].getLatLng() != markers[key].getLatLng())
					map.removeLayer(markers[key]);
			}
			setTimeout(function() {
				console.log('time is',time);
				eta = Math.round(time._routes[0].summary.totalTime / 60);
				if (eta == 0)	//if time rounds off to 0 minutes
					eta++;
				markers[id[0]].bindPopup(eta + ' Minutes away ').openPopup();
			}, 2000);
		}
		bookid = id[0];
	}
});

//if user is not located using geolocation api,throws respective error message
function error(err) {
	console.log('ERROR ' + err.message);
}

//set angle of the car marker for animation on the map
function setangle(slat, slong, dlat, dlong) {

	var y = Math.sin((dlong - slong)) * Math.cos((dlat));
	var x = (Math.cos((slat)) * Math.sin((dlat))) - (Math.sin((slat)) * Math.cos((dlat)) * Math.cos((dlong - slong)));
	angle1 = Math.atan2(y, x);
	angle1 = 180 * angle1 / Math.PI;
	return angle1;
}

//function to return latlong 
function getLatLong(position) {
	return ([position.latitude, position.longitude])
}

