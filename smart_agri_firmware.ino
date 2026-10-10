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

#define WIFI_SSID     "your wifi name"
#define WIFI_PASSWORD "your password"


// ======================================================
//                  FIREBASE DETAILS
// ======================================================

#define DATABASE_URL "your data base url from firebase"
#define API_KEY      "your api_key form firebase"


// ======================================================
//                    SENSOR PINS
// ======================================================

#define DHTPIN D6
#define DHTTYPE DHT11

#define relay D4
#define pumpled D5


// ======================================================
//                     OBJECTS
// ======================================================

Adafruit_SSD1306 display(128, 64, &Wire, -1);

DHT dht(DHTPIN, DHTTYPE);


// Firebase objects

FirebaseData fbdo;

FirebaseAuth auth;

FirebaseConfig config;


// ======================================================
//                       SETUP
// ======================================================

void setup() {

  // ----------------------------------------------------
  // Pump
  // ----------------------------------------------------

  pinMode(relay, OUTPUT);
  pinMode(pumpled, OUTPUT);

  digitalWrite(relay, LOW);


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

  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  display.clearDisplay();

  display.setTextColor(WHITE);


  // ====================================================
  //                  CONNECT WIFI
  // ====================================================

  Serial.println();

  Serial.print("Connecting to WiFi");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);


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


  if (Firebase.signUp(&config, &auth, "", "")) {

    Serial.println("Firebase signup successful!");

  }

  else {

    Serial.println("Firebase signup failed!");

    Serial.println(
      config.signer.signupError.message.c_str()
    );
  }


  // ----------------------------------------------------
  // Start Firebase
  // ----------------------------------------------------

  Firebase.begin(&config, &auth);

  Firebase.reconnectWiFi(true);

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


  // Show raw value too

  Serial.print("Raw soil value: ");

  Serial.println(value);


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
  //                    OLED
  // ====================================================

  display.clearDisplay();

  display.setTextSize(1);


  display.setCursor(0, 0);

  display.println("      DATA");


  display.setCursor(0, 17);

  display.print("Moisture: ");

  display.print(moisture);

  display.println("%");


  display.setCursor(0, 34);

  display.print("Temp: ");

  display.print(temperature);

  display.println(" C");


  display.setCursor(0, 51);

  display.print("Humidity: ");

  display.print(humidity);

  display.println("%");


  display.display();


  // ====================================================
  //                    WATER PUMP
  // ====================================================

  if (moisture < 50) {

    digitalWrite(relay, LOW);

    Serial.println("PUMP ON");

    digitalWrite(pumpled, HIGH);

  }

  else {

    digitalWrite(relay, HIGH);

    Serial.println("PUMP OFF");

    digitalWrite(pumpled, LOW);
  }


  // ====================================================
  //                  FIREBASE
  // ====================================================

  if (Firebase.ready()) {

    Serial.println();
    Serial.println("Firebase is READY");


    // --------------------------------------------------
    // Temperature
    // --------------------------------------------------

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


    // --------------------------------------------------
    // Humidity
    // --------------------------------------------------

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


    // --------------------------------------------------
    // Soil moisture
    // --------------------------------------------------

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

  }

  else {

    Serial.println();

    Serial.println(
      "Firebase is NOT ready!"
    );
  }


  // ====================================================
  //                       DELAY
  // ====================================================

  delay(1000);

}
