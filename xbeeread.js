//setup socket io server
var express = require('express');
var app = express();
var io = require('socket.io').listen(app.listen(8082), { log: false });

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
var dishwasherChangeCount = 0;

var plantNeedsWater = false;

//wait for connection
io.sockets.on('connection', function (socket) {

	console.log('socket connected');

	//send current state
	socket.emit('dishwasher', dishwasherDone);
	socket.emit('plantNeedsWater', plantNeedsWater);

});

//handle xbee data
xbeeAPI.on("frame_object", function(frame) {

	//handle input for Dishwasher. 
	if (frame.remote16 == '0001') {
		var done = (frame.data[4] === 0) ? true : false;

		if (done != dishwasherDone) {
			dishwasherChangeCount++;
			if (dishwasherChangeCount >= 5) {
				dishwasherDone = done;
			
				console.log(Date.now() + ' - Dishwasher done: ' + dishwasherDone);

				//broadcast new state to socket clients
				io.sockets.emit('dishwasher', dishwasherDone);
			}
		} else {
			dishwasherChangeCount = 0;
		}

	//handle plant info
	} else if(frame.remote16 == '0002') {
		console.log(frame);
		var moistValue = frame.data[4];
		if (moistValue >= 144) {
			if (plantNeedsWater != false) {
				plantNeedsWater = false;
				io.sockets.emit('plantNeedsWater', plantNeedsWater);
				console.log(Date.now() + ' - Plant needs water: ' + plantNeedsWater);
			}
		}
		if (moistValue <= 128) {
			if (plantNeedsWater != true) {
				plantNeedsWater = true;
				io.sockets.emit('plantNeedsWater', plantNeedsWater);
				console.log(Date.now() + ' - Plant needs water: ' + plantNeedsWater);
			}
		}
		console.log('Plant moistValue: '+moistValue)

	//handle any other devices by echoing the data.
	} else {
		console.log(frame);
	}

});
