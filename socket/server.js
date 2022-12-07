var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
var C = xbee_api.constants;
const MIN_WATER_LEVEL = 400;
const MAX_WATER_LEVEL = 600;
const LOW = "4";
const HIGH = "5";
const RGB = { R: LOW, G: LOW, B: LOW };
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
  let command = "D1"; // "NI"

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

});

// All frames parsed by the XBee will be emitted here

// storage.listSensors().then((sensors) => sensors.forEach((sensor) => console.log(sensor.data())))

function waterLevel(level) {

  if (level < MIN_WATER_LEVEL) {
    console.log("LOW LEVEL");

    frame_obj = { // AT Request to be sent
      type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
      destination64: "0013A20041C34AB8",
      command: "D0", // PIN that activates or deactivates the relay
      commandParameter: [LOW],
    };
    xbeeAPI.builder.write(frame_obj);
  }

  if (level > MAX_WATER_LEVEL) {
    console.log("HIGH LEVEL");

    frame_obj = { // AT Request to be sent
      type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
      destination64: "0013A20041C34AB8",
      command: "D0", // PIN that activates or deactivates the relay
      commandParameter: [HIGH],
    };
    xbeeAPI.builder.write(frame_obj);
  }
}

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
    
    console.log("ZIGBEE_IO_DATA_SAMPLE_RX");
    console.log(frame);
    console.log({ RGB });
    // console.log(frame.analogSamples.AD0);
    // waterLevel(frame.analogSamples.AD0);

    let command = "D0";
    let ilux = frame.analogSamples.AD1;
    let invertLux = (I) => I == HIGH ? LOW : HIGH;
    if(ilux < 50){
      RGB.R = HIGH;
      RGB.G = LOW;
      RGB.B = HIGH;
    }
    if (ilux > 50) {
      RGB.R = LOW;
      RGB.G = HIGH;
      RGB.B = HIGH;
      //RGB.R = invertLux(RGB.R);
    }
    if(ilux > 150){
      RGB.G = HIGH;
      RGB.B = LOW;
      //RGB.G = invertLux(RGB.G);
    }
    if(ilux > 250){
      RGB.R = HIGH;
      RGB.G = HIGH;
      RGB.B = LOW;
      //RGB.B = invertLux(RGB.B);
    }

    //RGB.R = RGB.R == LOW ? HIGH : LOW;
    //RGB.G = RGB.G == LOW ? HIGH : LOW;
    //RGB.B = RGB.B == LOW ? HIGH : LOW;

    let frame_obj = { // AT Request to be sent
      type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
      destination64: "0013A20041C34AB8",
      command: command,
      commandParameter: [RGB.R],
    };
    xbeeAPI.builder.write(frame_obj);

    frame_obj.command = "D1";
    frame_obj.commandParameter = [RGB.G];
    xbeeAPI.builder.write(frame_obj);

    frame_obj.command = "D2";
    frame_obj.commandParameter = [RGB.B];
    xbeeAPI.builder.write(frame_obj);
    /**/

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
