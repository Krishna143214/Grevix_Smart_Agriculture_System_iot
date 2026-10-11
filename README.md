
# AgriSense — IoT Smart Agriculture System 🌱

## Project Name & Description

**AgriSense** is an IoT-based smart agriculture system built for the Grevix Hackathon. It monitors soil moisture, temperature, and humidity, automates irrigation, and displays real-time sensor data through an OLED display and Firebase-powered dashboard.

## Problem & Solution

**Problem:** Traditional irrigation requires regular manual monitoring, can waste water, and provides limited visibility into plant conditions and irrigation issues.

**Solution:** AgriSense automates watering based on soil moisture and provides remote monitoring through a Firebase dashboard. The planned extensions include tank-level monitoring, water-usage tracking, and irrigation fault detection.

## Demo & Project Links


- **GitHub Repository:** [https://github.com/Krishna143214/Grevix_Smart_Agriculture_System_iot.git]
- **Demo Video:** [https://www.instagram.com/p/DeW993iGkqy/?utm_source=ig_web_copy_link&exln=NTc4MTIwNjQ2YQ==]
- -**Linkdin** [https://lnkd.in/p/drqTJf_u]

## Technologies & AI Tools Used

**Hardware**

- NodeMCU ESP8266
- DHT11 temperature and humidity sensor
- Soil moisture sensor
- SSD1306 OLED display
- Relay module and water pump
- UltraSonic sensor

**Software**

- Arduino IDE and C++
- Firebase Realtime Database
- HTML, CSS, and JavaScript
- Chart.js

**AI Tools:** [Add the AI tools you actually used and briefly explain how you used them.]

## Project Evolution Through the Two Challenge Cards

### Challenge Card 1 — Pump Failure Detection

The project was extended to address possible irrigation failures. The proposed approach compares the expected change in tank water level with the actual change during watering. If the expected change does not occur, the system can flag a possible pump or water-flow issue.

### Challenge Card 2 — Water Monitoring & Usage Tracking

Based on feedback, the project was extended with tank-level monitoring and water-flow and total-water-usage tracking. These additions aim to improve water management and make irrigation more reliable.

**Implementation status:** The firmware and Firebase integration must provide the relevant readings for these features to work in the live system. Verify that both challenge-card features are implemented and tested before describing them as completed.

## Build Log / Decision Log

- **Initial build:** Connected the ESP8266, soil moisture sensor, DHT11, OLED display, relay, and water pump.
- **Automation:** Added pump control based on the soil-moisture threshold.
- **Remote monitoring:** Integrated Firebase Realtime Database and developed a dashboard for sensor readings and graphs.
- **Challenge-driven improvements:** Planned pump-failure detection, tank monitoring, and water-usage tracking based on the challenge requirements and feedback.
- **Key decision:** Used the ESP8266 for its built-in Wi-Fi, enabling remote monitoring without requiring a separate Wi-Fi module.

## Project Goal

AgriSense aims to reduce manual irrigation effort, improve visibility into plant conditions, and support smarter water management through IoT and automation.

**Built for the Grevix Hackathon** 🌱
