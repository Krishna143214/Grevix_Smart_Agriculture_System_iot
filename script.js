// ======================================================
//                   FIREBASE IMPORTS
// ======================================================

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getDatabase,
    ref,
    onValue
} from
    "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";


// ======================================================
//                 FIREBASE CONFIG
// ======================================================

const firebaseConfig = {
    apiKey: "api key",
    authDomain: "smart-agri-system-d6044.firebaseapp.com",
    databaseURL: "https://smart-agri-system-d6044-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "smart-agri-system-d6044",
    storageBucket: "smart-agri-system-d6044.firebasestorage.app",
    messagingSenderId: "313989125590",
    appId: "1:313989125590:web:d48861752cbfba42b78077",
    measurementId: "G-XKSCBP09FL"
};


// ======================================================
//                 START FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);


// ======================================================
//                  HTML ELEMENTS
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


// ======================================================
//              TANK + FLOW ELEMENTS
// ======================================================

const tankLevelText = document.getElementById("tankLevel");
const tankDistanceText = document.getElementById("tankDistance");
const flowRateText = document.getElementById("flowRate");
const totalWaterText = document.getElementById("totalWaterUsed");


// ======================================================
//                 PUMP ALERT ELEMENTS
// ======================================================

const pumpAlertBanner = document.getElementById("pumpAlertBanner");
const pumpAlertTitle = document.getElementById("pumpAlertTitle");
const pumpAlertMessage = document.getElementById("pumpAlertMessage");
const pumpStatusMirror = document.getElementById("pumpStatusMirror");

let currentPumpStatus = "--";
let currentPumpAlert = "No pump fault";
let currentPumpFault = false;


function renderPumpState() {
    const fault = currentPumpFault ||
        /malfunction|check hardware/i.test(
            currentPumpStatus + " " + currentPumpAlert
        );

    const status = fault
        ? "Pump Malfunction / Check Hardware"
        : currentPumpStatus;

    if (pumpStatusText) {
        pumpStatusText.textContent = status;
    }

    if (pumpStatusMirror) {
        pumpStatusMirror.textContent = status;
    }

    if (pumpAlertBanner) {
        pumpAlertBanner.classList.toggle("hidden", !fault);
        pumpAlertBanner.classList.toggle("active", fault);
    }

    if (pumpAlertTitle) {
        pumpAlertTitle.textContent = fault
            ? "Pump Malfunction / Check Hardware"
            : "";
    }

    if (pumpAlertMessage) {
        pumpAlertMessage.textContent = fault
            ? (
                currentPumpAlert &&
                currentPumpAlert !== "No pump fault"
                    ? currentPumpAlert
                    : "Pump verification failed. Check the pump, relay and water tank."
            )
            : "";
    }

    const pumpCard = pumpStatusText?.closest(".status-card");

    if (pumpCard) {
        pumpCard.classList.toggle("status-card-fault", fault);
    }

    const pumpBox = pumpStatusMirror?.closest(".pump-status-box");

    if (pumpBox) {
        pumpBox.classList.toggle("pump-status-fault", fault);
    }
}


// ======================================================
//             READ PUMP STATUS FROM FIREBASE
// ======================================================

onValue(ref(database, "/pumpStatus"), snapshot => {
    currentPumpStatus = String(snapshot.val() ?? "--");
    renderPumpState();
});

onValue(ref(database, "/pumpFault"), snapshot => {
    const value = snapshot.val();

    currentPumpFault =
        value === true ||
        value === 1 ||
        value === "true";

    renderPumpState();
});

onValue(ref(database, "/pumpAlert"), snapshot => {
    currentPumpAlert = String(
        snapshot.val() ?? "No pump fault"
    );

    renderPumpState();
});


// ======================================================
//                 SYSTEM STATUS STATE
// ======================================================

let espConnected = false;
let firebaseConnected = false;
let lastESPUpdate = 0;

const ESP_TIMEOUT = 30000;


function setStatusDot(dot, online) {
    if (!dot) return;

    dot.classList.toggle("online", online);
    dot.classList.toggle("offline", !online);
}


function updateSystemStatus() {
    setStatusDot(espStatusDot, espConnected);
    setStatusDot(firebaseStatusDot, firebaseConnected);

    if (espStatusText) {
        espStatusText.textContent = espConnected
            ? "ESP Connected"
            : "ESP Disconnected";
    }

    if (firebaseStatusText) {
        firebaseStatusText.textContent = firebaseConnected
            ? "Firebase Connected"
            : "Firebase Disconnected";
    }

    const systemOnline = espConnected && firebaseConnected;

    setStatusDot(sidebarStatusDot, systemOnline);

    if (sidebarStatusText) {
        sidebarStatusText.textContent = systemOnline
            ? "System Online"
            : "System Offline";
    }

    if (connectionStatusText) {
        connectionStatusText.textContent = systemOnline
            ? "System online — ESP and Firebase connected ✅"
            : firebaseConnected
                ? "Firebase connected — waiting for ESP data ⚠️"
                : "Connecting to Firebase...";
    }
}


// ======================================================
//             FIREBASE CONNECTION STATUS
// ======================================================

const firebaseConnectionRef = ref(database, ".info/connected");

onValue(
    firebaseConnectionRef,
    snapshot => {
        firebaseConnected = snapshot.val() === true;
        updateSystemStatus();
    },
    error => {
        console.error("Firebase connection error:", error);
        firebaseConnected = false;
        updateSystemStatus();
    }
);


// ======================================================
//                    CHARTS
// ======================================================

let temperatureChart;
let humidityChart;
let soilChart;


// ======================================================
//                 CHART OPTIONS
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
                    color: "#52645f",

                    font: {
                        size: 10,
                        weight: "600"
                    }
                }
            },

            tooltip: {
                backgroundColor: "#073a35",
                titleColor: "#ffffff",
                bodyColor: "#dff3ec",
                padding: 10,
                cornerRadius: 9,
                displayColors: true,

                callbacks: {
                    label: function(context) {
                        return " " + context.dataset.label +
                            ": " + context.parsed.y.toFixed(1);
                    }
                }
            }
        },

        scales: {
            x: {
                grid: {
                    display: false
                },

                border: {
                    display: false
                },

                ticks: {
                    color: "#8a9894",
                    maxTicksLimit: 7,

                    font: {
                        size: 9
                    }
                }
            },

            y: {
                min: yMin,
                max: yMax,

                border: {
                    display: false
                },

                grid: {
                    color: "rgba(10,55,45,.07)",
                    drawTicks: false
                },

                title: {
                    display: true,
                    text: yTitle,
                    color: "#71817c",

                    font: {
                        size: 9,
                        weight: "600"
                    }
                },

                ticks: {
                    color: "#8a9894",
                    padding: 7,

                    font: {
                        size: 9
                    }
                }
            }
        }
    };
}


// ======================================================
//                 CREATE THE CHARTS
// ======================================================

function createCharts() {

    // Temperature chart
    temperatureChart = new Chart(
        document.getElementById("temperatureChart"),
        {
            type: "line",

            data: {
                labels: [],

                datasets: [
                    {
                        label: "Temperature (°C)",
                        data: [],
                        borderColor: "#e59a45",
                        backgroundColor: "rgba(229,154,69,.13)",
                        fill: true,
                        tension: 0.42,
                        borderWidth: 2.5,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: "#e59a45",
                        pointHoverBorderColor: "#ffffff",
                        pointHoverBorderWidth: 2
                    }
                ]
            },

            options: chartOptions("°C")
        }
    );


    // Humidity chart
    humidityChart = new Chart(
        document.getElementById("humidityChart"),
        {
            type: "line",

            data: {
                labels: [],

                datasets: [
                    {
                        label: "Humidity (%)",
                        data: [],
                        borderColor: "#4d9bd0",
                        backgroundColor: "rgba(77,155,208,.12)",
                        fill: true,
                        tension: 0.42,
                        borderWidth: 2.5,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: "#4d9bd0",
                        pointHoverBorderColor: "#ffffff",
                        pointHoverBorderWidth: 2
                    }
                ]
            },

            options: chartOptions("%", 0, 100)
        }
    );


    // Soil moisture chart
    soilChart = new Chart(
        document.getElementById("soilChart"),
        {
            type: "line",

            data: {
                labels: [],

                datasets: [
                    {
                        label: "Soil Moisture (%)",
                        data: [],
                        borderColor: "#16a36f",
                        backgroundColor: "rgba(22,163,111,.14)",
                        fill: true,
                        tension: 0.42,
                        borderWidth: 2.8,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: "#16a36f",
                        pointHoverBorderColor: "#ffffff",
                        pointHoverBorderWidth: 2
                    }
                ]
            },

            options: chartOptions("%", 0, 100)
        }
    );
}


// ======================================================
//                 SOIL CONDITION
// ======================================================

function getSoilCondition(soil) {
    if (soil < 30) {
        return "Dry";
    }

    if (soil < 60) {
        return "Moderate";
    }

    return "Wet";
}


// ======================================================
//                 FORMAT TIMESTAMP
// ======================================================

function formatTime(timestamp) {
    if (!timestamp) {
        return "--";
    }

    const date = new Date(Number(timestamp));

    return date.toLocaleString();
}



// ======================================================
//              READ CURRENT SENSOR DATA
// ======================================================

const sensorRef = ref(database, "sensor");

onValue(
    sensorRef,

    snapshot => {
        const data = snapshot.val();

        if (!data) {
            espConnected = false;
            updateSystemStatus();
            return;
        }


        // Sensor values
        const temperature = Number(data.temperature);
        const humidity = Number(data.humidity);
        const soil = Number(data.soil);


        // Tank and water usage values
        const tankLevel = Number(data.tankLevel);
        const tankDistance = Number(data.tankDistance);
        const flowRate = Number(data.flowRate);
        const totalWaterUsed = Number(data.totalWaterUsed);


        // Display temperature, humidity and soil moisture
        if (temperatureText) {
            temperatureText.textContent = temperature + " °C";
        }

        if (humidityText) {
            humidityText.textContent = humidity + " %";
        }

        if (soilText) {
            soilText.textContent = soil + " %";
        }


        // Display tank level
        if (tankLevelText) {
            tankLevelText.textContent = tankLevel + " %";
        }

        if (tankDistanceText) {
            tankDistanceText.textContent = tankDistance + " cm";
        }


        // Display water flow and total water used
        if (flowRateText) {
            flowRateText.textContent = flowRate + " mL/s";
        }

        if (totalWaterText) {
            totalWaterText.textContent = totalWaterUsed + " L";
        }


        // Soil condition
        if (soilConditionText) {
            soilConditionText.textContent =
                getSoilCondition(soil);
        }


        // Plant status
        // Pump status is read separately from Firebase.
        if (plantStatusText) {
            if (soil < 50) {
                plantStatusText.textContent = "NEEDS WATER 💧";
            } else {
                plantStatusText.textContent = "HEALTHY ✅";
            }
        }


        // Last updated
        if (lastUpdatedText) {
            lastUpdatedText.textContent =
                formatTime(data.lastUpdated);
        }


        // ESP heartbeat
        lastESPUpdate = Number(data.lastUpdated) || Date.now();

        espConnected = true;
        updateSystemStatus();
    },

    error => {
        console.error(error);

        firebaseConnected = false;
        updateSystemStatus();

        if (connectionStatusText) {
            connectionStatusText.textContent =
                "Firebase error: " + error.message;
        }
    }
);


// ======================================================
//                  ESP HEARTBEAT CHECK
// ======================================================

setInterval(() => {
    if (!lastESPUpdate) {
        espConnected = false;
        updateSystemStatus();
        return;
    }

    const now = Date.now();

    espConnected =
        now - lastESPUpdate <= ESP_TIMEOUT;

    updateSystemStatus();
}, 5000);


// ======================================================
//                 READ HISTORY DATA
// ======================================================

const historyRef = ref(database, "history");

onValue(
    historyRef,

    snapshot => {
        const historyData = snapshot.val();

        if (!historyData) {
            return;
        }


        // Convert Firebase object into an array
        const readings = [];

        Object.keys(historyData).forEach(key => {
            const reading = historyData[key];

            readings.push({
                temperature: Number(reading.temperature),
                humidity: Number(reading.humidity),
                soil: Number(reading.soil),
                timestamp: Number(reading.timestamp || 0)
            });
        });


        // Sort readings from oldest to newest
        readings.sort(
            (a, b) => a.timestamp - b.timestamp
        );


        // Keep the latest 720 readings
        const recent = readings.slice(-720);


        // Create chart labels
        const labels = recent.map(
            reading => formatTime(reading.timestamp)
        );


        // Prepare temperature data
        const temperatures = recent.map(
            reading => reading.temperature
        );


        // Prepare humidity data
        const humidities = recent.map(
            reading => reading.humidity
        );


        // Prepare soil moisture data
        const soils = recent.map(
            reading => reading.soil
        );


        // Update temperature chart
        if (temperatureChart) {
            temperatureChart.data.labels = labels;
            temperatureChart.data.datasets[0].data =
                temperatures;

            temperatureChart.update();
        }


        // Update humidity chart
        if (humidityChart) {
            humidityChart.data.labels = labels;
            humidityChart.data.datasets[0].data =
                humidities;

            humidityChart.update();
        }


        // Update soil moisture chart
        if (soilChart) {
            soilChart.data.labels = labels;
            soilChart.data.datasets[0].data = soils;

            soilChart.update();
        }
    },

    error => {
        console.error("History error:", error);
    }
);


// ======================================================
//                CREATE CHARTS FIRST
// ======================================================

createCharts();
