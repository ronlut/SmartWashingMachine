load('api_config.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_timer.js');
load("api_pwm.js");


let led = Cfg.get('pins.led');
let button = Cfg.get('pins.button');
let baseTopic = 'washingMachine/';

print('LED GPIO:', led, 'button GPIO:', button);
GPIO.set_mode(led, GPIO.MODE_OUTPUT);
GPIO.write(led, 1);

let useServo = true;
let servoSubTopic = "servo";
let servoGpio = 0; //D3
let servoStart = 0.055;
let servoEnd = 0.095;
let servoPushDuration = 3000;
let servoState = 0;

function moveServo(conn, topic, msg)
{
  let s = JSON.parse(msg);
	if(s !== 1 || servoState === 1) return;
	servoState = 1;
  GPIO.write(led, 0);
	print('moving servo');
	GPIO.set_mode(servoGpio, GPIO.MODE_OUTPUT);
	//move to position 0
	PWM.set(servoGpio, 50, servoEnd);
	//wait for servo
	Timer.set(servoPushDuration, false , function() {
			PWM.set(servoGpio, 50, servoStart);
			//wait for servo
			Timer.set(1000, false , function() {
				//turn off
				PWM.set(servoGpio, 50, 0);
				GPIO.set_mode(servoGpio, GPIO.MODE_INPUT);
				GPIO.write(led, 1);
				print('servo off');
				servoState = 0;
				MQTT.pub(baseTopic + servoSubTopic, JSON.stringify(0), 1);
			}, null);
	}, null);
}

let subbed = false;
MQTT.setEventHandler(function(conn, ev, edata) 
	{
		if(ev === MQTT.EV_CONNACK)	//connection to MQTT established
		{
				if(subbed) //check if already subbed
				{
					return;	
				}
				print('Connected first time -> subbing');
				if(useServo)
					MQTT.sub(baseTopic + servoSubTopic, moveServo);	//sub to servo topic
				subbed = true;
		}
	}, null);

print('Waiting for mqtt to connect...');
