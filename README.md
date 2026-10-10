# Grevix_Smart_Agriculture_System_iot


# AgriSense - IoT Smart Agriculture System 🌱

AgriSense is my IoT-based smart agriculture project. I made it to monitor the basic conditions of a plant and automate watering when the soil gets dry.

The idea is simple: instead of checking the soil again and again, the system reads soil moisture, temperature and humidity, shows the readings on an OLED display, and sends the data to Firebase so I can check it on a dashboard.

## Features

- Reads soil moisture using a soil moisture sensor.
- Measures temperature and air humidity using a DHT11.
- Shows readings on a 128x64 I2C OLED display.
- Automatically controls the water pump through a relay when soil moisture drops below the threshold.
- Sends temperature, humidity and soil moisture to Firebase Realtime Database.
- Displays current readings and history graphs on the web dashboard.
- Includes dashboard cards for tank level, water flow and total water used when those values are available in Firebase.
- Shows plant status, pump status and the last update time.

**Current firmware note:** the firmware shared with this project currently uploads temperature, humidity and soil moisture. The tank and flow cards need firmware or another process to upload their corresponding values.

## Hardware Used

| Component | Purpose |
|---|---|
| NodeMCU ESP8266 | Main controller and Wi-Fi |
| DHT11 | Temperature and humidity |
| Soil moisture sensor | Soil moisture measurement |
| 128x64 I2C OLED (SSD1306) | Local readings |
| Relay module | Pump switching |
| Water pump | Watering the plant |
| Jumper wires and power supply | Connections and power |

## Software Used

- Arduino IDE and ESP8266 board package
- Firebase Realtime Database
- HTML, CSS and JavaScript
- Chart.js
- DHT library
- Adafruit GFX and Adafruit SSD1306
- Firebase ESP Client library

## How It Works

1. NodeMCU connects to Wi-Fi.
2. It initializes Firebase.
3. The soil sensor is read through `A0`.
4. DHT11 reads temperature and humidity.
5. The OLED displays the latest readings.
6. If soil moisture is below **50%**, the firmware sets the relay to turn the pump on. Otherwise, it turns it off.
7. Temperature, humidity and soil moisture are uploaded to Firebase.
8. The dashboard reads Firebase and updates the sensor cards and charts.



## Firebase Data

The current firmware writes to the `sensor` node:

```json
{
  "sensor": {
    "temperature": 27.4,
    "humidity": 73.9,
    "soil": 42
  }
}
```

The dashboard also reads a `history` node. Each history record is expected to include `temperature`, `humidity`, `soil` and `timestamp`. The supplied firmware does not currently write history records, so the charts need a separate history-writing process or additional firmware logic.

The dashboard also looks for `tankLevel`, `tankDistance`, `flowRate` and `totalWaterUsed` under `sensor`. Those values are not sent by the firmware shown here yet.

## Setup

### Firmware

1. Install Arduino IDE.
2. Install the ESP8266 board package and the libraries listed above.
3. Open the firmware `.ino` file and select your NodeMCU board.
4. Set your Wi-Fi and Firebase configuration.
5. Upload the code and open Serial Monitor at **9600 baud**.

Replace the placeholder values:

```cpp
#define WIFI_SSID     "your_wifi_name"
#define WIFI_PASSWORD "your_pass"

#define DATABASE_URL "https://your-project-default-rtdb.region.firebasedatabase.app/"
#define API_KEY      "your_firebase_web_api_key"
```

### Dashboard

Keep the HTML, CSS and JS files in the same folder. The HTML links to `style.css` and loads `script.js` as a JavaScript module. Run it through a local development server, such as VS Code Live Server, or host it online; opening it directly as a `file://` page may not work reliably with Firebase modules.

Update the Firebase web configuration in `script.js` to match your Firebase project.

## Important Notes

- **Soil calibration:** the firmware uses `dry = 900` and `wet = 300`. Calibrate these values for your sensor and soil.
- **Relay logic:** the code assumes `LOW` turns the relay/pump on and `HIGH` turns it off. Relay modules can differ, so test this before connecting the pump.
- **Pump power:** never power a pump directly from an ESP8266 GPIO pin. Use an appropriate external supply and a relay/driver rated for the pump.
- **DHT11 errors:** failed reads can return invalid values. Check Serial Monitor if readings look wrong.
- **Firebase authentication:** the firmware attempts anonymous signup. Enable and configure the relevant Firebase Authentication method and Realtime Database rules.
- **Database rules:** do not leave the database publicly readable and writable for a public deployment.





## Suggested Project Structure

```text
AgriSense/
├── firmware/
│   ├── AgriSense.ino
│   ├── secrets.example.h
│   └── secrets.h       # local only; do not upload
├── dashboard/
│   ├── index.html
│   ├── script.js
│   └── style.css
├── .gitignore
└── README.md
```

This is a suggested layout; use the filenames and folders in your actual repository.

---

Made as my IoT smart agriculture project using NodeMCU ESP8266, sensors, Firebase and a web dashboard. 🌱
