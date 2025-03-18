let selectedAgeGroup = "All Ages"; // Default to all ages
let chartInstance = null;
let storedTestIDs = []; // Store all unique ID_test values from test_measure.csv
let filteredChartInstance = null; // Store the chart instance
let filteredChartInstance2 = null; // Store the chart instance
let vo2Vco2HRChart = null;
let vo2Vco2HRChartSecond = null;
let vo2Vco2HRChartThird = null;
let vo2Vco2HRChartFourth = null;
let averageVEGraph = null;
let individualRRChart = null; // Store the chart instance
var combinedData = [];


let currentGender = null; // Stores the selected gender filter
window.originalRows = []; // Store all data for filtering
window.header = [];

async function loadTestMeasureIDs() {
    try {
        const response = await fetch("test_measure.csv");
        if (!response.ok) throw new Error("❌ Failed to load test_measure.csv");

        const data = await response.text();

        const rows = data.trim().split("\n").map(row => row.split(","));
        const header = rows.shift();


        const idTestIndex = header.indexOf("ID_test");

        if (idTestIndex === -1) throw new Error("❌ 'ID_test' column not found in test_measure.csv");

        // Store all unique `ID_test` values as trimmed strings
        storedTestIDs = [...new Set(rows.map(row => String(row[idTestIndex]).trim()))];


    } catch (error) {
        console.error("❌ Error loading test_measure.csv IDs:", error);
    }
}


async function loadData() {
    try {
        const response = await fetch("subject-info.csv");
        if (!response.ok) throw new Error("Failed to load CSV");

        const data = await response.text();
        const rows = data.trim().split("\n").map(row => row.split(",")); // Parse CSV into array
        const header = rows.shift(); // Remove header row

        // Find column indexes
        const ageIndex = header.indexOf("Age");
        const weightIndex = header.indexOf("Weight");
        const heightIndex = header.indexOf("Height");
        const sexIndex = header.indexOf("Sex");
        const idIndex = header.indexOf("ID");




        // Categorize participants into age groups
        const ageGroups = {
            "10-18": { count: 0, totalWeight: 0, totalHeight: 0, totalbmi: 0, ids: [] },
            "18-30": { count: 0, totalWeight: 0, totalHeight: 0, totalbmi: 0, ids: [] },
            "30-45": { count: 0, totalWeight: 0, totalHeight: 0, totalbmi: 0, ids: [] },
            "45-63": { count: 0, totalWeight: 0, totalHeight: 0, totalbmi: 0, ids: [] },
        };

        

        rows.forEach(row => {
            const age = parseFloat(row[ageIndex]);
            const userID = row[idIndex]?.trim(); // Ensure ID is a string & not undefined
            const weight = parseFloat(row[weightIndex]);
            const height = parseFloat(row[heightIndex]);
            const bmi = calculateBMI(weight, height);



            let group;
            if (age >= 10 && age < 18) group = "10-18";
            else if (age >= 18 && age < 30) group = "18-30";
            else if (age >= 30 && age < 45) group = "30-45";
            else if (age >= 45 && age <= 63) group = "45-63";

            if (group) {
                ageGroups[group].count++;
                ageGroups[group].totalWeight += weight;
                ageGroups[group].totalHeight += height;
                ageGroups[group].totalbmi += bmi;



                // ✅ Ensure testID is stored for filtering
                if (userID) {
                    ageGroups[group].ids.push(userID);
                }
            }
        });



        // Compute averages
        const labels = Object.keys(ageGroups);
        const dataValues = labels.map(group => ageGroups[group].count);
        const avgStats = labels.map(group => {
            const { count, totalWeight, totalHeight, totalbmi } = ageGroups[group];

            return count > 0
            ? [
                `Avg Weight: ${(totalWeight / count).toFixed(1)} kg`,
                `Avg Height: ${(totalHeight / count).toFixed(1)} cm`,
                `Avg BMI: ${(totalbmi / count).toFixed(1)}`
            ]
            : "No Data";
        });




        const testMeasureResponse = await fetch("test_measure.csv");
        if (!testMeasureResponse.ok) throw new Error("Failed to load test_measure.csv");

        const testMeasureData = await testMeasureResponse.text();
        const testMeasureRows1 = testMeasureData.trim().split("\n").map(row => row.split(","));

        const testMeasureRows = testMeasureRows1.filter(row => 
            row.every(value => value !== null && value !== undefined && value.trim() !== "")
        );

        const testMeasureHeader = testMeasureRows.shift().map(header => header.trim()); // ✅ Trim headers






        // Indexes for test measure
        const idTestIndex = testMeasureHeader.indexOf("ID_test");

        const idIndex2 = testMeasureHeader.indexOf("ID");

        const timeIndex = testMeasureHeader.indexOf("time");
        const vo2Index = testMeasureHeader.indexOf("VO2");
        const vco2Index = testMeasureHeader.indexOf("VCO2");
        const hrIndex = testMeasureHeader.indexOf("HR");


        const speedIndex = testMeasureHeader.indexOf("Speed");
        const rrIndex = testMeasureHeader.indexOf("RR");
        const veIndex = testMeasureHeader.indexOf("VE");



        // Prepare data by combining test data with subject info (BMI, weight, height)
        combinedData = [];
        testMeasureRows.forEach(row => {


            const idTest = String(row[idTestIndex] || "").trim();
            const ID = String(row[idIndex2] || "").trim();

            const Time = parseFloat(row[timeIndex]);
            const Vo2 = parseFloat(row[vo2Index]);
            const Vco2 = parseFloat(row[vco2Index]);
            const HR = parseFloat(row[hrIndex]);
            const Speed = parseFloat(row[speedIndex]);
            const RR = parseFloat(row[rrIndex]);
            const VE = parseFloat(row[veIndex]);
            



            const subjectRow = rows.find(subject => subject[7]?.trim() === idTest); 


            if (subjectRow) {

                const Weight = parseFloat(subjectRow[1]);  // Assuming weight is in the second column
                const Height = parseFloat(subjectRow[2]);  // Assuming height is in the third column
                const Age = parseFloat(subjectRow[0]);     // Assuming age is in the fourth column
                const BMI = calculateBMI(Weight, Height)
                const Sex = parseFloat(subjectRow[5]);     // Assuming age is in the fourth column


                combinedData.push({

                    idTest,
                    ID,
                    Time,
                    Vo2,
                    Vco2,
                    HR,
                    Speed,
                    RR,
                    VE,
                    BMI,
                    Weight,
                    Height,
                    Age,
                    Sex
                });
            }

            
        });


        

        window.header = Object.keys(combinedData[0]); 

        const combined2 = combinedData.map(row => {
            return Object.values(row); // Extract the values from the row (object) and put them in an array
        });

        window.originalRows = combined2; 

console.log("✅ Updated window.originalRows:", window.originalRows);
console.log("✅ Updated window.header:", window.header);


console.log(labels)
console.log(dataValues)
console.log(avgStats)
// ✅ Apply filters after updating the global variables
applyFilters();






        // Now combinedData has test and subject data linked
        console.log("Combined Data:", combinedData);



    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// Function to create the pie chart
function renderChart(labels, data, tooltips, ageGroups) {
    const ctx = document.getElementById("agePieChart").getContext("2d");
    let originalColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4CAF50"]; // Default colors


    if (chartInstance) {
        // ✅ Update existing chart instead of re-creating it
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;
        chartInstance.data.datasets[0].backgroundColor = labels.map((label, i) =>
            selectedAgeGroup === "All Ages" ? originalColors[i] :
            label === selectedAgeGroup ? shadeColor(originalColors[i], -30) : originalColors[i]
        );
        chartInstance.update(); // ✅ Instant update without re-rendering
        return;
    }

    

    chartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: labels.map((label, i) => 
                    selectedAgeGroup === "All Ages" ? originalColors[i] : // ✅ Reset colors when "All Ages" is selected
                    label === selectedAgeGroup ? shadeColor(originalColors[i], -30) : originalColors[i]
                ), 
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return tooltips[context.dataIndex];
                        }
                    }
                }
            },
            onClick: async (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const clickedAgeGroup = labels[index];

                    // ✅ If the same age is clicked again, reset to "All Ages"
                    if (selectedAgeGroup === clickedAgeGroup) {
                        selectedAgeGroup = "All Ages";
                    } else {
                        selectedAgeGroup = clickedAgeGroup;
                    }

                    // ✅ Apply both filters together (Gender + Age)
                    applyGenderAndAgeFilters();
                }
            }
        }
    });
}


function applyGenderAndAgeFilters() {


    const filteredRows = window.originalRows.filter(row => {
        const sex = parseInt(row[window.header.indexOf("Sex")]);
        return currentGender === null || sex === currentGender;
    });
    

    const ageGroups = {
        "10-18": { count: 0, ids: [] },
        "18-30": { count: 0, ids: [] },
        "30-45": { count: 0, ids: [] },
        "45-63": { count: 0, ids: [] },
    };

    let validIDs = [];

    filteredRows.forEach(row => {
        const age = parseFloat(row[window.header.indexOf("Age")]);
        const userID = row[window.header.indexOf("ID")];


        let group = null;
        if (age >= 10 && age < 18) group = "10-18";
        else if (age >= 18 && age < 30) group = "18-30";
        else if (age >= 30 && age < 45) group = "30-45";
        else if (age >= 45 && age <= 63) group = "45-63";

        if (group) {
            ageGroups[group].count++;
            ageGroups[group].ids.push(userID);
            validIDs.push(userID);
        }
    });

    const labels = Object.keys(ageGroups);
    const dataValues = labels.map(group => ageGroups[group].count);
    const avgStats = labels.map(group => `Participants: ${ageGroups[group].count}`);

    renderChart(labels, dataValues, avgStats, ageGroups); // ✅ Re-render chart

    // ✅ Apply selected age filter
    if (selectedAgeGroup !== "All Ages") {
        validIDs = ageGroups[selectedAgeGroup]?.ids || [];
    }

    // ✅ Normalize test IDs
    const normalizedTestIDs = storedTestIDs.map(id => id.replace(/_1$/, ""));
    const matchingIDs = normalizedTestIDs.filter(id => validIDs.includes(id));

    // ✅ Filter dataset based on IDs
    if (matchingIDs.length > 0) {
        filterAndDisplayTable(selectedAgeGroup, matchingIDs);
    } else {
        document.getElementById("outputTable").innerHTML = `<p style="color: red;">No matching data found.</p>`;
    }
}







function resetGenderButtons() {
    document.querySelectorAll("#genderFilter button").forEach(btn => btn.classList.remove("active"));
    document.querySelector("#genderFilter button:nth-child(1)").classList.add("active"); // ✅ Set "All" as active
}


async function filterAndDisplayTable(ageGroup, matchingIDs) {
    try {



        const header = Object.keys(combinedData[0]); // Get the keys of the first object in combinedData
        const rows = combinedData.map(row => {
            return Object.values(row); // Extract the values from the row (object) and put them in an array
        });

        console.log("ok", header)



        const timeIndex = header.indexOf("Time");
        const idTestIndex = header.indexOf("ID");
        

        const speedIndex = header.indexOf("Speed");
        const hrIndex = header.indexOf("HR");
        const vo2Index = header.indexOf("Vo2");
        const vco2Index = header.indexOf("Vco2");
        const rrIndex = header.indexOf("RR");
        const veIndex = header.indexOf("VE");

        const HeightIndex = header.indexOf("Height");
        const WeightIndex = header.indexOf("Weight");
        const BMIIndex = header.indexOf("BMI");
        const AgeIndex = header.indexOf("Age");

    




        // 🔍 Log `matchingIDs` before filtering
        const formattedMatchingIDs = matchingIDs.map(id => String(id).trim());



        // ✅ Filter rows that have an `ID_test` matching `matchingIDs`
        const filteredRows = rows.filter(row => formattedMatchingIDs.includes(String(row[idTestIndex]).trim()));

        console.log("filtered", filteredRows)
        



        console.log(`✅ Found ${filteredRows.length} matching rows for ${ageGroup}`);

        if (filteredRows.length === 0) {
            document.getElementById("outputTable").innerHTML = `<p style="color: red;">No matching data found for selected age group.</p>`;
            return;
        }



        let groupedData = d3.groups(filteredRows, d => d[idTestIndex])
        .map(([id, records]) => {
            // ✅ Ensure `records` is an array before processing
            if (!Array.isArray(records) || records.length === 0) {
                console.warn(`⚠️ Skipping ID ${id}: No valid records found.`);
                return null; // Return null so it can be filtered out
            }
    
            return [
                id, 
                isNaN(d3.mean(records, d => parseFloat(d[speedIndex]))) ? "N/A" : d3.mean(records, d => parseFloat(d[speedIndex])).toFixed(2),
                isNaN(d3.mean(records, d => parseFloat(d[hrIndex]))) ? "N/A" : d3.mean(records, d => parseFloat(d[hrIndex])).toFixed(2),
                isNaN(d3.mean(records, d => parseFloat(d[vo2Index]))) ? "N/A" : d3.mean(records, d => parseFloat(d[vo2Index])).toFixed(2),
                isNaN(d3.mean(records, d => parseFloat(d[vco2Index]))) ? "N/A" : d3.mean(records, d => parseFloat(d[vco2Index])).toFixed(2),
                isNaN(d3.mean(records, d => parseFloat(d[rrIndex]))) ? "N/A" : d3.mean(records, d => parseFloat(d[rrIndex])).toFixed(2),
                isNaN(d3.mean(records, d => parseFloat(d[veIndex]))) ? "N/A" : d3.mean(records, d => parseFloat(d[veIndex])).toFixed(2),


                records[0][AgeIndex] ? records[0][AgeIndex] : "N/A",
                records[0][BMIIndex] ? parseFloat(records[0][BMIIndex]).toFixed(2) : "N/A"
            ];
        }).filter(d => d !== null); // ✅ Remove null values
    







        console.log(groupedData)


        // ✅ Display the first 20 matching rows
        const displayedRows = groupedData.slice(0,50);




// ✅ Define correct table headers matching groupedData structure
const tableHeaders = ["ID", "Mean Speed", "Mean HR", "Mean VO2", "Mean VCO2", "Mean RR", "Mean VE", "Age", "BMI"];

let tableHTML = "<table border='1'><thead><tr>";
tableHTML += tableHeaders.map(col => `<th>${col}</th>`).join(""); // ✅ Use correct headers
tableHTML += "</tr></thead><tbody>";

// ✅ Ensure displayedRows is an array of arrays before rendering
displayedRows.forEach(row => {
    if (!Array.isArray(row)) {
        console.error("❌ ERROR: Row is not an array!", row);
        return;
    }

    tableHTML += `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`;
});

tableHTML += "</tbody></table>";
document.getElementById("outputTable").innerHTML = tableHTML;




// ✅ Compute Average Speed and HR for Each Time Step




        let timeMap = {};
        let individualRRData = {};


        filteredRows.forEach(row => {
            const time = parseFloat(row[timeIndex]) || 0;
            const hr = parseFloat(row[hrIndex]) || 0;
            const speed = parseFloat(row[speedIndex]) || 0;
            const vo2 = parseFloat(row[vo2Index]) || 0;
            const vco2 = parseFloat(row[vco2Index]) || 0;
            const rr = parseFloat(row[rrIndex]) || 0;
            const ve = parseFloat(row[veIndex]) || 0;


            const id = row[idTestIndex]?.trim();



            if (!timeMap[time]) {
                timeMap[time] = { totalHR: 0, totalSpeed: 0, count: 0, totalVO2: 0, totalVCO2: 0, totalVE: 0 };
            }

            timeMap[time].totalHR += hr;
            timeMap[time].totalSpeed += speed;
            timeMap[time].count += 1;
            timeMap[time].totalVO2 += vo2;
            timeMap[time].totalVCO2 += vco2;
            timeMap[time].totalVE += ve;




            if (!individualRRData[id]) {
                individualRRData[id] = [];
            }

            individualRRData[id].push({ time, rr });

        });

        console.log('timemap', timeMap)


        // ✅ Convert timeMap to sorted arrays
        const sortedTimes = Object.keys(timeMap).map(t => parseFloat(t)).sort((a, b) => a - b);
        const avgHR = sortedTimes.map(t => timeMap[t].totalHR / timeMap[t].count);
        const avgSpeed = sortedTimes.map(t => timeMap[t].totalSpeed / timeMap[t].count);
        const avgVO2 = sortedTimes.map(t => timeMap[t].totalVO2 / timeMap[t].count);
        const avgVCO2 = sortedTimes.map(t => timeMap[t].totalVCO2 / timeMap[t].count);
        const avgVE = sortedTimes.map(t => timeMap[t].totalVCO2 / timeMap[t].count);



        Object.keys(individualRRData).forEach(id => {
            individualRRData[id].sort((a, b) => a.time - b.time);
        });

        const participantIDs = Object.keys(individualRRData).slice(0, 5); 

const timeSeriesData = participantIDs.map(id => ({
    label: `Participant ${id}`,
    data: individualRRData[id].map(entry => ({ x: entry.time, y: entry.rr })),
    borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`, // Random color for each participant
    borderWidth: 1,
    pointRadius: 0, // No points, just lines
    fill: false



}));


        


        renderFilteredChart(sortedTimes, avgHR, avgSpeed);
        renderVCO2VO2SpeedChart(sortedTimes, avgVO2, avgVCO2, avgSpeed);
        renderAverageVEGraph(filteredRows);





//       renderIndividualRRGraph(timeSeriesData);

        renderVO2VCO2HRChart(filteredRows);
        renderVO2VCO2HRChartSecondParticipant(filteredRows);
        renderVO2VCO2HRChartThirdParticipant(filteredRows);
        renderVO2VCO2HRChartFourthParticipant(filteredRows);



    } catch (error) {
        console.error("❌ Error filtering test_measure data:", error);
        document.getElementById("outputTable").innerHTML = `<p style="color: red;">Error loading data.</p>`;
    }

}


const crosshairPlugin = {
    id: 'crosshair',
    afterDraw: (chart, args, options) => {
        if (!chart.tooltip || !chart.tooltip._active || chart.tooltip._active.length === 0) return;
        
        const ctx = chart.ctx;
        const tooltip = chart.tooltip;
        const x = tooltip._active[0].element.x; // Get the x-coordinate of the hovered point
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, chart.chartArea.top); // Start from the top
        ctx.lineTo(x, chart.chartArea.bottom); // Draw to the bottom
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)"; // Dotted line color
        ctx.setLineDash([5, 5]); // Make it a dashed line
        ctx.stroke();
        ctx.restore();
    }
};


function renderFilteredChart(time, avgHR, avgSpeed) {
    console.log("📊 Attempting to Render Chart...");

    const ctx = document.getElementById("filteredChart");
    


    if (filteredChartInstance) {
        // ✅ Update existing chart instead of re-creating it
        filteredChartInstance.data.labels = time;
        filteredChartInstance.data.datasets[0].data = avgHR;
        filteredChartInstance.data.datasets[1].data = avgSpeed;
        filteredChartInstance.update();
        return;
    }

    console.log("📊 Rendering Chart with Data:");
    console.log("📊 Time:", time);
    console.log("📊 Average HR for Each Time:", avgHR);
    console.log("📊 Average Speed for Each Time:", avgSpeed);

    filteredChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: time, // X-Axis: Time
            datasets: [
                {
                    label: "Average Heart Rate (HR)",
                    data: avgHR,
                    borderColor: "#FF5733",
                    backgroundColor: "rgba(255, 87, 51, 0.2)",
                    borderWidth: 2,
                    pointRadius: 1,
                    hoverRadius: 5, // ✅ Make points larger when hovered

                    fill: false
                },
                {
                    label: "Average Speed (km/h)",
                    data: avgSpeed,
                    borderColor: "#33FF57",
                    backgroundColor: "rgba(51, 255, 87, 0.2)",
                    borderWidth: 2,
                    pointRadius: 1,
                    hoverRadius: 5, // ✅ Make points larger when hovered

                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Time (seconds)",
                        font: {
                            size: 16
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Average HR & Speed",
                        font: {
                            size: 16
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 16
                        }
                    }
                },
                tooltip: {
                    enabled: true, // ✅ Ensure tooltips work
                    intersect: false // ✅ Allow hovering between points
                },
                crosshair: {}
            },
            hover: {
                intersect: false // ✅ Prevent hover only working on one dataset
            }
        },
        plugins: [crosshairPlugin] // ✅ Register the plugin

    });
    

    console.log("✅ Chart Successfully Rendered!");
}




function renderVCO2VO2SpeedChart(time, avgVO2, avgVCO2) {
    console.log("📊 Rendering VCO2, VO2 Chart...");

    const ctx = document.getElementById("vco2Vo2SpeedChart");


    if (filteredChartInstance2) {
        // ✅ Update existing chart instead of re-creating it
        filteredChartInstance2.data.labels = time;
        filteredChartInstance2.data.datasets[0].data = avgVO2;
        filteredChartInstance2.data.datasets[1].data = avgVCO2;
        filteredChartInstance2.update();
        return;
    }
    filteredChartInstance2 = new Chart(ctx, {
        type: "line",
        data: {
            labels: time, // X-Axis: Time
            datasets: [
                {
                    label: "Average VO2",
                    data: avgVO2,
                    borderColor: "#FFD700",
                    backgroundColor: "rgba(187, 121, 15, 0.2)",
                    borderWidth: 2,
                    pointRadius: 1,
                    hoverRadius: 5,
                    fill: false
                },
                {
                    label: "Average VCO2",
                    data: avgVCO2,
                    borderColor: "#FFA500",
                    backgroundColor: "rgba(216, 234, 27, 0.2)",
                    borderWidth: 2,
                    pointRadius: 1,
                    hoverRadius: 5,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Time (seconds)",
                        font: {
                            size: 16
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Average VO2 & VCO2",
                        font: {
                            size: 16
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 16
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    intersect: false
                },
                crosshair:{}
            },
            hover: {
                intersect: false
            }
        },
        plugins: [crosshairPlugin] // ✅ Register the plugin

    });

    console.log("✅ VCO2, VO2 Chart Successfully Rendered!");
}



function renderAverageVEGraph(filteredRows) {
    console.log("📊 Rendering Average Pulmonary Ventilation (VE) Graph...");

    const ctx = document.getElementById("averageVEGraph");
    if (!ctx) {
        console.error("❌ ERROR: Canvas element for Average VE chart not found!");
        return;
    }

    if (window.averageVEChart instanceof Chart) {
        window.averageVEChart.destroy();
    }

    // ✅ Column indexes based on known order
    const timeIndex = 2; // Time column index
    const veIndex = 8;   // VE (Pulmonary Ventilation) column index

    let timeMap = {}; // Stores sum of VE and count per time step

    // ✅ Aggregate VE over time
    filteredRows.forEach(row => {
        const time = parseFloat(row[timeIndex]);
        const ve = parseFloat(row[veIndex]);

        if (!isNaN(time) && !isNaN(ve)) {
            if (!timeMap[time]) {
                timeMap[time] = { totalVE: 0, count: 0 };
            }
            timeMap[time].totalVE += ve;
            timeMap[time].count += 1;
        }
    });

    // ✅ Compute average VE per time step
    const sortedTimes = Object.keys(timeMap).map(t => parseFloat(t)).sort((a, b) => a - b);
    const avgVE = sortedTimes.map(time => timeMap[time].totalVE / timeMap[time].count);

    // ✅ Prepare dataset
    let dataset = {
        label: "Average VE Over Time",
        data: sortedTimes.map((time, i) => ({ x: time, y: avgVE[i] })),
        borderColor: "blue",
        borderWidth: 2,
        pointRadius: 0, // ✅ Remove points for smooth line
        hoverRadius: 5,
        fill: false
    };

    // ✅ Render chart
    window.averageVEChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: sortedTimes, // X-Axis: Time
            datasets: [
                {
                    label: "Average Pulmonary Ventilation (VE)",
                    data: avgVE,
                    borderColor: "#3366CC",
                    backgroundColor: "rgba(61, 121, 240, 0.2)",
                    borderWidth: 2,
                    pointRadius: 1, // ✅ Show small points
                    hoverRadius: 5,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Time (seconds)",
                        font: { size: 16 }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Average VE (L/min)",
                        font: { size: 16 }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: { size: 16 }
                    }
                },
                tooltip: {
                    enabled: true,
                    intersect: false
                },
                crosshair:{}
            },
            hover: { intersect: false }
        },
        plugins: [crosshairPlugin] // ✅ Register the plugin

    });

    console.log("✅ Average VE Graph Successfully Rendered!");
}









function renderVCO2VO2SpeedChart(time, avgVO2, avgVCO2) {
    console.log("📊 Rendering VCO2, VO2 Chart...");

    const ctx = document.getElementById("vco2Vo2SpeedChart");


    if (filteredChartInstance2) {
        // ✅ Update existing chart instead of re-creating it
        filteredChartInstance2.data.labels = time;
        filteredChartInstance2.data.datasets[0].data = avgVO2;
        filteredChartInstance2.data.datasets[1].data = avgVCO2;
        filteredChartInstance2.update();
        return;
    }
    filteredChartInstance2 = new Chart(ctx, {
        type: "line",
        data: {
            labels: time, // X-Axis: Time
            datasets: [
                {
                    label: "Average VO2",
                    data: avgVO2,
                    borderColor: "#FFD700",
                    backgroundColor: "rgba(255, 87, 51, 0.2)",
                    borderWidth: 2,
                    pointRadius: 1,
                    hoverRadius: 5,
                    fill: false
                },
                {
                    label: "Average VCO2",
                    data: avgVCO2,
                    borderColor: "#FF8C00",
                    backgroundColor: "rgba(51, 255, 87, 0.2)",
                    borderWidth: 2,
                    pointRadius: 1,
                    hoverRadius: 5,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Time (seconds)",
                        font: {
                            size: 16
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Average VO2 & VCO2",
                        font: {
                            size: 16
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 16
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    intersect: false
                },
                crosshair:{}

            },
            hover: {
                intersect: false
            },
        },
        plugins: [crosshairPlugin] // ✅ Register the plugin

    });

    console.log("✅ VCO2, VO2 Chart Successfully Rendered!");
}

function renderIndividualRRGraph(timeSeriesData) {
    console.log("📊 Rendering Individual RR Graph...");

    const ctx = document.getElementById("individualRRChart");


    if (individualRRChart) {
        // ✅ Update existing chart instead of re-creating it
        individualRRChart.data.datasets = timeSeriesData;
        individualRRChart.update();
        return;
    }

    if (!timeSeriesData || timeSeriesData.length === 0) {
        console.warn("⚠️ No RR data available for rendering.");
        return;
    }

    individualRRChart = new Chart(ctx, {
        type: "line",
        data: {
            datasets: timeSeriesData // ✅ Multiple datasets for each participant
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: "linear",
                    title: {
                        display: true,
                        text: "Time (seconds)",
                        font: {
                            size: 16
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Respiratory Rate (RR)",
                        font: {
                            size: 16
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // ✅ Hide legend if too many participants
                },
                tooltip: {
                    enabled: true,
                    intersect: false
                }
            },
            hover: {
                intersect: false
            }
        }
    });

    console.log("✅ Individual RR Graph Successfully Rendered!");
}


function renderVO2VCO2HRChart(filteredRows) {
    console.log("📊 Rendering VO₂/HR & VCO₂/HR Chart for One Participant...");

    const ctx = document.getElementById("vo2Vco2HRChart");
    if (!ctx) {
        console.error("❌ ERROR: Canvas element for VO₂/HR chart not found!");
        return;
    }

    if (vo2Vco2HRChart) {
        vo2Vco2HRChart.destroy();
    }



    // ✅ Column indexes based on known order
    const timeIndex = 2;
    const hrIndex = 5;
    const vo2Index = 3;
    const vco2Index = 4;
    const idIndex = 1;
    const BMIIndex = 9;


    let participantData = {};
    let selectedParticipant = null;

    // ✅ Identify the first unique participant
    for (const row of filteredRows) {
        const participantID = row[idIndex]?.trim();
        if (!participantID) continue;

        if (!selectedParticipant) {
            selectedParticipant = participantID;
            participantData[selectedParticipant] = [];
        }

        // ✅ If this row is for the selected participant, add data
        if (participantID === selectedParticipant) {
            const time = parseFloat(row[timeIndex]);
            const hr = parseFloat(row[hrIndex]);
            const vo2 = parseFloat(row[vo2Index]);
            const vco2 = parseFloat(row[vco2Index]);
            const bmi = parseFloat(row[BMIIndex]);


            if (!isNaN(time) && !isNaN(hr) && hr > 0 && !isNaN(vo2) && !isNaN(vco2)) {
                participantData[selectedParticipant].push({
                    time,
                    vo2_hr: vo2 / hr,
                    vco2_hr: vco2 / hr,
                    bmi
                });

            }
        }
    }

    if (!participantData[selectedParticipant] || participantData[selectedParticipant].length === 0) {
        console.warn("⚠️ No valid data points found. Skipping chart rendering.");
        return;
    }

    let data = participantData[selectedParticipant];
    let bmiValue = data.length > 0 ? data[0].bmi.toFixed(2) : "N/A"; 

    console.log('particopant 1 data', data)

    // ✅ Sort by time
    data.sort((a, b) => a.time - b.time);

    let datasets = [
        {
            label: `VO₂/HR - P${selectedParticipant}`,
            data: data.map(entry => ({ x: entry.time, y: entry.vo2_hr })),
            borderColor: "blue",
            borderWidth: 2,
            pointRadius: 0, // ✅ Remove points
            hoverRadius: 5,
            fill: false
        },
        {
            label: `VCO₂/HR - P${selectedParticipant}`,
            data: data.map(entry => ({ x: entry.time, y: entry.vco2_hr })),
            borderColor: "green",
            borderWidth: 2,
            pointRadius: 0, // ✅ Remove points
            hoverRadius: 5,
            fill: false,
            borderDash: [5, 5] // Dashed line
        }
    ];

    vo2Vco2HRChart = new Chart(ctx, {
        type: "line",
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            elements: { point: { radius: 0 } },
            scales: {
                x: {
                    type: "linear",
                    title: { display: true, text: "Time (seconds)", font: { size: 16 } }
                },
                y: {
                    title: { display: true, text: "VO₂/HR & VCO₂/HR Ratio", font: { size: 16 } }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Participant ${selectedParticipant }`,
                    font: { size: 18 },
                    padding: { bottom: 5 }
                },
                subtitle: {
                    display: true,
                    text: `BMI: ${bmiValue}`, // ✅ Show BMI Below Title
                    font: { size: 14, style: "italic" },
                    padding: { top: 2, bottom: 10 }
                },
                legend: { labels: { font: { size: 14 } } },
                tooltip: { enabled: true, intersect: false },
                crosshair:{}
                
            },
            hover: { intersect: false }
        },
        plugins: [crosshairPlugin] // ✅ Register the plugin

    });

    console.log("✅ VO₂/HR & VCO₂/HR Chart for One Participant Successfully Rendered!");
}



function renderVO2VCO2HRChartSecondParticipant(filteredRows) {
    console.log("📊 Rendering VO₂/HR & VCO₂/HR Chart for Second Participant...");

    const ctx = document.getElementById("vo2Vco2HRChartSecond");
    if (!ctx) {
        console.error("❌ ERROR: Canvas element for VO₂/HR chart (Second Participant) not found!");
        return;
    }

    if (window.vo2Vco2HRChartSecond instanceof Chart) {
        window.vo2Vco2HRChartSecond.destroy();
    }

    // ✅ Column indexes based on known order
    const timeIndex = 2;
    const hrIndex = 5;
    const vo2Index = 3;
    const vco2Index = 4;
    const BMIIndex = 9;

    const idIndex = 1;


    let participantData = {};
    let uniqueParticipants = new Set();
    let selectedParticipant = null;

    // ✅ Identify the second unique participant
    for (const row of filteredRows) {
        const participantID = row[idIndex]?.trim();
        if (!participantID) continue;

        if (!uniqueParticipants.has(participantID)) {
            uniqueParticipants.add(participantID);
        }

        // ✅ Select the second participant only
        if (uniqueParticipants.size === 2 && !selectedParticipant) {
            selectedParticipant = participantID;
            participantData[selectedParticipant] = [];
        }

        if (participantID === selectedParticipant) {
            const time = parseFloat(row[timeIndex]);
            const hr = parseFloat(row[hrIndex]);
            const vo2 = parseFloat(row[vo2Index]);
            const vco2 = parseFloat(row[vco2Index]);
            const bmi = parseFloat(row[BMIIndex]);


            if (!isNaN(time) && !isNaN(hr) && hr > 0 && !isNaN(vo2) && !isNaN(vco2)) {
                participantData[selectedParticipant].push({
                    time,
                    vo2_hr: vo2 / hr,
                    vco2_hr: vco2 / hr,
                    bmi
                });

            }
        }
    }

    if (!participantData[selectedParticipant] || participantData[selectedParticipant].length === 0) {
        console.warn("⚠️ No valid data points found for the second participant. Skipping chart rendering.");
        return;
    }

    let data = participantData[selectedParticipant];
    let bmiValue = data.length > 0 ? data[0].bmi.toFixed(2) : "N/A"; 


    // ✅ Sort by time
    data.sort((a, b) => a.time - b.time);

    let datasets = [
        {
            label: `VO₂/HR - P${selectedParticipant}`,
            data: data.map(entry => ({ x: entry.time, y: entry.vo2_hr })),
            borderColor: "red", // Different color from first participant
            borderWidth: 2,
            pointRadius: 0, // ✅ Remove points
            hoverRadius: 5,
            fill: false
        },
        {
            label: `VCO₂/HR - P${selectedParticipant}`,
            data: data.map(entry => ({ x: entry.time, y: entry.vco2_hr })),
            borderColor: "purple", // Different color from first participant
            borderWidth: 2,
            pointRadius: 0, // ✅ Remove points
            hoverRadius: 5,
            fill: false,
            borderDash: [5, 5] // Dashed line
        }
    ];

    window.vo2Vco2HRChartSecond = new Chart(ctx, {
        type: "line",
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            elements: { point: { radius: 0 } },
            scales: {
                x: {
                    type: "linear",
                    title: { display: true, text: "Time (seconds)", font: { size: 16 } }
                },
                y: {
                    title: { display: true, text: "VO₂/HR & VCO₂/HR Ratio", font: { size: 16 } }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Participant ${selectedParticipant }`,
                    font: { size: 18 },
                    padding: { bottom: 5 }
                },
                subtitle: {
                    display: true,
                    text: `BMI: ${bmiValue}`, // ✅ Show BMI Below Title
                    font: { size: 14, style: "italic" },
                    padding: { top: 2, bottom: 10 }
                },
                legend: { labels: { font: { size: 14 } } },
                tooltip: { enabled: true, intersect: false },
                crosshair:{}
            },
            hover: { intersect: false }
        },
        plugins: [crosshairPlugin] // ✅ Register the plugin

    });

    console.log("✅ VO₂/HR & VCO₂/HR Chart for Second Participant Successfully Rendered!");
}


function renderVO2VCO2HRChartThirdParticipant(filteredRows) {
    console.log("📊 Rendering VO₂/HR & VCO₂/HR Chart for Third Participant...");

    const ctx = document.getElementById("vo2Vco2HRChartThird");
    if (!ctx) {
        console.error("❌ ERROR: Canvas element for VO₂/HR chart (Third Participant) not found!");
        return;
    }

    // ✅ Ensure the chart exists before destroying it
    if (window.vo2Vco2HRChartThird instanceof Chart) {
        window.vo2Vco2HRChartThird.destroy();
    }

    // ✅ Column indexes based on known order
    const timeIndex = 2;
    const hrIndex = 5;
    const vo2Index = 3;
    const vco2Index = 4;
    const idIndex = 1;
    const BMIIndex = 9;


    let participantData = {};
    let uniqueParticipants = new Set();
    let selectedParticipant = null;


    // ✅ Identify the third unique participant
    for (const row of filteredRows) {
        const participantID = row[idIndex]?.trim();
        if (!participantID) continue;

        if (!uniqueParticipants.has(participantID)) {
            uniqueParticipants.add(participantID);
        }

        // ✅ Select the third participant only
        if (uniqueParticipants.size === 3 && !selectedParticipant) {
            selectedParticipant = participantID;
            participantData[selectedParticipant] = [];
        }

        if (participantID === selectedParticipant) {
            const time = parseFloat(row[timeIndex]);
            const hr = parseFloat(row[hrIndex]);
            const vo2 = parseFloat(row[vo2Index]);
            const vco2 = parseFloat(row[vco2Index]);
            const bmi = parseFloat(row[BMIIndex]);


            if (!isNaN(time) && !isNaN(hr) && hr > 0 && !isNaN(vo2) && !isNaN(vco2)) {
                participantData[selectedParticipant].push({
                    time,
                    vo2_hr: vo2 / hr,
                    vco2_hr: vco2 / hr,
                    bmi
                });

            }
        }
    }

    if (!participantData[selectedParticipant] || participantData[selectedParticipant].length === 0) {
        console.warn("⚠️ No valid data points found for the third participant. Skipping chart rendering.");
        return;
    }

    let data = participantData[selectedParticipant];
    let bmiValue = data.length > 0 ? data[0].bmi.toFixed(2) : "N/A"; 


    // ✅ Sort by time
    data.sort((a, b) => a.time - b.time);

    let datasets = [
        {
            label: `VO₂/HR - P${selectedParticipant}`,
            data: data.map(entry => ({ x: entry.time, y: entry.vo2_hr })),
            borderColor: "orange", // Different color for third participant
            borderWidth: 2,
            pointRadius: 0, // ✅ Remove points
            hoverRadius: 5,
            fill: false
        },
        {
            label: `VCO₂/HR - P${selectedParticipant}`,
            data: data.map(entry => ({ x: entry.time, y: entry.vco2_hr })),
            borderColor: "brown", // Different color for third participant
            borderWidth: 2,
            pointRadius: 0, // ✅ Remove points
            hoverRadius: 5,
            fill: false,
            borderDash: [5, 5] // Dashed line
        }
    ];

    window.vo2Vco2HRChartThird = new Chart(ctx, {
        type: "line",
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            elements: { point: { radius: 0 } },
            scales: {
                x: {
                    type: "linear",
                    title: { display: true, text: "Time (seconds)", font: { size: 16 } }
                },
                y: {
                    title: { display: true, text: "VO₂/HR & VCO₂/HR Ratio", font: { size: 16 } }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Participant ${selectedParticipant }`,
                    font: { size: 18 },
                    padding: { bottom: 5 }
                },
                subtitle: {
                    display: true,
                    text: `BMI: ${bmiValue}`, // ✅ Show BMI Below Title
                    font: { size: 14, style: "italic" },
                    padding: { top: 2, bottom: 10 }
                },
                legend: { labels: { font: { size: 14 } } },
                tooltip: { enabled: true, intersect: false },
                crosshair:{}
            },
            hover: { intersect: false }
        },
        plugins: [crosshairPlugin] // ✅ Register the plugin

    });

    console.log("✅ VO₂/HR & VCO₂/HR Chart for Third Participant Successfully Rendered!");
}

function renderVO2VCO2HRChartFourthParticipant(filteredRows) {
    console.log("📊 Rendering VO₂/HR & VCO₂/HR Chart for Fourth Participant...");

    const ctx = document.getElementById("vo2Vco2HRChartFourth");
    if (!ctx) {
        console.error("❌ ERROR: Canvas element for VO₂/HR chart (Fourth Participant) not found!");
        return;
    }

    // ✅ Ensure the chart exists before destroying it
    if (window.vo2Vco2HRChartFourth instanceof Chart) {
        window.vo2Vco2HRChartFourth.destroy();
    }

    // ✅ Column indexes based on known order
    const timeIndex = 2;
    const hrIndex = 5;
    const vo2Index = 3;
    const vco2Index = 4;
    const BMIIndex = 9;
    const idIndex = 1;

    let participantData = {};
    let uniqueParticipants = new Set();
    let selectedParticipant = null;

    // ✅ Identify the fourth unique participant
    for (const row of filteredRows) {
        const participantID = row[idIndex]?.trim();
        if (!participantID) continue;

        if (!uniqueParticipants.has(participantID)) {
            uniqueParticipants.add(participantID);
        }

        // ✅ Select the fourth participant only
        if (uniqueParticipants.size === 4 && !selectedParticipant) {
            selectedParticipant = participantID;
            participantData[selectedParticipant] = [];
        }

        if (participantID === selectedParticipant) {
            const time = parseFloat(row[timeIndex]);
            const hr = parseFloat(row[hrIndex]);
            const vo2 = parseFloat(row[vo2Index]);
            const vco2 = parseFloat(row[vco2Index]);
            const bmi = parseFloat(row[BMIIndex]);

            if (!isNaN(time) && !isNaN(hr) && hr > 0 && !isNaN(vo2) && !isNaN(vco2)) {
                participantData[selectedParticipant].push({
                    time,
                    vo2_hr: vo2 / hr,
                    vco2_hr: vco2 / hr,
                    bmi
                });

            }
        }
    }

    if (!participantData[selectedParticipant] || participantData[selectedParticipant].length === 0) {
        console.warn("⚠️ No valid data points found for the fourth participant. Skipping chart rendering.");
        return;
    }

    let data = participantData[selectedParticipant];
    let bmiValue = data.length > 0 ? data[0].bmi.toFixed(2) : "N/A"; 


    console.log("realshit", data);

    // ✅ Sort by time
    data.sort((a, b) => a.time - b.time);

    let datasets = [
        {
            label: `VO₂/HR - P${selectedParticipant}`,
            data: data.map(entry => ({ x: entry.time, y: entry.vo2_hr })),
            borderColor: "purple", // Different color for fourth participant
            borderWidth: 2,
            pointRadius: 0, // ✅ Remove points
            hoverRadius: 5,
            fill: false
        },
        {
            label: `VCO₂/HR - P${selectedParticipant}`,
            data: data.map(entry => ({ x: entry.time, y: entry.vco2_hr })),
            borderColor: "pink", // Different color for fourth participant
            borderWidth: 2,
            pointRadius: 0, // ✅ Remove points
            hoverRadius: 5,
            fill: false,
            borderDash: [5, 5] // Dashed line
        }
    ];

    window.vo2Vco2HRChartFourth = new Chart(ctx, {
        type: "line",
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            elements: { point: { radius: 0 } },
            scales: {
                x: {
                    type: "linear",
                    title: { display: true, text: "Time (seconds)", font: { size: 16 } }
                },
                y: {
                    title: { display: true, text: "VO₂/HR & VCO₂/HR Ratio", font: { size: 16 } }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Participant ${selectedParticipant }`,
                    font: { size: 18 },
                    padding: { bottom: 5 }
                },
                subtitle: {
                    display: true,
                    text: `BMI: ${bmiValue}`, // ✅ Show BMI Below Title
                    font: { size: 14, style: "italic" },
                    padding: { top: 2, bottom: 10 }
                },
                legend: { labels: { font: { size: 14 } } },
                tooltip: { enabled: true, intersect: false },
                crosshair:{}
            },
            hover: { intersect: false }
        },
        plugins: [crosshairPlugin] // ✅ Register the plugin

    });

    console.log("✅ VO₂/HR & VCO₂/HR Chart for Fourth Participant Successfully Rendered!");
}








function applyFilters() {
    if (!window.originalRows) return;

    // ✅ Categorize participants into age groups
    const ageGroups = {
        "All Ages": { count: window.originalRows.length, totalWeight: 0, totalHeight: 0, ids: [] },

        "10-18": { count: 0, totalWeight: 0, totalHeight: 0, totalbmi: 0, ids: [] },
        "18-30": { count: 0, totalWeight: 0, totalHeight: 0, totalbmi: 0, ids: [] },
        "30-45": { count: 0, totalWeight: 0, totalHeight: 0, totalbmi: 0, ids: [] },
        "45-63": { count: 0, totalWeight: 0, totalHeight: 0, totalbmi: 0, ids: [] },
    };

    window.originalRows.forEach(row => {


        const age = parseFloat(row[window.header.indexOf("Age")]);




        const weight = parseFloat(row[window.header.indexOf("Weight")]);
        const height = parseFloat(row[window.header.indexOf("Height")]);
        const sex = parseInt(row[window.header.indexOf("Sex")]); // Gender column
        const userID = row[window.header.indexOf("ID")];
        const bmi = calculateBMI(weight, height);




        // ✅ First, categorize by age
        let group = null;
        if (age >= 10 && age < 18) group = "10-18";
        else if (age >= 18 && age < 30) group = "18-30";
        else if (age >= 30 && age < 45) group = "30-45";
        else if (age >= 45 && age <= 63) group = "45-63";

        // ✅ Second, apply gender filter AFTER age filter
        if (group && (currentGender === null || sex === currentGender)) {
            ageGroups[group].count++;
            ageGroups[group].totalWeight += weight;
            ageGroups[group].totalHeight += height;
            ageGroups[group].totalbmi += bmi;
            ageGroups[group].ids.push(userID);
        }

        ageGroups["All Ages"].ids.push(userID); // ✅ Add all IDs to "All Ages"

    });

    // ✅ Compute averages
    const labels = Object.keys(ageGroups).filter(label => label !== "All Ages"); // Exclude "All Ages" from pie chart
    const dataValues = labels.map(group => ageGroups[group].count);
    const avgStats = labels.map(group => {
        const { count, totalWeight, totalHeight, totalbmi } = ageGroups[group];
        return count > 0
        ? [
            `Avg Weight: ${(totalWeight / count).toFixed(1)} kg`,
            `Avg Height: ${(totalHeight / count).toFixed(1)} cm`,
            `Avg BMI: ${(totalbmi / count).toFixed(1)}`
        ]
        : "No Data";
    });

    console.log(avgStats)





    // ✅ Render the updated chart
    renderChart(labels, dataValues, avgStats, ageGroups);

    selectedAgeGroup = "All Ages";

}


function filterByGender(gender) {
    currentGender = gender; // Update global gender filter



        // ✅ Remove 'active' class from all buttons
        document.querySelectorAll("#genderFilter button").forEach(btn => btn.classList.remove("active"));

        // ✅ Add 'active' class to the selected button
        if (gender === null) {
            document.querySelector("#genderFilter button:nth-child(1)").classList.add("active"); // "All"
        } else if (gender === 0) {
            document.querySelector("#genderFilter button:nth-child(2)").classList.add("active"); // "Male"
        } else if (gender === 1) {
            document.querySelector("#genderFilter button:nth-child(3)").classList.add("active"); // "Female"
        }
        selectedAgeGroup = "All Ages";


        applyGenderAndAgeFilters();

        if (chartInstance) {
            let originalColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4CAF50"]; // Default colors
            chartInstance.data.datasets[0].backgroundColor = [...originalColors]; // ✅ Reset colors
            chartInstance.update();
        }

    // ✅ First, filter dataset by gender
    const filteredRows = window.originalRows.filter(row => {
        const sex = parseInt(row[window.header.indexOf("Sex")]);
        return gender === null || sex === gender; // Keep only selected gender
    });

    // ✅ Now, categorize by age
    const ageGroups = {
        "10-18": { count: 0, totalWeight: 0, totalHeight: 0, totalbmi: 0, ids: [] },
        "18-30": { count: 0, totalWeight: 0, totalHeight: 0, totalbmi: 0, ids: [] },
        "30-45": { count: 0, totalWeight: 0, totalHeight: 0, totalbmi: 0, ids: [] },
        "45-63": { count: 0, totalWeight: 0, totalHeight: 0, totalbmi: 0, ids: [] },
    };

    let validIDs = [];

    filteredRows.forEach(row => {
        const age = parseFloat(row[window.header.indexOf("Age")]);
        const weight = parseFloat(row[window.header.indexOf("Weight")]);
        const height = parseFloat(row[window.header.indexOf("Height")]);
        const bmi = calculateBMI(weight, height);
        const userID = row[window.header.indexOf("ID")];

        let group = null;
        if (age >= 10 && age < 18) group = "10-18";
        else if (age >= 18 && age < 30) group = "18-30";
        else if (age >= 30 && age < 45) group = "30-45";
        else if (age >= 45 && age <= 63) group = "45-63";

        if (group) {
            ageGroups[group].count++;
            ageGroups[group].totalWeight += weight;
            ageGroups[group].totalHeight += height;
            ageGroups[group].totalbmi += bmi;
            ageGroups[group].ids.push(userID);
            validIDs.push(userID);
        }
    });

    // ✅ Compute new chart data
    const labels = Object.keys(ageGroups);
    const dataValues = labels.map(group => ageGroups[group].count);
    const avgStats = labels.map(group => {
        const { count, totalWeight, totalHeight, totalbmi } = ageGroups[group];
        
        return count > 0
        ? [
            `Avg Weight: ${(totalWeight / count).toFixed(1)} kg`,
            `Avg Height: ${(totalHeight / count).toFixed(1)} cm`,
            `Avg BMI: ${(totalbmi / count).toFixed(1)}`
        ]
        : "No Data";
    });

    // ✅ Render the pie chart with the filtered gender data
    renderChart(labels, dataValues, avgStats, ageGroups);
    // ✅ Reset selected age group to "All Ages"
    selectedAgeGroup = "All Ages";

    // ✅ Normalize test IDs for matching
    const normalizedTestIDs = storedTestIDs.map(id => id.replace(/_1$/, ""));
    const matchingIDs = normalizedTestIDs.filter(id => validIDs.includes(id));

    // ✅ Now filter the dataset based on these IDs
    if (matchingIDs.length > 0) {
        filterAndDisplayTable("Gender Filter", matchingIDs);
    } else {
        document.getElementById("outputTable").innerHTML = `<p style="color: red;">No matching data found for selected gender.</p>`;
    }


    const textElement = document.getElementById("dynamic-text");

    if (gender === null) {
        textElement.textContent = "Apart from age, gender plays a huge role in athletic performace. Women and Men are physiologically very different, so its important to remember the differences. ";
    } else if (gender === 0) {
        textElement.textContent = "Men often have a larger capacity for better respiratory and cardiovascular fitness. This is because of the amount of testosterone in a man. Apart from this competitive advantage, we do not see any special trends splitting this group, apart from gaining strength and fitness after puberty";
    } else if (gender === 1) {
        textElement.textContent = "Women often have a harder time reaching the competitive fitness levels men do. A few physiological factors contribute to this, but also to the wide difference of age dissimilarity between women. There is a large difference between cardiovascular and respiratory trends for women in differenct age groups.";
    }

    // ✅ Update UI for active button styling
    document.querySelectorAll("#genderFilter button").forEach(btn => btn.classList.remove("active"));
    document.querySelector(`#genderFilter button:nth-child(${gender === null ? 1 : gender + 2})`).classList.add("active");


}



function shadeColor(color, percent) {
    let f = parseInt(color.slice(1), 16),
        t = percent < 0 ? 0 : 255,
        p = Math.abs(percent) / 60, // Darkening effect
        R = f >> 16,
        G = (f >> 8) & 0x00FF,
        B = f & 0x0000FF;
    return `rgb(${Math.round((t - R) * p + R)}, ${Math.round((t - G) * p + G)}, ${Math.round((t - B) * p + B)})`;
}


function calculateBMI(weight, height) {
    if (isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0) {
        return 0;  // Return a default value if data is invalid
    }
    const heightInMeters = height / 100;  // Convert cm to meters
    return weight / (heightInMeters * heightInMeters);  // BMI formula
}







document.getElementById("toggleTableBtn").addEventListener("click", function() {
    const sidebar = document.getElementById("tableSidebar");
    if (sidebar.style.left === "0px") {
        sidebar.style.left = "-674px"; // Hide sidebar
        this.style.left = "80px"; // Move button back to original position
        this.textContent = "Expand Data";
    } else {
        sidebar.style.left = "0px"; // Show sidebar
        this.style.left = "754px"; // Move button to the right so it's visible
        this.textContent = "Collapse Data";
    }
});






// 📌 Step 5: Load Data on Page Load
window.onload = async function() {
    await loadTestMeasureIDs(); // Load all `ID_test` values from `test_measure.csv`
    await loadData(); // Load and process `subject-info.csv`
    applyFilters(); // Apply age and gender filters
    centerAndScaleLungs();
    speedControl.addEventListener("input", () => {
        speed = speedControl.value;
        updateSpeeds();
    })
    

};























const speedControl = document.getElementById('speed');
let speed = speedControl.value;

// Get SVG paths
const airway = document.getElementById('airway');
const arteries = document.getElementById('arteries');
const veins = document.getElementById('veins');

// Get particles
const oxygen = document.getElementById('oxygen');
const co2 = document.getElementById('co2');
const blood = document.querySelectorAll('.blood');

// Animation setup
let airwayLength = airway.getTotalLength();
let arteriesLength = arteries.getTotalLength();
let veinsLength = veins.getTotalLength();

let oxygenPos = 0, co2Pos = airwayLength;
let bloodPos = [0, arteriesLength / 3, (2 * arteriesLength) / 3];

const pathLeft = document.querySelector("#airwayPathLeft");
const particleContainerLeft = document.querySelector("#particlesContainerLeft");
const pathRight = document.querySelector("#airwayPathRight");
const particleContainerRight = document.querySelector("#particlesContainerRight");
var leftParticleIntervals = [];
var rightParticleIntervals = [];
const heartbeat = document.getElementById('heartbeat');
const o2DeficiencyCheckbox = document.getElementById('o2Deficiency');
const gradient = document.getElementById('heartGradient');
const squiggle1 = document.getElementById('squiggle1');
const squiggle2 = document.getElementById('squiggle2');

// Animate particles
function animate() {
    let animationSpeed = 0.5 * speed;

    const isChecked = o2DeficiencyCheckbox.checked;
    if (isChecked)
        animationSpeed /= 4;

    oxygenPos += animationSpeed;
    co2Pos -= animationSpeed;

    if (oxygenPos > airwayLength) oxygenPos = 0;
    if (co2Pos < 0) co2Pos = airwayLength;

    let oxygenPoint = airway.getPointAtLength(oxygenPos);
    oxygen.setAttribute('cx', oxygenPoint.x);
    oxygen.setAttribute('cy', oxygenPoint.y);

    let co2Point = airway.getPointAtLength(co2Pos);
    co2.setAttribute('cx', co2Point.x);
    co2.setAttribute('cy', co2Point.y);

    blood.forEach((particle, i) => {
        bloodPos[i] += animationSpeed;
        if (bloodPos[i] > arteriesLength) bloodPos[i] = 0;
        let point = arteries.getPointAtLength(bloodPos[i]);
        particle.setAttribute('cx', point.x);
        particle.setAttribute('cy', point.y);
    });

    requestAnimationFrame(animate);
}

// Start animations
animate();


function centerAndScaleLungs() {
    let svg = document.querySelector("#diagram");
    let lungs = document.querySelector("#lungs");

    // Get viewBox dimensions
    let viewBoxWidth = svg.viewBox.baseVal.width;
    let viewBoxHeight = svg.viewBox.baseVal.height;

    // Get lungs image dimensions (before scaling)
    let originalWidth = lungs.width.baseVal.value;
    let originalHeight = lungs.height.baseVal.value;

    // Scale the image 2x
    let scaleFactor = 2;
    let newWidth = originalWidth * scaleFactor;
    let newHeight = originalHeight * scaleFactor;
    lungs.setAttribute("width", newWidth);
    lungs.setAttribute("height", newHeight);

    // Calculate new centered position
    let centerX = (viewBoxWidth - newWidth) / 2;
    let centerY = (viewBoxHeight - newHeight) / 2;

    // Set new x, y attributes
    lungs.setAttribute("x", centerX);
    lungs.setAttribute("y", centerY);

    updateSpeeds();
}

function updateSpeeds() {
    let lungs = document.querySelector("#lungs");
    let speed = speedControl.value;
    let lungAnimationSpeed = 80 / (speed + 1);
    let mouth = document.querySelector("#mouth");

    let heart = document.querySelector("#heart");
    let heartAnimationSpeed = (13 - speed) / 8;
   
    lungs.style.animation = `breathing ${lungAnimationSpeed}s infinite ease-in-out`;
    lungs.style.transformOrigin = "center";
    heart.style.animation = `breathing ${heartAnimationSpeed}s infinite ease-in-out`;
    heart.style.transformOrigin = "center";
    mouth.style.animation = `breathing ${lungAnimationSpeed}s infinite ease-in-out`;
    mouth.style.transformOrigin = "center";
    for (let id of leftParticleIntervals)
        clearInterval(id);
    for (let id of rightParticleIntervals)
        clearInterval(id);
   
    // Generate new particles every 500ms
    const leftParticleInterval = setInterval(createParticleLeft, 750 - 50 * speed);
    leftParticleIntervals.push(leftParticleInterval)
    // Generate new particles every 500ms
    const isChecked = o2DeficiencyCheckbox.checked;
    var rightParticleInterval
    if (!isChecked)
        rightParticleInterval = setInterval(createParticleRight, 750 - 50 * speed);
    else
        rightParticleInterval = setInterval(createParticleRight, 1200 - 25 * speed);

    // Change color of heart
    if (isChecked)
    {
        // Change the color of the gradient stops to reddish-purple tones
        gradient.children[0].setAttribute('stop-color', '#d26f8f'); // Lighter reddish-purple
        gradient.children[1].setAttribute('stop-color', '#9b3353'); // Darker reddish-purple
        squiggle1.style.visibility = 'visible';
        squiggle2.style.visibility = 'visible';
    }
    else
    {
        gradient.children[0].setAttribute('stop-color', '#ff4c4c');
        gradient.children[1].setAttribute('stop-color', '#b30000');
        squiggle1.style.visibility = 'hidden';
        squiggle2.style.visibility = 'hidden';
    }
       
    rightParticleIntervals.push(rightParticleInterval)

    heartbeat.innerHTML = "<br>Heartbeat: " + Math.round(60 / heartAnimationSpeed).toString() + "<br>"
   
}




function createParticleLeft() {
    let particle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    particle.setAttribute("r", "5"); // Particle size
    particle.setAttribute("fill", "blue"); // Color of the particle

    // Set initial position at the start of the path
    let startPoint = pathLeft.getPointAtLength(0);
    particle.setAttribute("cx", startPoint.x);
    particle.setAttribute("cy", startPoint.y);

    particleContainerLeft.appendChild(particle);
    animateParticleLeft(particle);
}

function animateParticleLeft(particle) {
    let pathLength = pathLeft.getTotalLength();
    let startTime = Date.now();

    function move() {
        let elapsed = (Date.now() - startTime) / 2000; // 2 seconds duration
        if (elapsed > 1) {
            particle.remove(); // Remove particle when it reaches the end
            return;
        }

        let point = pathLeft.getPointAtLength(pathLength * elapsed);
        particle.setAttribute("cx", point.x);
        particle.setAttribute("cy", point.y);

        requestAnimationFrame(move);
    }
    move();
}





function createParticleRight() {
    let particle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    particle.setAttribute("r", "5"); // Particle size
    particle.setAttribute("fill", "red"); // Color of the particle

    // Set initial position at the start of the path
    let startPoint = pathRight.getPointAtLength(0);
    particle.setAttribute("cx", startPoint.x);
    particle.setAttribute("cy", startPoint.y);

    particleContainerRight.appendChild(particle);
    animateParticleRight(particle);
}

function animateParticleRight(particle) {
    let pathLength = pathRight.getTotalLength();
    let startTime = Date.now();

    function move() {
        let elapsed = (Date.now() - startTime) / 2000; // 2 seconds duration
        if (elapsed > 1) {
            particle.remove(); // Remove particle when it reaches the end
            return;
        }

        let point = pathRight.getPointAtLength(pathLength * elapsed);
        particle.setAttribute("cx", point.x);
        particle.setAttribute("cy", point.y);

        requestAnimationFrame(move);
    }
    move();
}



o2DeficiencyCheckbox.addEventListener("change", () => {
    speed = speedControl.value;
    updateSpeeds();
});


