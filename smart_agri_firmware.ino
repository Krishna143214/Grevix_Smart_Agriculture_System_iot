
// ======================================================
//                    LIBRARIES
// ======================================================

#include <DHT.h>

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>


// ======================================================
//                    WIFI DETAILS
// ======================================================

#define WIFI_SSID     "wifiname"
#define WIFI_PASSWORD "pass"


// ======================================================
//                  FIREBASE DETAILS
// ======================================================

#define DATABASE_URL "https://smart-agri-system-d6044-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define API_KEY      "api_key"

// Remote fault reset command:
// Set Firebase Realtime Database path /resetPumpFault to boolean true.
// The firmware clears the fault when the ultrasonic tank reading is valid.


// ======================================================
//                    SENSOR PINS
// ======================================================

#define DHTPIN D6
#define DHTTYPE DHT11

#define relay D4
#define pumpled D5
#define trig D8
#define echo D7

// ======================================================
//                 TANK + FLOW SETTINGS
// ======================================================

#define TANK_EMPTY_DISTANCE 30   // cm
#define TANK_FULL_DISTANCE 5     // cm
#define FLOW_RATE_ML_SEC 25.0    // estimated flow; not measured by a flow sensor
#define PUMP_VERIFY_TIMEOUT_MS 30000UL
#define TANK_DROP_THRESHOLD_CM 2.0

// ======================================================
//                 DEEP SLEEP SETTINGS
// ======================================================

// ESP8266 deep sleep is limited to about 71 minutes per call.
// Use six 60-minute sleep cycles to reach approximately 6 hours.
#define SLEEP_INTERVAL_US 3600000000UL
#define SLEEP_CYCLES 6
#define RTC_MEMORY_ADDRESS 64
#define RTC_MAGIC 0xA61B2026UL



// ======================================================
//                     OBJECTS
// ======================================================

Adafruit_SSD1306 display(128, 64, &Wire, -1);

DHT dht(DHTPIN, DHTTYPE);

FirebaseData fbdo;

FirebaseAuth auth;

FirebaseConfig config;

float totalWaterUsed = 0.0;
unsigned long lastFlowUpdate = 0;

bool pumpIsOn=false, pumpFault=false, pumpCheckActive=false, faultLedState=false;
float pumpStartDistance=-1;
unsigned long pumpCheckStartedAt=0, lastFaultLedToggle=0;
const char *pumpStatusText="Pump OFF";

// RTC memory survives ESP8266 deep-sleep resets.
struct SleepState {
  uint32_t magic;
  uint32_t sleepCycles;
  float savedTotalWaterUsed;
  uint32_t checksum;
};

SleepState sleepState;

uint32_t makeSleepChecksum(const SleepState &state) {
  return state.magic ^ state.sleepCycles ^
         (uint32_t)(state.savedTotalWaterUsed * 1000.0f) ^
         0x5A39C7E1UL;
}

bool readSleepState() {
  if (!ESP.rtcUserMemoryRead(RTC_MEMORY_ADDRESS,
                             (uint32_t *)&sleepState,
                             sizeof(sleepState))) {
    return false;
  }

  return sleepState.magic == RTC_MAGIC &&
         sleepState.checksum == makeSleepChecksum(sleepState);
}

void saveSleepState() {
  sleepState.magic = RTC_MAGIC;
  sleepState.savedTotalWaterUsed = totalWaterUsed;
  sleepState.checksum = makeSleepChecksum(sleepState);
  ESP.rtcUserMemoryWrite(RTC_MEMORY_ADDRESS,
                         (uint32_t *)&sleepState,
                         sizeof(sleepState));
}



// ======================================================
//                       SETUP
// ======================================================

void setup() {

  // Keep the active-LOW pump relay OFF immediately after every reset.
  pinMode(relay, OUTPUT);
  digitalWrite(relay, HIGH);

  if (readSleepState()) {
    totalWaterUsed = sleepState.savedTotalWaterUsed;
  } else {
    sleepState.magic = RTC_MAGIC;
    sleepState.sleepCycles = 0;
    totalWaterUsed = 0.0;
    saveSleepState();
  }

  // After each hourly wake-up, return to sleep until six hours have passed.
  // The sixth completed hour allows the normal sensor/Firebase cycle to run.
  if (sleepState.sleepCycles > 0 && sleepState.sleepCycles < SLEEP_CYCLES) {
    sleepState.sleepCycles++;
    saveSleepState();
    delay(100);
    ESP.deepSleep(SLEEP_INTERVAL_US);
    delay(1000); // Deep sleep should reset the ESP; safety fallback.
    while (true) {
      yield();
    }
  } else if (sleepState.sleepCycles >= SLEEP_CYCLES) {
    sleepState.sleepCycles = 0;
    saveSleepState();
  }


  // ----------------------------------------------------
  // Pump
  // ----------------------------------------------------

  pinMode(relay, OUTPUT);
  pinMode(pumpled, OUTPUT);
  pinMode(trig,OUTPUT);
  pinMode(echo,INPUT);

  digitalWrite(relay, HIGH);  // Active-LOW relay: keep pump OFF at startup


  // ----------------------------------------------------
  // Serial
  // ----------------------------------------------------

  Serial.begin(9600);

  delay(1000);


  // ----------------------------------------------------
  // DHT
  // ----------------------------------------------------

  dht.begin();


  // ----------------------------------------------------
  // OLED
  // ----------------------------------------------------


Wire.begin(D2, D1);   // SDA = D2, SCL = D1

if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
  Serial.println("OLED initialization failed!");
  while (true);
}

Serial.println("OLED initialization successful!");

display.clearDisplay();
display.setTextColor(WHITE);
display.setTextSize(2);
display.setCursor(0, 0);
display.println("TEST");
display.display();

delay(2000);


  // ====================================================
  //                  CONNECT WIFI
  // ====================================================

  Serial.println();

  Serial.print("Connecting to WiFi");

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );


  while (WiFi.status() != WL_CONNECTED) {

    delay(500);

    Serial.print(".");
  }


  Serial.println();

  Serial.println("WiFi Connected!");

  Serial.print("IP Address: ");

  Serial.println(WiFi.localIP());


  // ====================================================
  //                 FIREBASE SETUP
  // ====================================================

  config.api_key = API_KEY;

  config.database_url = DATABASE_URL;


  // ----------------------------------------------------
  // Anonymous Firebase login
  // ----------------------------------------------------

  Serial.println("Connecting to Firebase...");


  if (Firebase.signUp(
        &config,
        &auth,
        "",
        ""
      )) {

    Serial.println(
      "Firebase signup successful!"
    );

  }

  else {

    Serial.println(
      "Firebase signup failed!"
    );

    Serial.println(
      config.signer.signupError.message.c_str()
    );
  }


  // ----------------------------------------------------
  // Start Firebase
  // ----------------------------------------------------

  Firebase.begin(
    &config,
    &auth
  );

  Firebase.reconnectWiFi(true);

  lastFlowUpdate = millis();

}


// ======================================================
//                        LOOP
// ======================================================

void loop() {


  // ====================================================
  //               READ SOIL MOISTURE
  // ====================================================

  int value = analogRead(A0);


  int dry = 900;

  int wet = 300;


  int moisture = map(
    value,
    dry,
    wet,
    0,
    100
  );


  moisture = constrain(
    moisture,
    0,
    100
  );


  Serial.print("Raw soil value: ");

  Serial.println(value);



  
  // ==================================================
  //              Tank Monitor
  // ==================================================
  
  unsigned long duration = 0;
  long distance = -1;
  int tankLevel = 0;
  bool tankReadingValid = false;


  digitalWrite(trig,LOW);
  delayMicroseconds(2);
  digitalWrite(trig,HIGH);
  delayMicroseconds(10);
  digitalWrite(trig,LOW);
  delayMicroseconds(2);

  duration = pulseIn(echo, HIGH, 30000UL); // timeout avoids blocking forever

  if (duration > 0) {
    distance = (long)((duration * 0.0343) / 2.0);
    tankReadingValid = (distance >= TANK_FULL_DISTANCE - 2 &&
                        distance <= TANK_EMPTY_DISTANCE + 5);
  }

  if (tankReadingValid) {
    tankLevel = map(distance, TANK_EMPTY_DISTANCE, TANK_FULL_DISTANCE, 0, 100);
    tankLevel = constrain(tankLevel, 0, 100);
  } else {
    Serial.println("Tank reading invalid - pump verification may be unreliable");
  }

  Serial.print("Tank distance: ");
  Serial.print(distance);
  Serial.print(" cm | Tank level: ");
  Serial.print(tankLevel);
  Serial.println("%");




  
  



  // ====================================================
  //                  READ DHT
  // ====================================================

  float humidity = dht.readHumidity();

  float temperature = dht.readTemperature();


  // ====================================================
  //                  SERIAL OUTPUT
  // ====================================================

  Serial.print("Moisture: ");

  Serial.print(moisture);

  Serial.println("%");


  Serial.print("Temperature: ");

  Serial.print(temperature);

  Serial.println(" C");


  Serial.print("Humidity: ");

  Serial.print(humidity);

  Serial.println("%");


  // ====================================================
  //             REMOTE PUMP-FAULT RESET
  // ====================================================
  // To reset a fault, set /resetPumpFault = true in Firebase.
  // The reset is accepted only when the ultrasonic tank reading is valid.
  // The firmware then clears the command so it is not repeatedly processed.

  if (Firebase.ready() && Firebase.RTDB.getBool(&fbdo, "/resetPumpFault")) {
    if (fbdo.boolData()) {
      if (tankReadingValid && tankLevel > 5) {
        pumpFault = false;
        pumpIsOn = false;
        pumpCheckActive = false;
        pumpStartDistance = -1;
        pumpCheckStartedAt = 0;
        faultLedState = false;
        digitalWrite(relay, HIGH);   // Keep pump OFF during reset
        digitalWrite(pumpled, LOW);
        pumpStatusText = "Pump OFF";

        Serial.println("Remote pump-fault reset accepted.");
        Firebase.RTDB.setBool(&fbdo, "/resetPumpFault", false);
        Firebase.RTDB.setString(&fbdo, "/pumpAlert", "Fault reset; monitoring resumed");
      } else {
        Serial.println("Fault reset rejected: tank reading is invalid or tank level is too low.");
        // Leave /resetPumpFault true so the request can be retried
        // after the ultrasonic sensor returns a valid reading.
      }
    }
  }

  // ====================================================
  //                    WATER PUMP
  // ====================================================

  if (pumpFault) {
    digitalWrite(relay, HIGH); pumpIsOn=false; pumpCheckActive=false;
    pumpStatusText="Pump Malfunction";
  } else if (moisture < 50) {
    digitalWrite(relay, LOW); pumpStatusText="Pump ON";
    if (!pumpIsOn) {
      pumpIsOn=true; pumpCheckActive=true; pumpCheckStartedAt=millis();
      pumpStartDistance=tankReadingValid ? distance : -1;
    }
  } else {
    digitalWrite(relay, HIGH); pumpStatusText="Pump OFF";
    pumpIsOn=false; pumpCheckActive=false; pumpStartDistance=-1;
  }

  if (pumpIsOn && pumpCheckActive && millis()-pumpCheckStartedAt >= PUMP_VERIFY_TIMEOUT_MS) {
    if (!tankReadingValid || pumpStartDistance < 0 || distance-pumpStartDistance < TANK_DROP_THRESHOLD_CM) {
      pumpFault=true; digitalWrite(relay, HIGH); pumpIsOn=false;
      pumpCheckActive=false; pumpStatusText="Pump Malfunction";
      Serial.println("Pump Malfunction / Check Hardware");
    } else { pumpStartDistance=distance; pumpCheckStartedAt=millis(); }
  }

  // Refresh OLED after the pump state has been updated.
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 0);
  display.print("Moisture: ");
  display.print(moisture);
  display.println("%");
  display.setCursor(0, 10);
  display.print("Temp: ");
  display.print(temperature);
  display.println(" C");
  display.setCursor(0, 20);
  display.print("Humidity: ");
  display.print(humidity);
  display.println("%");
  display.setCursor(0, 30);
  display.print("Tank: ");
  if (tankReadingValid) {
    display.print(tankLevel);
    display.println("%");
  } else {
    display.println("Sensor error");
  }
  display.setCursor(0, 42);
  display.print("Pump: ");
  display.println(pumpStatusText);
  if (pumpFault) {
    display.setCursor(0, 54);
    display.println("CHECK HARDWARE!");
  }
  display.display();


  // ====================================================
  //                  WATER FLOW
  // ====================================================

  unsigned long now = millis();

  if (digitalRead(relay) == LOW) {
    totalWaterUsed += ((now - lastFlowUpdate) / 1000.0) * FLOW_RATE_ML_SEC;
  }

  lastFlowUpdate = now;

  float flowRate = (digitalRead(relay) == LOW) ? FLOW_RATE_ML_SEC : 0.0;

  Serial.print("Flow rate: ");
  Serial.print(flowRate);
  Serial.println(" mL/s");

  Serial.print("Total water used: ");
  Serial.print(totalWaterUsed);
  Serial.println(" mL");


  // ====================================================
  //                  FIREBASE
  // ====================================================

  if (Firebase.ready()) {

    Serial.println();

    Serial.println(
      "Firebase is READY"
    );


      // ==================================================
    if (!Firebase.RTDB.setString(&fbdo, "/pumpStatus", pumpFault ? "Pump Malfunction / Check Hardware" : pumpStatusText))
      Serial.println("Pump status upload failed");
    Firebase.RTDB.setBool(&fbdo, "/pumpFault", pumpFault);
    Firebase.RTDB.setString(&fbdo, "/pumpAlert", pumpFault ? "Pump Malfunction / Check Hardware" : "No pump fault");

  // ==================================================
    //              CURRENT TEMPERATURE
    // ==================================================

    if (Firebase.RTDB.setFloat(
          &fbdo,
          "/sensor/temperature",
          temperature
        )) {

      Serial.println(
        "Temperature sent!"
      );

    }

    else {

      Serial.print(
        "Temperature error: "
      );

      Serial.println(
        fbdo.errorReason()
      );
    }


    // ==================================================
    //              CURRENT HUMIDITY
    // ==================================================

    if (Firebase.RTDB.setFloat(
          &fbdo,
          "/sensor/humidity",
          humidity
        )) {

      Serial.println(
        "Humidity sent!"
      );

    }

    else {

      Serial.print(
        "Humidity error: "
      );

      Serial.println(
        fbdo.errorReason()
      );
    }


    // ==================================================
    //              CURRENT SOIL MOISTURE
    // ==================================================

    if (Firebase.RTDB.setInt(
          &fbdo,
          "/sensor/soil",
          moisture
        )) {

      Serial.println(
        "Soil moisture sent!"
      );

    }

    else {

      Serial.print(
        "Soil moisture error: "
      );

      Serial.println(
        fbdo.errorReason()
      );
    }


    // ==================================================
    //                    TANK
    // ==================================================

    if (Firebase.RTDB.setInt(
          &fbdo,
          "/sensor/tankDistance",
          distance
        )) {

      Serial.println("Tank distance sent!");

    }
    else {

      Serial.print("Tank distance error: ");
      Serial.println(fbdo.errorReason());
    }


    if (Firebase.RTDB.setInt(
          &fbdo,
          "/sensor/tankLevel",
          tankLevel
        )) {

      Serial.println("Tank level sent!");

    }
    else {

      Serial.print("Tank level error: ");
      Serial.println(fbdo.errorReason());
    }


    // ==================================================
    //                    WATER FLOW
    // ==================================================

    if (Firebase.RTDB.setFloat(
          &fbdo,
          "/sensor/flowRate",
          flowRate
        )) {

      Serial.println("Flow rate sent!");

    }
    else {

      Serial.print("Flow rate error: ");
      Serial.println(fbdo.errorReason());
    }


    if (Firebase.RTDB.setFloat(
          &fbdo,
          "/sensor/totalWaterUsed",
          totalWaterUsed
        )) {

      Serial.println("Total water used sent!");

    }
    else {

      Serial.print("Total water used error: ");
      Serial.println(fbdo.errorReason());
    }


    // ==================================================
    //                 LAST UPDATED
    // ==================================================

    if (Firebase.RTDB.setTimestamp(
          &fbdo,
          "/sensor/lastUpdated"
        )) {

      Serial.println(
        "Last updated time saved!"
      );

    }

    else {

      Serial.print(
        "Timestamp error: "
      );

      Serial.println(
        fbdo.errorReason()
      );
    }


    // ==================================================
    //                  HISTORY
    // ==================================================

    FirebaseJson history;


    history.add(
      "temperature",
      temperature
    );


    history.add(
      "humidity",
      humidity
    );


    history.add(
      "soil",
      moisture
    );

    history.add(
      "tankDistance",
      distance
    );

    history.add(
      "tankLevel",
      tankLevel
    );

    history.add(
      "flowRate",
      flowRate
    );

    history.add(
      "totalWaterUsed",
      totalWaterUsed
    );


    // --------------------------------------------------
    // Create a new history entry
    // --------------------------------------------------

    if (Firebase.RTDB.pushJSON(
          &fbdo,
          "/history",
          &history
        )) {

      Serial.println(
        "History saved!"
      );


      // ------------------------------------------------
      // Get the automatically generated key
      // ------------------------------------------------

      String historyKey =
        fbdo.pushName();


      Serial.print(
        "History key: "
      );

      Serial.println(
        historyKey
      );


      // ------------------------------------------------
      // Save timestamp inside that entry
      // ------------------------------------------------

      String historyPath =
        "/history/" +
        historyKey +
        "/timestamp";


      if (Firebase.RTDB.setTimestamp(
            &fbdo,
            historyPath
          )) {

        Serial.println(
          "History timestamp saved!"
        );

      }

      else {

        Serial.print(
          "History timestamp error: "
        );

        Serial.println(
          fbdo.errorReason()
        );
      }

    }

    else {

      Serial.print(
        "History error: "
      );

      Serial.println(
        fbdo.errorReason()
      );
    }

  }

  else {

    Serial.println();

    Serial.println(
      "Firebase is NOT ready!"
    );
  }


  // ====================================================
  //                SIX-HOUR DEEP SLEEP
  // ====================================================

  // Do not sleep while watering or while a fault alert needs to keep blinking.
  // Once irrigation is idle, sleep for six 60-minute cycles.
  if (!pumpIsOn && !pumpFault) {
    digitalWrite(relay, HIGH);
    digitalWrite(pumpled, LOW);

    sleepState.sleepCycles = 1;
    saveSleepState();

    Serial.println("Entering deep sleep: next full reading in about 6 hours.");
    delay(100);
    ESP.deepSleep(SLEEP_INTERVAL_US);
    delay(1000); // Safety fallback; deep sleep should reset the ESP.
    while (true) {
      yield();
    }
  }

  // Keep monitoring active if the pump is running or a fault LED must blink.
  unsigned long waitStartedAt = millis();
  while (millis() - waitStartedAt < 10000UL) {
    if (pumpFault && millis() - lastFaultLedToggle >= 500) {
      lastFaultLedToggle = millis();
      faultLedState = !faultLedState;
      digitalWrite(pumpled, faultLedState);
    } else if (!pumpFault) {
      digitalWrite(pumpled, pumpIsOn ? HIGH : LOW);
    }
    delay(10);
    yield();
  }

}
