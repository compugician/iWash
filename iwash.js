var http = require('http');

var GPIO = require('onoff').Gpio;

var PURELL_DEBOUNCE = 1300; //in milliseconds
var last_purell = 0;

var PEOPLE_DEBOUNCE = 3900; //in milliseconds
var last_people = 0;

var purell = new GPIO(21, 'in', 'rising');
var presenceOut = new GPIO(26, 'out');
presenceOut.writeSync(1);

var lastMotionState = true; //true if the circuit is cimplete (no motion), false if interrupted.

var people=0;
var washes=0;

var presenceIn = new GPIO(20, 'in', 'both'); //note: 'falling' behaves like 'both' for some reason. Also: 'both' required in order for new logic to work (we de-bounce by keeping state)

/**
 * return true if the motion circuit is complete (i.e. sensor is untriggered)
 */
function checkMotionCircuit() {
	//at the beginning presenceOut is 1, always
	if (presenceIn.readSync()!=1) { return false; }
	
	for (var i=0; i<10; i++) {
		presenceOut.writeSync(i%2)
		if (presenceIn.readSync() != i%2) {
			return false;
		}
	}
	//ensure presenceOut is 1, regardless of what we did before
	presenceOut.writeSync(1);
	return true; // circuit is complete, motion is untriggered
}

purell.watch(function(err,state) {
  if (Date.now()-last_purell>PURELL_DEBOUNCE) {
  	washes+=1;
	last_purell=Date.now();
	printState();
  } else {
	console.log("Washes bounce avoided");
  }
});

presenceIn.watch(function(err,state) {

  var motionState = checkMotionCircuit();
  if (false==motionState && true==lastMotionState) {
	//first time we see the motion circuit interrupted, count it!
	people+=1;
	printState();
  }

  lastMotionState = motionState;

/*
  if (Date.now()-last_people>PEOPLE_DEBOUNCE) {
	people+=1;
	last_people=Date.now();
	printState();
  } else {
	console.log("People bounce avoided");
  }
*/
});

console.log("Ready!");

function printState() {
  console.log("Washes: "+washes+" People: "+people);
}

printState();

http.createServer(function (req, res) {
  res.setHeader('Content-Type', 'text/html');
  res.end('<html><head><meta http-equiv="refresh" content="1"></head><body><h1>Hand-washes: '+washes+' People: '+people+'</h1></body></html>');
}).listen(8080);
