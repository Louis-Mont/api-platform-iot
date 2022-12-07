var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
var C = xbee_api.constants;
const MIN_WATER_LEVEL = 400;
const MAX_WATER_LEVEL = 600;
const LOW = "4";
const HIGH = "5";
// var storage = require("./storage")
require('dotenv').config()

const SERIAL_PORT = process.env.SERIAL_PORT;

var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 2,
});

let serialport = new SerialPort(SERIAL_PORT, {
  baudRate: 9600,
}, function (err) {
  if (err) {
    return console.log('Error: ', err.message)
  }
});

serialport.pipe(xbeeAPI.parser);
xbeeAPI.builder.pipe(serialport);

serialport.on("open", function () {
  let command = "D0"; // "NI"

  var frame_obj = { // AT Request to be sent
    type: C.FRAME_TYPE.AT_COMMAND,
    command: command,
    commandParameter: [],
  };
  xbeeAPI.builder.write(frame_obj);

  frame_obj = { // AT Request to be sent
    type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
    destination64: "0013A20041C34B12",
    command: command,
    commandParameter: [],
  };
  xbeeAPI.builder.write(frame_obj);

  /*
  frame_obj = {
    type: C.FRAME_TYPE.AT_COMMAND,
    command: "D0",
    commandParameter: [],
  }
  xbeeAPI.builder.write(frame_obj);
/* */
});

// All frames parsed by the XBee will be emitted here

// storage.listSensors().then((sensors) => sensors.forEach((sensor) => console.log(sensor.data())))

xbeeAPI.parser.on("data", function (frame) {

  //on new device is joined, register it

  //on packet received, dispatch event
  //let dataReceived = String.fromCharCode.apply(null, frame.data);
  if (C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET === frame.type) {
    console.log("C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET");
    let dataReceived = String.fromCharCode.apply(null, frame.data);
    console.log(">> ZIGBEE_RECEIVE_PACKET >", dataReceived); // datareceived

  }

  if (C.FRAME_TYPE.NODE_IDENTIFICATION === frame.type) {
    // let dataReceived = String.fromCharCode.apply(null, frame.nodeIdentifier);
    console.log("NODE_IDENTIFICATION");
    // storage.registerSensor(frame.remote64)

  } else if (C.FRAME_TYPE.ZIGBEE_IO_DATA_SAMPLE_RX === frame.type) {

    console.log("ZIGBEE_IO_DATA_SAMPLE_RX")
    // console.log(frame);
    console.log(frame.analogSamples.AD0);
    let water_level = frame.analogSamples.AD0;
    
    if (water_level < MIN_WATER_LEVEL) {
      console.log("LOW LEVEL");

      frame_obj = { // AT Request to be sent
        type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
        destination64: "0013A20041C34AB8",
        command: "D0", // PIN that activates or deactivate the "relais"
        commandParameter: [LOW],
      };
      xbeeAPI.builder.write(frame_obj);
    }

    if (water_level > MAX_WATER_LEVEL) {
      console.log("HIGH LEVEL");

      frame_obj = { // AT Request to be sent
        type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
        destination64: "0013A20041C34AB8",
        command: "D0", // PIN that activates or deactivate the "relais"
        commandParameter: [HIGH],
      };
      xbeeAPI.builder.write(frame_obj);
    }
    // storage.registerSample(frame.remote64,frame.analogSamples.AD0 )

  } else if (C.FRAME_TYPE.REMOTE_COMMAND_RESPONSE === frame.type) {
    console.log("REMOTE_COMMAND_RESPONSE")
  } else {
    console.debug(C.FRAME_TYPE[frame.type]);
    console.debug(frame);
    let dataReceived = String.fromCharCode.apply(null, frame.commandData)
    console.log(dataReceived);
  }

});
