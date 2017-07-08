/**
 * @fileoverview DS18X20 Helper. 
 * Module automatically polls ds18x20 sensor on an interval and emits an event
 * @author felixgalindo91@gmail.com (Felix Galindo)
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');

//ds18x20Helper class
function ds18x20Helper(config) {
	console.log("Initializing ds18x20Helper with options:", config);
	var ds18x20Helper = this;
	ds18x20Helper.config = config;
	ds18x20Helper.data = {};
	ds18x20Helper.ds18x20 = Promise.promisifyAll(require('ds18x20'));
	ds18x20Helper.isDriverLoaded = false;
	ds18x20Helper.init = false;

	//Load driver if not loaded and retrieve list of temp sensor ids
	ds18x20Helper.ds18x20.isDriverLoaded(function(err, isLoaded) {
		ds18x20Helper.isDriverLoaded = isLoaded;
		if (!isLoaded) {
			ds18x20Helper.ds18x20.loadDriver(function(err) {
				if (err) console.log('something went wrong loading the driver:', err);
				else {
					console.log('ds18x20 driver is loaded');
					ds18x20Helper.isDriverLoaded = true;

					ds18x20Helper.ds18x20.list(function(err, listOfDeviceIds) {
						if (err) {
							console.log(err);
						}
						ds18x20Helper.listOfDeviceIds = listOfDeviceIds;
						ds18x20Helper.init = true;
						ds18x20Helper.start();
					});
				}

			});
		} else {
			console.log('ds18x20 driver is loaded');
			ds18x20Helper.isDriverLoaded = true;

			ds18x20Helper.ds18x20.list(function(err, listOfDeviceIds) {
				console.log("device list", listOfDeviceIds);
				if (err) {
					console.log(err);
				}
				ds18x20Helper.listOfDeviceIds = listOfDeviceIds;
				ds18x20Helper.init = true;
				ds18x20Helper.start();
			});
		}
	});
}

util.inherits(ds18x20Helper, EventEmitter);

//Starts the ds18x20Helper module
ds18x20Helper.prototype.start = function() {
	var ds18x20Helper = this;
	var data = this.data;
	if (ds18x20Helper.config.autoSampling === true) {
		ds18x20Helper.startProcess();
	}
};

//Stops the ds18x20Helper module
ds18x20Helper.prototype.stop = function() {};

//Returns sensor data object if available
//Otherwise returns false if data is unvailbale
ds18x20Helper.prototype.getSensorData = function() {
	var ds18x20Helper = this;
	if (ds18x20Helper.data != undefined) {
		return ds18x20Helper.data;
	} else {
		return false;
	}
};

//Process that reads ds18x20 temp on an intreval
ds18x20Helper.prototype.startProcess = function() {
	console.log('ds18x20 starting process...');
	var ds18x20Helper = this;
	setInterval(function() {
		if (ds18x20Helper.listOfDeviceIds) {
			ds18x20Helper.readTemp(ds18x20Helper.config.ds18x20Id)
				.then(function(tempF) {
					ds18x20Helper.data.tempF = tempF;
					console.log("Temp is ", tempF, "°F");
				})
				.catch(function(err) {
					console.log(err);
				});
		}
		ds18x20Helper.emit("data", ds18x20Helper.data);
	}, ds18x20Helper.config.sampleRate);
}


//Returns temp reading in Fahrenheit from deviceId specifed
ds18x20Helper.prototype.readTemp = function(deviceId) {
	var ds18x20Helper = this;

	if (ds18x20Helper.listOfDeviceIds.indexOf(deviceId) < -1) {
		console.log("Device", deviceId, "not found");
	}
	if (ds18x20Helper.init && ds18x20Helper.isDriverLoaded) {
		return ds18x20Helper.ds18x20.getAsync(deviceId)
			.then(function(tempC) {
				tempF = Number((tempC * 1.8 + 32).toFixed(2));
				return tempF;
			})
			.catch(function(err) {
				console.log(err);
			});
	} else {
		console.log("ds18x20Helper not ready!");
	}
};
module.exports = ds18x20Helper;