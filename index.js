/**
#Author: 	CronJ IT Technologies Private Limited
#Website: 	www.cronj.com
#Title: 	Uber-X
**/


var express = require('express');
var app = express();
var server = require('http').Server(app)
var io = require('socket.io')(server);
var drivers = {};
var service = {};
var bookid;
app.use(express.static(__dirname + '/public'));

app.get('/customer', function(req, res) {
	res.sendFile(__dirname + '/views/customer.html');
});

app.get('/faker', function(req, res) {
	res.sendFile(__dirname + '/views/faker.html');
});

app.get('/driver', function(req, res) {
	res.sendFile(__dirname + '/views/drive.html');
});

app.get('/serviceman', function(req, res) {
	res.sendFile(__dirname + '/views/serviceman.html');
});

//io.on listens for connections initially when socket is created between server and client(customer/driver)
io.on('connection', function(socket) {

	socket.on('init', function(data) { //Init is one of our custom events which is fired when any of the driver comes online.
		if (data.isDriver) {
			drivers[socket.id] = {
				id: socket.id,
				latLong: data.latLong

			};
			socket.isDriver = data.isDriver;
			console.log("Driver Added at " + socket.id);
			socket.broadcast.to('customers').emit('driverAdded', drivers[socket.id]);
		} else {
			socket.join('customers');
			socket.emit('initDriverLoc', drivers);

		}
	});

	socket.on('initservice', function(data) {
		if (data.isservice) {
			service[socket.id] = {
				id: socket.id,
				latLong: data.latLong

			};
			socket.isservice = data.isservice;
			console.log("Serviceman Added at " + socket.id);
			socket.broadcast.to('customers').emit('servicemanAdded', service[socket.id]);
		} else {
			socket.join('customers');
			socket.emit('initservicerLoc', service);

		}
	});

	//book event is used to handle both Service and Cab booking
	socket.on('book', function(mymarker) {
		var near = 0,
			length, nr = 0;
		var at, id, key;
		var lat1 = mymarker.lat;
		var long1 = mymarker.lng;
		var lat2, long2;
		var details = {};
		if (mymarker[1] == 0) {
			at = Object.keys(drivers);
			id = at[0];
			length = Object.keys(drivers).length;
			if (length == 0)
				id = 0;
			else if (length == 1) {
				id = at[0];
			} else {
				for (key in at) {
					console.log('id=' + at[key])
					lat2 = drivers[at[key]].latLong[0]
					long2 = drivers[at[key]].latLong[1]
					nr = distance(lat1, long1, lat2, long2);

					if (nr < near) {
						near = nr;
						id = key;
					}
				}
			}
		} else {
			at = Object.keys(service);
			id = at[0];
			length = Object.keys(service).length;
			if (length == 0)
				id = 0;
			else if (length == 1) {
				id = at[0];
			} else {
				for (key in at) {
					console.log('id=' + at[key])
					lat2 = service[at[key]].latLong[0]
					long2 = service[at[key]].latLong[1]
					nr = distance(lat1, long1, lat2, long2);

					if (nr < near) {
						near = nr;
						id = key;
					}
				}
			}
		}
		details[0] = id; // id of booked car/service
		details[1] = mymarker[1]; //type 0 for cab or 1 for service
		socket.emit('bookid', details);
		if (bookid != id) { //To check if same service/cab booked twice
			if (details[1] == 0)
				socket.to(id).emit('drivepath', mymarker[0]);
			else
				socket.to(id).emit('servicepath', mymarker[0]);
		}
		bookid = id;
	});


	//locChanged is an event which is fired when the location of any driver changes
	socket.on('locChanged', function(data) {
		drivers[socket.id] = {
			id: socket.id,
			latLong: data.latLong
		}


		socket.broadcast.emit('driverLocChanged', {
			id: socket.id,
			latLong: data.latLong
		})
	});

	//servicelocChanged is similar to previous “locChanged”and perform similar update operation of service list
	socket.on('servicelocChanged', function(data) {
		service[socket.id] = {
			id: socket.id,
			latLong: data.latLong
		}

		socket.broadcast.emit('serviceLocChanged', {
			id: socket.id,
			latLong: data.latLong
		})
	});

	//disconnect listens to the event if any driver/serviceman/customer goes offline, updates the corresponding list and broadcast's it
	socket.on('disconnect', function() {
		if (socket.isDriver) {
			console.log("Driver disconnected at " + socket.id);
			socket.broadcast.to('customers').emit('driverRemoved', drivers[socket.id]);
			delete drivers[socket.id];
		}
		if (socket.isservice) {
			console.log("Serviceman disconnected at " + socket.id);
			socket.broadcast.to('customers').emit('serviceRemoved', service[socket.id]);
			delete service[socket.id];
		}
		if (!socket.isDriver && !socket.isservice) {
			console.log('Customer Disconnected at' + socket.id);
		}
	});
});

//distance” function finds out the nearest cab/serviceman from customer
function distance(lat1, lon1, lat2, lon2) {
	var p = 0.017453292519943295;
	var c = Math.cos;
	var a = 0.5 - c((lat2 - lat1) * p) / 2 +
		c(lat1 * p) * c(lat2 * p) *
		(1 - c((lon2 - lon1) * p)) / 2;

	return 12742 * Math.asin(Math.sqrt(a));
}

server.listen(8085, function() {
	console.log('Server started at ' + (new Date().toLocaleString().substr(10, 12)));
});