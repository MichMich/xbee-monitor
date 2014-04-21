//setup socket io server
var express = require('express');
var app = express();
var io = require('socket.io').listen(app.listen(8080), { log: false });

//set up xbee system
var xbee = require('xbee-api');
var xbeeAPI = new xbee.XBeeAPI({
	api_mode: 1
});

//open serial port
var SerialPort = require('serialport').SerialPort;
var serialport = new SerialPort("/dev/ttyUSB0", {
	baudrate: 9600,
	parser: xbeeAPI.rawParser()
});


//create helper vars
var dishwasherDone = false;


//wait for connection
io.sockets.on('connection', function (socket) {

	console.log('socket connected');

	//send current state
	socket.emit('dishwasher', dishwasherDone);

});

//handle xbee data
xbeeAPI.on("frame_object", function(frame) {

	//handle input for Dishwasher. 
	if (frame.remote16 == '0001') {
		var done = (frame.data[4] === 0) ? true : false;

		if (done != dishwasherDone) {
			dishwasherDone = done;
			var now = new Date;
			console.log(now + ' - Dishwasher done: ' + dishwasherDone);

			//broadcast new state to socket clients
			io.sockets.emit('dishwasher', dishwasherDone);
		}
	}

});
