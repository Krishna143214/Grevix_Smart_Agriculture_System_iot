// ======================================================
// FIREBASE IMPORTS
// ======================================================

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getDatabase,
    ref,
    onValue,
    set
} from
    "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";


// ======================================================
// FIREBASE CONFIG
// ======================================================

// Keep your existing Firebase configuration here.
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);


// ======================================================
// HTML ELEMENTS
// ======================================================

const temperatureText = document.getElementById("temperature");
const humidityText = document.getElementById("humidity");
const soilText = document.getElementById("soil");

const soilConditionText = document.getElementById("soilCondition");
const plantStatusText = document.getElementById("plantStatus");
const pumpStatusText = document.getElementById("pumpStatus");
const lastUpdatedText = document.getElementById("lastUpdated");

const connectionStatusText = document.getElementById("connectionStatus");

const sidebarStatusDot = document.getElementById("sidebarStatusDot");
const sidebarStatusText = document.getElementById("sidebarStatusText");

const espStatusDot = document.getElementById("espStatusDot");
const espStatusText = document.getElementById("espStatusText");

const firebaseStatusDot = document.getElementById("firebaseStatusDot");
const firebaseStatusText = document.getElementById("firebaseStatusText");

const tankLevelText = document.getElementById("tankLevel");
const tankDistanceText = document.getElementById("tankDistance");
const flowRateText = document.getElementById("flowRate");
const totalWaterText = document.getElementById("totalWaterUsed");

const resetPumpFaultBtn =
    document.getElementById("resetPumpFaultBtn");

const resetPumpFaultMessage =
    document.getElementById("resetPumpFaultMessage");


// ======================================================
// GLOBAL VARIABLES
// ======================================================

let espConnected = false;
let firebaseConnected = false;
let lastESPUpdate = 0;

let pumpFaultState = false;
let pumpStatusValue = "Unknown";

let resetRequestPending = false;
let resetCommandSeenTrue = false;
let resetAwaitingFaultClear = false;

let temperatureChart;
let humidityChart;
let soilChart;

const ESP_TIMEOUT = 30000;


// ======================================================
// SYSTEM STATUS
// ======================================================

function setStatusDot(dot, online) {
    if (!dot) return;

    dot.classList.toggle("online", online);
    dot.classList.toggle("offline", !online);
}

function updateSystemStatus() {

    setStatusDot(espStatusDot, espConnected);
    setStatusDot(firebaseStatusDot, firebaseConnected);

    if (espStatusText) {
        espStatusText.textContent =
            espConnected ? "ESP Connected" : "ESP Disconnected";
    }

    if (firebaseStatusText) {
        firebaseStatusText.textContent =
            firebaseConnected
                ? "Firebase Connected"
                : "Firebase Disconnected";
    }

    const systemOnline = espConnected && firebaseConnected;

    setStatusDot(sidebarStatusDot, systemOnline);

    if (sidebarStatusText) {
        sidebarStatusText.textContent =
            systemOnline ? "System Online" : "System Offline";
    }

    if (connectionStatusText) {
        connectionStatusText.textContent =
            systemOnline
                ? "System online — ESP and Firebase connected ✅"
                : firebaseConnected
                    ? "Firebase connected — waiting for ESP data ⚠️"
                    : "Connecting to Firebase...";
    }
}


// ======================================================
// FIREBASE CONNECTION
// ======================================================

onValue(
    ref(database, ".info/connected"),

    (snapshot) => {
        firebaseConnected = snapshot.val() === true;
        updateSystemStatus();
    },

    (error) => {
        console.error("Firebase connection error:", error);
        firebaseConnected = false;
        updateSystemStatus();
    }
);


// ======================================================
// PUMP STATUS
// ======================================================

function renderPumpStatus() {

    if (!pumpStatusText) return;

    if (pumpFaultState) {
        pumpStatusText.textContent = "FAULT ⚠️";
        pumpStatusText.classList.add("pump-fault-active");
        return;
    }

    pumpStatusText.classList.remove("pump-fault-active");

    const value = String(pumpStatusValue || "").toLowerCase();

    if (value.includes("malfunction") || value.includes("fault")) {
        pumpStatusText.textContent = "FAULT ⚠️";
        pumpStatusText.classList.add("pump-fault-active");
    } else if (value.includes("on")) {
        pumpStatusText.textContent = "ON 🟢";
    } else if (value.includes("off")) {
        pumpStatusText.textContent = "OFF 🔴";
    } else {
        pumpStatusText.textContent =
            pumpStatusValue || "Waiting for ESP";
    }
}


// ======================================================
// READ PUMP FAULT
// ======================================================

onValue(ref(database, "pumpFault"), (snapshot) => {

    pumpFaultState = snapshot.val() === true;

    renderPumpStatus();

    if (resetAwaitingFaultClear && !pumpFaultState) {

        resetAwaitingFaultClear = false;

        if (resetPumpFaultMessage) {
            resetPumpFaultMessage.textContent =
                "Reset confirmed by the ESP8266.";

            resetPumpFaultMessage.className =
                "reset-fault-message success";
        }
    }
});


// ======================================================
// READ PUMP STATUS
// ======================================================

onValue(ref(database, "pumpStatus"), (snapshot) => {

    pumpStatusValue = snapshot.val() || "Unknown";

    renderPumpStatus();
});


// ======================================================
// REMOTE PUMP FAULT RESET
// ======================================================

onValue(ref(database, "resetPumpFault"), (snapshot) => {

    const requested = snapshot.val() === true;

    if (requested && resetRequestPending) {

        resetCommandSeenTrue = true;

        if (resetPumpFaultMessage) {
            resetPumpFaultMessage.textContent =
                "Request sent. Waiting for ESP8266 safety checks…";

            resetPumpFaultMessage.className =
                "reset-fault-message pending";
        }

    } else if (
        !requested &&
        resetRequestPending &&
        resetCommandSeenTrue
    ) {

        resetRequestPending = false;
        resetCommandSeenTrue = false;

        resetAwaitingFaultClear = pumpFaultState;

        if (resetPumpFaultBtn) {
            resetPumpFaultBtn.disabled = false;
        }

        if (!pumpFaultState) {

            if (resetPumpFaultMessage) {
                resetPumpFaultMessage.textContent =
                    "Reset confirmed by the ESP8266.";

                resetPumpFaultMessage.className =
                    "reset-fault-message success";
            }

        } else {

            if (resetPumpFaultMessage) {
                resetPumpFaultMessage.textContent =
                    "Reset accepted. Waiting for fault status to update…";

                resetPumpFaultMessage.className =
                    "reset-fault-message pending";
            }
        }
    }
});


// ======================================================
// RESET BUTTON CLICK
// ======================================================

if (resetPumpFaultBtn) {

    resetPumpFaultBtn.addEventListener("click", async () => {

        if (!firebaseConnected) {

            if (resetPumpFaultMessage) {
                resetPumpFaultMessage.textContent =
                    "Firebase is disconnected. Please try again.";

                resetPumpFaultMessage.className =
                    "reset-fault-message error";
            }

            return;
        }

        resetPumpFaultBtn.disabled = true;

        resetRequestPending = true;
        resetCommandSeenTrue = false;
        resetAwaitingFaultClear = false;

        if (resetPumpFaultMessage) {
            resetPumpFaultMessage.textContent =
                "Sending reset request…";

            resetPumpFaultMessage.className =
                "reset-fault-message pending";
        }

        try {

            await set(ref(database, "resetPumpFault"), true);

            if (resetPumpFaultMessage) {
                resetPumpFaultMessage.textContent =
                    "Request sent. The ESP must be awake and the tank sensor must return a valid reading.";

                resetPumpFaultMessage.className =
                    "reset-fault-message pending";
            }

        } catch (error) {

            console.error("Pump fault reset failed:", error);

            resetRequestPending = false;
            resetCommandSeenTrue = false;
            resetAwaitingFaultClear = false;

            resetPumpFaultBtn.disabled = false;

            if (resetPumpFaultMessage) {
                resetPumpFaultMessage.textContent =
                    "Could not send reset request: " + error.message;

                resetPumpFaultMessage.className =
                    "reset-fault-message error";
            }
        }
    });
}


// ======================================================
// SOIL CONDITION
// ======================================================

function getSoilCondition(soil) {

    if (soil < 30) return "Dry";
    if (soil < 60) return "Moderate";

    return "Wet";
}


// ======================================================
// FORMAT TIMESTAMP
// ======================================================

function formatTime(timestamp) {

    if (!timestamp) return "--";

    return new Date(Number(timestamp)).toLocaleString();
}


// ======================================================
// CHART OPTIONS
// ======================================================

function chartOptions(yTitle, yMin = undefined, yMax = undefined) {

    return {

        responsive: true,
        maintainAspectRatio: false,

        interaction: {
            mode: "index",
            intersect: false
        },

        plugins: {

            legend: {
                display: true,
                position: "top",
                align: "end",

                labels: {
                    usePointStyle: true,
                    pointStyle: "circle",
                    boxWidth: 7,
                    color: "#52645f"
                }
            },

            tooltip: {
                backgroundColor: "#073a35",
                titleColor: "#ffffff",
                bodyColor: "#dff3ec",

                callbacks: {
                    label: function(context) {
                        return " " +
                            context.dataset.label +
                            ": " +
                            context.parsed.y.toFixed(1);
                    }
                }
            }
        },

        scales: {

            x: {
                grid: {
                    display: false
                },

                ticks: {
                    color: "#8a9894",
                    maxTicksLimit: 7
                }
            },

            y: {
                min: yMin,
                max: yMax,

                grid: {
                    color: "rgba(10,55,45,.07)"
                },

                title: {
                    display: true,
                    text: yTitle,
                    color: "#71817c"
                },

                ticks: {
                    color: "#8a9894"
                }
            }
        }
    };
}


// ======================================================
// CREATE CHARTS
// ======================================================

function createCharts() {

    const temperatureCanvas =
        document.getElementById("temperatureChart");

    const humidityCanvas =
        document.getElementById("humidityChart");

    const soilCanvas =
        document.getElementById("soilChart");

    if (temperatureCanvas) {

        temperatureChart = new Chart(temperatureCanvas, {

            type: "line",

            data: {
                labels: [],

                datasets: [{
                    label: "Temperature (°C)",
                    data: [],
                    borderColor: "#e59a45",
                    backgroundColor: "rgba(229,154,69,.13)",
                    fill: true,
                    tension: 0.42,
                    borderWidth: 2.5,
                    pointRadius: 0
                }]
            },

            options: chartOptions("°C")
        });
    }

    if (humidityCanvas) {

        humidityChart = new Chart(humidityCanvas, {

            type: "line",

            data: {
                labels: [],

                datasets: [{
                    label: "Humidity (%)",
                    data: [],
                    borderColor: "#4d9bd0",
                    backgroundColor: "rgba(77,155,208,.12)",
                    fill: true,
                    tension: 0.42,
                    borderWidth: 2.5,
                    pointRadius: 0
                }]
            },

            options: chartOptions("%", 0, 100)
        });
    }

    if (soilCanvas) {

        soilChart = new Chart(soilCanvas, {

            type: "line",

            data: {
                labels: [],

                datasets: [{
                    label: "Soil Moisture (%)",
                    data: [],
                    borderColor: "#16a36f",
                    backgroundColor: "rgba(22,163,111,.14)",
                    fill: true,
                    tension: 0.42,
                    borderWidth: 2.8,
                    pointRadius: 0
                }]
            },

            options: chartOptions("%", 0, 100)
        });
    }
}


// ======================================================
// READ SENSOR DATA
// ======================================================

onValue(ref(database, "sensor"), (snapshot) => {

    const data = snapshot.val();

    if (!data) {

        espConnected = false;
        updateSystemStatus();

        return;
    }

    const temperature = Number(data.temperature);
    const humidity = Number(data.humidity);
    const soil = Number(data.soil);

    const tankLevel = Number(data.tankLevel);
    const tankDistance = Number(data.tankDistance);
    const flowRate = Number(data.flowRate);
    const totalWaterUsed = Number(data.totalWaterUsed);

    if (temperatureText) {
        temperatureText.textContent = temperature + " °C";
    }

    if (humidityText) {
        humidityText.textContent = humidity + " %";
    }

    if (soilText) {
        soilText.textContent = soil + " %";
    }

    if (soilConditionText) {
        soilConditionText.textContent = getSoilCondition(soil);
    }

    if (plantStatusText) {
        plantStatusText.textContent =
            soil < 50 ? "NEEDS WATER 💧" : "HEALTHY ✅";
    }

    if (tankLevelText && Number.isFinite(tankLevel)) {
        tankLevelText.textContent = tankLevel + " %";
    }

    if (tankDistanceText && Number.isFinite(tankDistance)) {
        tankDistanceText.textContent = tankDistance + " cm";
    }

    if (flowRateText && Number.isFinite(flowRate)) {
        flowRateText.textContent = flowRate + " mL/s";
    }

    if (totalWaterText && Number.isFinite(totalWaterUsed)) {
        totalWaterText.textContent = totalWaterUsed.toFixed(2) + " L";
    }

    if (lastUpdatedText) {
        lastUpdatedText.textContent = formatTime(data.lastUpdated);
    }

    renderPumpStatus();

    lastESPUpdate = Number(data.lastUpdated) || Date.now();
    espConnected = true;

    updateSystemStatus();

}, (error) => {

    console.error("Sensor data error:", error);

    if (connectionStatusText) {
        connectionStatusText.textContent =
            "Firebase error: " + error.message;
    }
});


// ======================================================
// ESP CONNECTION CHECK
// ======================================================

setInterval(() => {

    if (!lastESPUpdate) {

        espConnected = false;
        updateSystemStatus();

        return;
    }

    espConnected =
        Date.now() - lastESPUpdate <= ESP_TIMEOUT;

    updateSystemStatus();

}, 5000);


// ======================================================
// READ HISTORY AND UPDATE GRAPHS
// ======================================================

onValue(ref(database, "history"), (snapshot) => {

    const historyData = snapshot.val();

    if (!historyData) return;

    const readings = Object.values(historyData).map((reading) => ({

        temperature: Number(reading.temperature),
        humidity: Number(reading.humidity),
        soil: Number(reading.soil),

        timestamp: Number(
            reading.timestamp || reading.lastUpdated || 0
        )

    }));

    readings.sort((a, b) => a.timestamp - b.timestamp);

    const recent = readings.slice(-720);

    const labels = recent.map((reading) =>
        formatTime(reading.timestamp)
    );

    if (temperatureChart) {

        temperatureChart.data.labels = labels;

        temperatureChart.data.datasets[0].data =
            recent.map((reading) => reading.temperature);

        temperatureChart.update();
    }

    if (humidityChart) {

        humidityChart.data.labels = labels;

        humidityChart.data.datasets[0].data =
            recent.map((reading) => reading.humidity);

        humidityChart.update();
    }

    if (soilChart) {

        soilChart.data.labels = labels;

        soilChart.data.datasets[0].data =
            recent.map((reading) => reading.soil);

        soilChart.update();
    }

}, (error) => {

    console.error("History error:", error);
});


// ======================================================
// START DASHBOARD
// ======================================================

createCharts();
