//Include Libraries
#include <SoftwareSerial.h>
#include <HCSR04.h>         //for the Ultrasonic Sensor


UltraSonicDistanceSensor Sensor(13,12,400);   //locating the sensor pin
int _timeout;
String _buffer;
SoftwareSerial sim(10, 11);


int counter = 0;

const String APN  = "internet";
const String USER = "";
const String PASS = "";

const String THING_SPEAK_API_URL  = "https://api.thingspeak.com/update";
const String THING_SPEAK_API_KEY  = "1GY3ELI7PBHDLJV2";
String request_url = "";

void setup() {
  Serial.begin(9600); //starting up the entire system including the sensor
  _buffer.reserve(50);
  Serial.println("System Started...");
  sim.begin(9600);
  
  //preliminary startup procedure for debug testing of GSM module
  // Test if SIM800L is working
  testSIM800L();
}

void resetDevice() {
  //Using the watchdog timer for clean resets
  WDTCSR |= (1 << WDE); // Enable watchdog timer
  WDTCSR |= (1 << WDCE); // Enable change protection
  WDTCSR |= (1 << WDE); // Disable change protection
  while (1); // Wait for reset
}

bool waitForResponse(String expected_answer, unsigned long timeout = 5000) {
  unsigned long startTime = millis();
  String response = "";
  
  while (millis() - startTime < timeout) {
    while (sim.available()) {
      char c = sim.read();
      response += c;
    }
    if (response.indexOf(expected_answer) != -1) {
      return true;
    }
  }
  
  Serial.println("Response: " + response);
  return false;
}

void sendDataToThingSpeak(float field1) {
  Serial.println("Sending data to ThingSpeak...");

  // Check communication with the SIM module
  sim.println("AT");
  if (!waitForResponse("OK")) {
    Serial.println("Failed to communicate with SIM800L.");
    resetDevice();
    return;
  }
  else{
    Serial.println("AT Success");
  }

  // Check SIM card status
  sim.println("AT+CPIN?");
  if (!waitForResponse("+CPIN: READY")) {
    Serial.println("SIM card not ready.");
    resetDevice();
    return;
  }
  else{
    Serial.println("CPIN Success");
  }

  // Check network registration status
  sim.println("AT+CREG?");
  if (!waitForResponse("+CREG: 0,1") && !waitForResponse("+CREG: 0,5")) {
    Serial.println("SIM800L not registered on the network.");
    resetDevice();
    return;
  }
  else{
    Serial.println("CREG Success");
  }

  // Check if GPRS is attached to the network
  sim.println("AT+CGATT?");
  if (!waitForResponse("OK")) {
    Serial.println("GPRS not attached.");
    resetDevice();
    return;
  }
  else{
    Serial.println("CGATT Success");
  }

  // Shut down any existing GPRS context
  sim.println("AT+CIPSHUT");
  if (!waitForResponse("SHUT OK")) {
    Serial.println("Failed to shut down GPRS context.");
    resetDevice();
    return;
  }

  // Set GPRS single connection mode
  sim.println("AT+CIPMUX=0");
  if (!waitForResponse("OK")) {
    Serial.println("Failed to set single connection mode.");
    resetDevice();
    return;
  }

  ShowSerialData(); // Optional debugging step

  // Set APN
  sim.println("AT+CSTT=\"internet\",\"\",\"\"");  // Set APN
  if (!waitForResponse("OK")) {
    Serial.println("Failed to set APN.");
    resetDevice();
    return;
  }
  else{
    Serial.println("CSTT Success");
  }

  ShowSerialData();

  // Check signal quality
  sim.println("AT+CSQ");
  if (!waitForResponse("OK")) {
    Serial.println("Failed to check signal quality.");
    resetDevice();
    return;
  }

  // Initialize GPRS context
  sim.println("AT+CIICR");
  if (!waitForResponse("OK")) {
    Serial.println("Failed to initialize GPRS.");
    resetDevice();
    return;
  }
  else{
    Serial.println("CIICR Success");
  }

  ShowSerialData();

  // Get IP address
  sim.println("AT+CIFSR");

  ShowSerialData();

  // Start TCP connection to ThingSpeak
  sim.println("AT+CIPSTART=\"TCP\",\"api.thingspeak.com\",\"80\"");

  ShowSerialData();
  // Send the HTTP GET request
  sim.println("AT+CIPSEND");
  if (waitForResponse("ERROR")) {
    Serial.println("Failed to send data");
    resetDevice();
    return;
  }

  // Construct the GET request
  String str = "GET https://api.thingspeak.com/update?api_key=1GY3ELI7PBHDLJV2&field4=" + String(field1);
  sim.println(str);

  delay(3000);  // Ensure the data is sent

  ShowSerialData();

  // Send the end of data character (Ctrl+Z)
  sim.println((char)26);
  ShowSerialData();
  delay(5000);  // Wait for server response

  sim.println();  // Ensure proper termination
  ShowSerialData();

  // Close the connection
  sim.println("AT+CIPSHUT");
  if (!waitForResponse("SHUT OK")) {
    Serial.println("Failed to close TCP connection.");
    resetDevice();
    return;
  }

  ShowSerialData();
}


void testSIM800L() {
  Serial.println("Testing SIM800L...");

  // Test communication with "AT"
  sim.println("AT");
  if (waitForResponse("OK")) {
    Serial.println("SIM800L is communicating.");
  } else {
    Serial.println("Failed to communicate with SIM800L.");
    resetDevice();
  }

  // Check if SIM is ready
  sim.println("AT+CPIN?");
  if (waitForResponse("+CPIN: READY")) {
    Serial.println("SIM card is ready.");
  } else {
    Serial.println("SIM card not detected or not ready.");
    resetDevice();
  }

  // Check network registration
  sim.println("AT+CREG?");
  if (waitForResponse("+CREG: 0,1") || waitForResponse("+CREG: 0,5")) {
    Serial.println("SIM800L is registered on the network.");
  } else {
    Serial.println("SIM800L is not registered on the network.");
    resetDevice();
  }

   //Turning ON full functionality
  sim.println("AT+CFUN=1");
   if (waitForResponse("OK")) {
    Serial.println("SIM800L has full functionality");
  } else {
    Serial.println("SIM800L does not have full functionality");
    resetDevice();
  }

  // Check signal quality
  sim.println("AT+CSQ");
  if (waitForResponse("OK")) {
    Serial.println("Signal quality command executed.");
    
  } else {
    Serial.println("Failed to check signal quality.");
    resetDevice();
  }
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

void ShowSerialData(){
  while(sim.available()!=0)
  Serial.write(sim.read());
  delay(5000); 
}


void loop(){
  
  //declaration of the current area being handled by the device
  String area = "Sample Area";

  
  float dist = Sensor.measureDistanceCm(); //distance acquisition
  //float floodlvl = 10.16-dist; //measuring distance of water level from ground level
  //float distIn = floodlvl/2.54; //converting centimeters to inches
  if(dist < 0){
    resetDevice();
  }
  Serial.println(dist);
  sendDataToThingSpeak(dist);


  delay(600000); //the interval of data reading is delayed every 10 minutes
  

}
