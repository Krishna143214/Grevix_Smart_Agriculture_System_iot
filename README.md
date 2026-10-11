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
- Includes work on pump-fault handling, including a Firebase-based remote reset request and tank-condition checks before recovery.

**Implementation note:** the firmware and dashboard must both publish/read the matching Firebase values for tank level, flow, total water used and fault recovery to work end to end. Verify these functions on the physical setup before describing them as fully tested.

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

## Pin Connections

| Component | NodeMCU pin |
|---|---|
| Soil sensor analog output | `A0` |
| DHT11 data | `D6` |
| Relay control | `D4` |
| Pump indicator LED | `D5` |
| OLED SDA | Commonly `D2` / GPIO4 |
| OLED SCL | Commonly `D1` / GPIO5 |
| OLED I2C address | `0x3C` |

The OLED uses I2C. Check your actual wiring and `Wire` configuration before powering the circuit.

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

The dashboard looks for `tankLevel`, `tankDistance`, `flowRate` and `totalWaterUsed` under `sensor`. Ensure the deployed firmware writes these fields before relying on the corresponding dashboard cards. The fault-reset workflow also depends on the firmware and dashboard using the same Firebase reset-command path.

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

## Keeping Credentials Out of GitHub

Do not commit your real Wi-Fi password, private keys, service-account files or other secrets. For a cleaner setup, move credentials into a local `secrets.h`, include it in the firmware, and add it to `.gitignore`. Commit a `secrets.example.h` containing placeholders instead.

Example `.gitignore`:

```gitignore
secrets.h
secrets.cpp
.env
.vscode/
build/
.DS_Store
```

If a real password or credential was already committed, deleting it from the latest version is not enough. Rotate it and clean the Git history if needed.

## Project Evolution Through the Two Challenge Cards

### Challenge Card 1 — Pump Failure Detection

feedback/feedback_screenshots/feedback1.jpeg

The project was extended to address possible irrigation failures. The approach compares the expected change in tank water level with the actual change during watering. If the expected change does not occur, the system can flag a possible pump or water-flow issue.

### Challenge Card 2 — Water Monitoring & Usage Tracking

Based on feedback, the project was extended with tank-level monitoring and water-flow and total-water-usage tracking. These additions aim to improve water management and make irrigation more reliable.

**Feedback 1 — Determining Crop Water Requirements**

The feedback asked how the system determines the water requirements of different crops and whether it relies only on soil moisture.

**Solution:** The current irrigation logic primarily uses soil-moisture readings. Tank-level monitoring and water-usage tracking can provide additional information about water availability and consumption. Crop type, soil type, weather conditions and plant growth stage could be included in a future version to support more crop-specific irrigation decisions; the current system does not yet calculate crop water requirements using all these factors.

**Feedback 2 — Pump Fault Handling and Firmware Timing**

The reviewer noted that the fault cleared only after the board rebooted, that the pump should remain stopped after a fault until someone resets it, and that the firmware loop ran every 10 seconds while its comment said one minute.

**Solutions worked on:**
- **Remote fault reset:** Added a Firebase-based reset command so a user can request fault recovery from the dashboard without rebooting the ESP8266.
- **Safety checks:** The reset workflow checks tank-level conditions before allowing recovery, helping avoid a restart when water conditions are unsuitable.
- **Pump protection:** The intended behavior is for the pump to remain stopped after a fault until the fault is safely reset.
- **Timing clarity:** Reviewed the loop timing and comments so the documented interval matches the intended firmware behavior.
- **Water-level threshold:** Adjusted the minimum expected tank-level change used to flag a possible pumping problem.

These changes aim to make fault handling more reliable, reduce unnecessary board reboots and make the firmware easier to maintain.



## Current Limitations / Next Improvements

- Add history upload logic so the graphs can be populated by the firmware.
- Improve credential handling and Firebase rules.
- Make the wiring more compact and easier to carry.
- Add reliable alerts and connection monitoring.



Made as my IoT smart agriculture project using NodeMCU ESP8266, sensors, Firebase and a web dashboard. 🌱

