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


void connectToGPRS() {

  // Send the basic AT command to check communication with the SIM module
  sim.println("AT");
  delay(1000); // Wait for 1 second to receive a response

  // Check if the SIM card is inserted and ready by querying the PIN status
  sim.println("AT+CPIN?");
  delay(1000); // Wait for 1 second

  // Check the network registration status
  sim.println("AT+CREG?");
  delay(1000); // Wait for 1 second

  // Check if GPRS is attached to the network
  sim.println("AT+CGATT?");
  delay(1000); // Wait for 1 second

  // Shut down any existing GPRS context
  sim.println("AT+CIPSHUT");
  delay(1000); // Wait for 1 second

  // Check the current GPRS connection status
  sim.println("AT+CIPSTATUS");
  delay(2000); // Wait for 2 seconds

  // Set the GPRS connection mode to single connection (0)
  sim.println("AT+CIPMUX=0");
  delay(2000); // Wait for 2 seconds

  // Function to display data received from the SIM module
  ShowSerialData();

  // Set the APN (Access Point Name) for the GPRS connection
  // "internet" isthe APN of Smart; the username and password fields are left empty
  sim.println("AT+CSTT=\"internet\",\"\",\"\"");
  delay(2000); // Wait for 2 seconds

  // Display the response from setting the APN
  ShowSerialData();

  // Check the signal quality to ensure a good connection
  sim.println("AT+CSQ");
  delay(3000); // Wait for 3 seconds

  // Bring up the wireless connection by initializing the GPRS context
  sim.println("AT+CIICR");
  delay(3000); // Wait for 3 seconds

  // Display the response from initializing the GPRS context
  ShowSerialData();

  // Get the IP address assigned to the module
  sim.println("AT+CIFSR");
  delay(2000); // Wait for 2 seconds

  // Display the obtained IP address
  ShowSerialData();

  // Disable the automatic printing of GPRS status information
  sim.println("AT+CIPSPRT=0");

  // Start a TCP connection to the ThingSpeak API server on port 80 (HTTP)
  sim.println("AT+CIPSTART=\"TCP\",\"api.thingspeak.com\",\"80\""); // Start the connection
  delay(6000); // Wait for 6 seconds to establish the connection

  // Display the response from attempting to start the TCP connection
  ShowSerialData();

  // Indicate that you want to send data over the established TCP connection
  sim.println("AT+CIPSEND"); // Begin sending data to the remote server
  delay(4000); // Wait for 4 seconds

  // Display the prompt indicating readiness to send data
  ShowSerialData();

  // Prepare the HTTP GET request string to update a field in ThingSpeak
  String str = "GET https://api.thingspeak.com/update?api_key=1GY3ELI7PBHDLJV2&field1=5000";
  Serial.println(str); // Print the request to the serial monitor for debugging
  sim.println(str);    // Send the HTTP GET request to the ThingSpeak server

  delay(4000); // Wait for 4 seconds to ensure the data is sent

  // Display the response from the server after sending the HTTP request
  ShowSerialData();

  // Send a Ctrl+Z character to indicate the end of the HTTP request data
  sim.println((char)26); // ASCII code 26 represents Ctrl+Z, which signals the end of data
  delay(5000); // Wait for 5 seconds to receive the server's reply based on network conditions

  // Send an additional newline character to ensure proper termination of the request
  sim.println();

  
    ShowSerialData();
  
    sim.println("AT+CIPSHUT");//close the connection
    delay(100);
    ShowSerialData();
    resetDevice();
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

  // Connect to GPRS
  connectToGPRS();
}

//TEST NOT IMPORTANT
void configureBearer() {
    Serial.println("Configuring bearer profile...");

    // Close any existing bearer
    sim.println("AT+SAPBR=0,1");
    delay(2000);

    // Set bearer profile to GPRS
    sim.println("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"");
    if (!waitForResponse("OK", 10000)) {
        Serial.println("Failed to set connection type.");
        ShowSerialData();
        return;
    }

    // Set APN
    sim.println("AT+SAPBR=3,1,\"APN\",\"internet\"");
    if (!waitForResponse("OK", 10000)) {
        Serial.println("Failed to set APN.");
        ShowSerialData();
        return;
    }

    // Open bearer profile
    sim.println("AT+SAPBR=1,1");
    if (!waitForResponse("OK", 10000)) {
        Serial.println("Failed to open bearer.");
        ShowSerialData();
        return;
    }

    // Query bearer profile
    sim.println("AT+SAPBR=2,1");
    if (!waitForResponse("OK", 10000)) {
        Serial.println("Failed to query bearer.");
        ShowSerialData();
        return;
    }

    ShowSerialData();  // Show any response from the modem
}

// Test (DOES NOT WORK )
void sendDataToThingSpeak(float field1) {
  Serial.println("Sending data to ThingSpeak...");

  // Initialize HTTP service
  sim.println("AT+HTTPINIT");
  if (!waitForResponse("OK", 10000)) {
      Serial.println("HTTPINIT failed.");
      sim.println("AT+HTTPTERM");
      waitForResponse("OK");
      return;
  }

  // Set CID
  sim.println("AT+HTTPPARA=\"CID\"=1");
  if (!waitForResponse("OK", 10000)) {
      Serial.println("HTTPPARA CID failed.");
      ShowSerialData();
      sim.println("AT+HTTPTERM");
      waitForResponse("OK");
      return;
  }

  // Set URL
  String request_url2 = THING_SPEAK_API_URL + "?api_key=" + THING_SPEAK_API_KEY + "&field1=" + String(field1, 2);
  Serial.println("Request URL: " + request_url);  // Print URL for debugging
  Serial.println("Setting URL...");
  sim.println("AT+HTTPPARA=\"URL\",\"" + request_url2 + "\"");
  if (!waitForResponse("OK", 10000)) {
      Serial.println("HTTPPARA URL failed.");
      ShowSerialData();
      sim.println("AT+HTTPTERM");
      waitForResponse("OK");
      return;
  }

  // Start HTTP POST
  sim.println("AT+HTTPACTION=1");
  if (!waitForResponse("OK", 20000)) {
      Serial.println("HTTPACTION failed.");
      sim.println("AT+HTTPTERM");
      waitForResponse("OK");
      return;
  }

  // Read HTTP response
  sim.println("AT+HTTPREAD");
  String httpReadResponse = _readSerial();
  Serial.println("HTTP Read Response: " + httpReadResponse);

  // Terminate HTTP service
  sim.println("AT+HTTPTERM");
  if (!waitForResponse("OK", 10000)) {
      Serial.println("HTTPTERM failed.");
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
  
  Serial.println(dist);
  // sendDataToThingSpeak(dist);

  // Serial.println("Watchdog timer is enabled and will trigger a reset.");
  // resetDevice();

  delay(20000); //the interval of data reading is delayed every 20 seconds
  

}
