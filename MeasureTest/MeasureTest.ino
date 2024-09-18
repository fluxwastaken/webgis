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
  //setup() runs once on startup

  Serial.begin(9600); //starting up the entire system including the sensor
  _buffer.reserve(50);
  Serial.println("System Started...");
  sim.begin(9600);
  
  //preliminary startup procedure for debug testing of GSM module

  // Test if SIM800L is working
  testSIM800L();

  configureBearer();
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
void connectToGPRS() {

  //   Serial.println("Connecting to GPRS...");

  //   // Attach GPRS service
  //   sim.println("AT+CGATT=1");
  //   if (waitForResponse("OK")) {
  //     Serial.println("GPRS attached.");
  //   } else {
  //     Serial.println("Failed to attach GPRS.");
  //     return;
  //   }

  //   // Set up APN 
  //   sim.println("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"");
  //   if (!waitForResponse("OK")) {
  //     Serial.println("Failed to set connection type.");
  //     return;
  //   }

  //   sim.println("AT+SAPBR=3,1,\"APN\",\"" + APN + "\"");
  //   if (!waitForResponse("OK", 10000)) {
  //     Serial.println("Failed to set APN.");
  //     return;
  //   }
  //   // sim.println("AT+SAPBR=3,1,\"USER\",\"" + USER + "\"");
  //   // if (!waitForResponse("OK", 10000)) {
  //   //   Serial.println("Failed to set USER.");
  //   //   return;
  //   // }
  //   // sim.println("AT+SAPBR=3,1,\"PASS\",\"" + PASS + "\"");
  //   // if (!waitForResponse("OK", 10000)) {
  //   //   Serial.println("Failed to set PASS.");
  //   //   return;
  //   // }

  //   // Open GPRS bearer
  //   sim.println("AT+SAPBR=1,1");
  //   if (waitForResponse("OK", 30000)) {
  //     Serial.println("GPRS connected.");
  //   } else {
  //     Serial.println("Failed to connect GPRS. Retrying...");
  //     sim.println("AT+SAPBR=0,1"); // Close bearer first
  //     waitForResponse("OK");
  //     sim.println("AT+SAPBR=1,1"); // Retry opening GPRS bearer
  //     if (waitForResponse("OK", 60000)) {
  //       Serial.println("GPRS connected on retry.");
  //     } else {
  //       Serial.println("Failed to connect GPRS after retry.");
  //       return;
  //     }
  //   }
  //   // Get IP Address - Query the GPRS bearer context status
  //   sim.println("AT+SAPBR=2,1");
  //   if (waitForResponse("OK", 10000) == 1) {
  //       Serial.println("Error: Failed to query GPRS bearer context status");
  //       return;
  //   }

  //   String response = sim.readStringUntil('\r\n');
  //   if (response.indexOf("0.0.0.0") != -1) {
  //       Serial.println("IP is currently 0.0.0.0");
  //   } else {
  //       Serial.println("IP SUCCESS");
  //       // Extract the IP address from the response (if needed)
  //   }

    sim.println("AT");
    delay(1000);

    sim.println("AT+CPIN?");
    delay(1000);

    sim.println("AT+CREG?");
    delay(1000);

    sim.println("AT+CGATT?");
    delay(1000);

    sim.println("AT+CIPSHUT");
    delay(1000);

    sim.println("AT+CIPSTATUS");
    delay(2000);

    sim.println("AT+CIPMUX=0");
    delay(2000);

    ShowSerialData();

    sim.println("AT+CSTT=\"internet\",\"\",\"\"");
    delay(2000);

    ShowSerialData();

    sim.println("AT+CSQ");
    delay(3000);

    sim.println("AT+CIICR");
    delay(3000);

    ShowSerialData();

    sim.println("AT+CIFSR");
    delay(2000);

    ShowSerialData();

    sim.println("AT+CIPSPRT=0");

    sim.println("AT+CIPSTART=\"TCP\",\"api.thingspeak.com\",\"80\"");//start up the connection
    delay(6000);
  
    ShowSerialData();
  
    sim.println("AT+CIPSEND");//begin send data to remote server
    delay(4000);
    ShowSerialData();
    
    String str="GET https://api.thingspeak.com/update?api_key=1GY3ELI7PBHDLJV2&field1=300";
    Serial.println(str);
    sim.println(str);//begin send data to remote server
    
    delay(4000);
    ShowSerialData();
  
    sim.println((char)26);//sending
    delay(5000);//waitting for reply, important! the time is base on the condition of internet 
    sim.println();
  
    ShowSerialData();
  
    sim.println("AT+CIPSHUT");//close the connection
    delay(100);
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
    return;
  }

  // Check if SIM is ready
  sim.println("AT+CPIN?");
  if (waitForResponse("+CPIN: READY")) {
    Serial.println("SIM card is ready.");
  } else {
    Serial.println("SIM card not detected or not ready.");
    return;
  }

  // Check network registration
  sim.println("AT+CREG?");
  if (waitForResponse("+CREG: 0,1") || waitForResponse("+CREG: 0,5")) {
    Serial.println("SIM800L is registered on the network.");
  } else {
    Serial.println("SIM800L is not registered on the network.");
  }

   //Turning ON full functionality
  sim.println("AT+CFUN=1");
   if (waitForResponse("OK")) {
    Serial.println("SIM800L has full functionality");
  } else {
    Serial.println("SIM800L does not have full functionality");
  }
  // Check signal quality
  sim.println("AT+CSQ");
  if (waitForResponse("OK")) {
    Serial.println("Signal quality command executed.");
    
  } else {
    Serial.println("Failed to check signal quality.");
  }

  // Connect to GPRS
  connectToGPRS();
}

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
  //loop() contains the operations done by the device on uptime
  
  //declaration of the current area being handled by the device
  String area = "Sample Area";

  
  float dist = Sensor.measureDistanceCm(); //distance acquisition
  //float floodlvl = 10.16-dist; //measuring distance of water level from ground level
  //float distIn = floodlvl/2.54; //converting centimeters to inches
  
  

 
  Serial.println(dist);
  // sendDataToThingSpeak(dist);


  delay(20000); //the interval of data reading is delayed every 10 seconds
  

}
