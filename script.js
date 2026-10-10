
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

    apiKey:
        "AIzaSyCvtOrUbdBa5jPYOonW5m-bTdAdIWbERO4",

    authDomain:
        "smart-agri-system-d6044.firebaseapp.com",

    databaseURL:
        "https://smart-agri-system-d6044-default-rtdb.asia-southeast1.firebasedatabase.app",

    projectId:
        "smart-agri-system-d6044",

    storageBucket:
        "smart-agri-system-d6044.firebasestorage.app",

    messagingSenderId:
        "313989125590",

    appId:
        "1:313989125590:web:d48861752cbfba42b78077",

    measurementId:
        "G-XKSCBP09FL"
};



// ======================================================
//                 START FIREBASE
// ======================================================

const app =
    initializeApp(firebaseConfig);


const database =
    getDatabase(app);



// ======================================================
//                  HTML ELEMENTS
// ======================================================

const temperatureText =
    document.getElementById("temperature");


const humidityText =
    document.getElementById("humidity");


const soilText =
    document.getElementById("soil");


const soilConditionText =
    document.getElementById("soilCondition");


const plantStatusText =
    document.getElementById("plantStatus");


const pumpStatusText =
    document.getElementById("pumpStatus");


const lastUpdatedText =
    document.getElementById("lastUpdated");


const connectionStatusText =
    document.getElementById("connectionStatus");



// ======================================================
//                    CHARTS
// ======================================================

let temperatureChart;

let humidityChart;

let soilChart;



// ======================================================
//                 CREATE THE CHARTS
// ======================================================

function createCharts() {


    // --------------------------------------------------
    // Temperature chart
    // --------------------------------------------------

    temperatureChart = new Chart(

        document.getElementById(
            "temperatureChart"
        ),

        {

            type: "line",

            data: {

                labels: [],

                datasets: [
                    {

                        label:
                            "Temperature (°C)",

                        data: [],

                        tension: 0.3
                    }
                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false
            }
        }
    );



    // --------------------------------------------------
    // Humidity chart
    // --------------------------------------------------

    humidityChart = new Chart(

        document.getElementById(
            "humidityChart"
        ),

        {

            type: "line",

            data: {

                labels: [],

                datasets: [
                    {

                        label:
                            "Humidity (%)",

                        data: [],

                        tension: 0.3
                    }
                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false
            }
        }
    );



    // --------------------------------------------------
    // Soil chart
    // --------------------------------------------------

    soilChart = new Chart(

        document.getElementById(
            "soilChart"
        ),

        {

            type: "line",

            data: {

                labels: [],

                datasets: [
                    {

                        label:
                            "Soil Moisture (%)",

                        data: [],

                        tension: 0.3
                    }
                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false
            }
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


    const date =
        new Date(Number(timestamp));


    return date.toLocaleString();
}



// ======================================================
//              READ CURRENT SENSOR DATA
// ======================================================

const sensorRef =
    ref(
        database,
        "sensor"
    );


onValue(

    sensorRef,

    (snapshot) => {


        const data =
            snapshot.val();


        if (!data) {

            connectionStatusText.textContent =
                "No sensor data found.";

            return;
        }



        // ------------------------------------------------
        // Get current values
        // ------------------------------------------------

        const temperature =
            Number(data.temperature);


        const humidity =
            Number(data.humidity);


        const soil =
            Number(data.soil);



        // ------------------------------------------------
        // Display values
        // ------------------------------------------------

        temperatureText.textContent =
            temperature + " °C";


        humidityText.textContent =
            humidity + " %";


        soilText.textContent =
            soil + " %";



        // ------------------------------------------------
        // Soil condition
        // ------------------------------------------------

        soilConditionText.textContent =
            getSoilCondition(soil);



        // ------------------------------------------------
        // Pump and plant status
        // ------------------------------------------------

        if (soil < 50) {

            pumpStatusText.textContent =
                "ON 🟢";


            plantStatusText.textContent =
                "NEEDS WATER 💧";

        }

        else {

            pumpStatusText.textContent =
                "OFF 🔴";


            plantStatusText.textContent =
                "HEALTHY ✅";
        }



        // ------------------------------------------------
        // Last updated
        // ------------------------------------------------

        lastUpdatedText.textContent =
            formatTime(
                data.lastUpdated
            );



        connectionStatusText.textContent =
            "Firebase connected ✅";

    },



    (error) => {

        console.error(error);

        connectionStatusText.textContent =
            "Firebase error: " +
            error.message;
    }

);



// ======================================================
//                 READ HISTORY DATA
// ======================================================

const historyRef =
    ref(
        database,
        "history"
    );


onValue(

    historyRef,

    (snapshot) => {


        const historyData =
            snapshot.val();


        if (!historyData) {

            return;
        }



        // ------------------------------------------------
        // Convert Firebase object into array
        // ------------------------------------------------

        const readings = [];


        Object.keys(historyData).forEach(

            (key) => {


                const reading =
                    historyData[key];


                readings.push({

                    temperature:
                        Number(
                            reading.temperature
                        ),

                    humidity:
                        Number(
                            reading.humidity
                        ),

                    soil:
                        Number(
                            reading.soil
                        ),

                    timestamp:
                        Number(
                            reading.timestamp || 0
                        )

                });

            }
        );



        // ------------------------------------------------
        // Sort old → new
        // ------------------------------------------------

        readings.sort(

            (a, b) =>
                a.timestamp - b.timestamp

        );



        // ------------------------------------------------
        // Last 720 readings only
        // ------------------------------------------------

        const recent =
            readings.slice(-720);



        // ------------------------------------------------
        // Create labels
        // ------------------------------------------------

        const labels =
            recent.map(

                (reading) =>
                    formatTime(
                        reading.timestamp
                    )

            );



        // ------------------------------------------------
        // Temperature values
        // ------------------------------------------------

        const temperatures =
            recent.map(

                (reading) =>
                    reading.temperature

            );



        // ------------------------------------------------
        // Humidity values
        // ------------------------------------------------

        const humidities =
            recent.map(

                (reading) =>
                    reading.humidity

            );



        // ------------------------------------------------
        // Soil values
        // ------------------------------------------------

        const soils =
            recent.map(

                (reading) =>
                    reading.soil

            );



        // =================================================
        //                 UPDATE TEMPERATURE
        // =================================================

        temperatureChart.data.labels =
            labels;


        temperatureChart.data.datasets[0].data =
            temperatures;


        temperatureChart.update();



        // =================================================
        //                   UPDATE HUMIDITY
        // =================================================

        humidityChart.data.labels =
            labels;


        humidityChart.data.datasets[0].data =
            humidities;


        humidityChart.update();



        // =================================================
        //                 UPDATE SOIL
        // =================================================

        soilChart.data.labels =
            labels;


        soilChart.data.datasets[0].data =
            soils;


        soilChart.update();

    },



    (error) => {

        console.error(
            "History error:",
            error
        );

    }

);



// ======================================================
//                CREATE CHARTS FIRST
// ======================================================

createCharts();
