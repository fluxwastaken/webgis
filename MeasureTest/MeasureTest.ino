//Include Libraries
#include <SoftwareSerial.h>
#include <HCSR04.h>         //for the Ultrasonic Sensor


UltraSonicDistanceSensor Sensor(13,12,400);   //locating the sensor pin
int _timeout;
String _buffer;
SoftwareSerial sim(10, 11);


int counter = 0;
void setup() {
  //setup() runs once on startup

  Serial.begin(9600); //starting up the entire system including the sensor
  _buffer.reserve(50);
  Serial.println("System Started...");
  sim.begin(9600);
  
  //preliminary startup procedure for debug testing of GSM module
}

String _readSerial() {
  _timeout = 0;
  while  (!sim.available() && _timeout < 12000  )
  {
    delay(13);
    _timeout++;
  }
  if (sim.available()) {
    return sim.readString();
  }
}
void ShowSerialData()
{
  while(sim.available()!=0)
  Serial.write(sim.read());
  delay(5000); 
}

void loop()
{
  //loop() contains the operations done by the device on uptime
  
  //declaration of the current area being handled by the device
  String area = "Sample Area";

  
  float dist = Sensor.measureDistanceCm(); //distance acquisition
  //float floodlvl = 10.16-dist; //measuring distance of water level from ground level
  //float distIn = floodlvl/2.54; //converting centimeters to inches
  
  

 
  Serial.println(dist);


  delay(10000); //the interval of data reading is delayed every 10 seconds
  

}
