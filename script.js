let selectedAgeGroup = "All Ages"; // Default to all ages
let chartInstance = null;
let storedTestIDs = []; // Store all unique ID_test values from test_measure.csv
let filteredChartInstance = null; // Store the chart instance
let filteredChartInstance2 = null; // Store the chart instance
let vo2Vco2HRChart = null;
let vo2Vco2HRChartSecond = null;
let vo2Vco2HRChartThird = null;
let vo2Vco2HRChartFourth = null;
let individualRRChart = null; // Store the chart instance


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

        window.originalRows = rows;
        window.header = header;

        // Apply filters after loading data
        applyFilters();


        // Categorize participants into age groups
        const ageGroups = {
            "10-18": { count: 0, totalWeight: 0, totalHeight: 0, ids: [] },
            "18-30": { count: 0, totalWeight: 0, totalHeight: 0, ids: [] },
            "30-45": { count: 0, totalWeight: 0, totalHeight: 0, ids: [] },
            "45-63": { count: 0, totalWeight: 0, totalHeight: 0, ids: [] },
        };

        rows.forEach(row => {
            const age = parseFloat(row[ageIndex]);
            const userID = row[idIndex]?.trim(); // Ensure ID is a string & not undefined
            const weight = parseFloat(row[weightIndex]);
            const height = parseFloat(row[heightIndex]);



            let group;
            if (age >= 10 && age < 18) group = "10-18";
            else if (age >= 18 && age < 30) group = "18-30";
            else if (age >= 30 && age < 45) group = "30-45";
            else if (age >= 45 && age <= 63) group = "45-63";

            if (group) {
                ageGroups[group].count++;
                ageGroups[group].totalWeight += weight;
                ageGroups[group].totalHeight += height;

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
            const { count, totalWeight, totalHeight } = ageGroups[group];
            return count > 0
                ? `Avg Weight: ${(totalWeight / count).toFixed(1)} kg\nAvg Height: ${(totalHeight / count).toFixed(1)} cm`
                : "No Data";
        });

        // Render the chart
        renderChart(labels, dataValues, avgStats, ageGroups);
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
        const response = await fetch("test_measure.csv");
        if (!response.ok) throw new Error("❌ Failed to load test_measure.csv");

        const data = await response.text();
        const rows = data.trim().split("\n").map(line => line.split(",").map(cell => cell.trim()));

        const header = rows.shift(); // Remove header row



        const timeIndex = header.indexOf("time");
        const idTestIndex = header.indexOf("ID");
        const speedIndex = header.indexOf("Speed");
        const hrIndex = header.indexOf("HR");
        const vo2Index = header.indexOf("VO2");
        const vco2Index = header.indexOf("VCO2");
        const rrIndex = header.indexOf("RR");
        const veIndex = header.indexOf("VE");



        if (idTestIndex === -1) throw new Error("❌ 'ID_test' column missing in test_measure.csv");




        // 🔍 Log sample `ID_test` values from `test_measure.csv`
        const sampleTestIDs = rows.slice(0, 10).map(row => row[idTestIndex]);

        // 🔍 Log `matchingIDs` before filtering
        const formattedMatchingIDs = matchingIDs.map(id => String(id).trim());

        // 🔍 Debug: Find first mismatched ID
        let mismatchedIDs = [];
        for (let id of formattedMatchingIDs) {
            if (!sampleTestIDs.includes(id)) {
                mismatchedIDs.push(id);
            }
        }


        // ✅ Filter rows that have an `ID_test` matching `matchingIDs`
        const filteredRows = rows.filter(row => formattedMatchingIDs.includes(String(row[idTestIndex]).trim()));

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
                isNaN(d3.mean(records, d => parseFloat(d[veIndex]))) ? "N/A" : d3.mean(records, d => parseFloat(d[veIndex])).toFixed(2)
            ];
        }).filter(d => d !== null); // ✅ Remove null values
    







        console.log(groupedData)


        // ✅ Display the first 20 matching rows
        const displayedRows = groupedData.slice(0,50);




// ✅ Define correct table headers matching groupedData structure
const tableHeaders = ["ID", "Mean Speed", "Mean HR", "Mean VO2", "Mean VCO2", "Mean RR", "Mean VE"];

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

            const id = row[idTestIndex]?.trim();



            if (!timeMap[time]) {
                timeMap[time] = { totalHR: 0, totalSpeed: 0, count: 0, totalVO2: 0, totalVCO2: 0 };
            }

            timeMap[time].totalHR += hr;
            timeMap[time].totalSpeed += speed;
            timeMap[time].count += 1;
            timeMap[time].totalVO2 += vo2;
            timeMap[time].totalVCO2 += vco2;



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
                }
            },
            hover: {
                intersect: false // ✅ Prevent hover only working on one dataset
            }
        }
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
                    borderColor: "#FF5733",
                    backgroundColor: "rgba(255, 87, 51, 0.2)",
                    borderWidth: 2,
                    pointRadius: 1,
                    hoverRadius: 5,
                    fill: false
                },
                {
                    label: "Average VCO2",
                    data: avgVCO2,
                    borderColor: "#33FF57",
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
                }
            },
            hover: {
                intersect: false
            }
        }
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
    const timeIndex = 0;
    const hrIndex = 2;
    const vo2Index = 3;
    const vco2Index = 4;
    const idIndex = 8;

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

            if (!isNaN(time) && !isNaN(hr) && hr > 0 && !isNaN(vo2) && !isNaN(vco2)) {
                participantData[selectedParticipant].push({
                    time,
                    vo2_hr: vo2 / hr,
                    vco2_hr: vco2 / hr
                });

            }
        }
    }

    if (!participantData[selectedParticipant] || participantData[selectedParticipant].length === 0) {
        console.warn("⚠️ No valid data points found. Skipping chart rendering.");
        return;
    }

    let data = participantData[selectedParticipant];

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
                legend: { labels: { font: { size: 14 } } },
                tooltip: { enabled: true, intersect: false }
                
            },
            hover: { intersect: false }
        }
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
    const timeIndex = 0;
    const hrIndex = 2;
    const vo2Index = 3;
    const vco2Index = 4;
    const idIndex = 8;

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

            if (!isNaN(time) && !isNaN(hr) && hr > 0 && !isNaN(vo2) && !isNaN(vco2)) {
                participantData[selectedParticipant].push({
                    time,
                    vo2_hr: vo2 / hr,
                    vco2_hr: vco2 / hr
                });

            }
        }
    }

    if (!participantData[selectedParticipant] || participantData[selectedParticipant].length === 0) {
        console.warn("⚠️ No valid data points found for the second participant. Skipping chart rendering.");
        return;
    }

    let data = participantData[selectedParticipant];

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
                legend: { labels: { font: { size: 14 } } },
                tooltip: { enabled: true, intersect: false }
            },
            hover: { intersect: false }
        }
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
    const timeIndex = 0;
    const hrIndex = 2;
    const vo2Index = 3;
    const vco2Index = 4;
    const idIndex = 8;

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

            if (!isNaN(time) && !isNaN(hr) && hr > 0 && !isNaN(vo2) && !isNaN(vco2)) {
                participantData[selectedParticipant].push({
                    time,
                    vo2_hr: vo2 / hr,
                    vco2_hr: vco2 / hr
                });

            }
        }
    }

    if (!participantData[selectedParticipant] || participantData[selectedParticipant].length === 0) {
        console.warn("⚠️ No valid data points found for the third participant. Skipping chart rendering.");
        return;
    }

    let data = participantData[selectedParticipant];

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
                legend: { labels: { font: { size: 14 } } },
                tooltip: { enabled: true, intersect: false }
            },
            hover: { intersect: false }
        }
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
    const timeIndex = 0;
    const hrIndex = 2;
    const vo2Index = 3;
    const vco2Index = 4;
    const idIndex = 8;

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

            if (!isNaN(time) && !isNaN(hr) && hr > 0 && !isNaN(vo2) && !isNaN(vco2)) {
                participantData[selectedParticipant].push({
                    time,
                    vo2_hr: vo2 / hr,
                    vco2_hr: vco2 / hr
                });

            }
        }
    }

    if (!participantData[selectedParticipant] || participantData[selectedParticipant].length === 0) {
        console.warn("⚠️ No valid data points found for the fourth participant. Skipping chart rendering.");
        return;
    }

    let data = participantData[selectedParticipant];

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
                legend: { labels: { font: { size: 14 } } },
                tooltip: { enabled: true, intersect: false }
            },
            hover: { intersect: false }
        }
    });

    console.log("✅ VO₂/HR & VCO₂/HR Chart for Fourth Participant Successfully Rendered!");
}








function applyFilters() {
    if (!window.originalRows) return;

    // ✅ Categorize participants into age groups
    const ageGroups = {
        "All Ages": { count: window.originalRows.length, totalWeight: 0, totalHeight: 0, ids: [] },

        "10-18": { count: 0, totalWeight: 0, totalHeight: 0, ids: [] },
        "18-30": { count: 0, totalWeight: 0, totalHeight: 0, ids: [] },
        "30-45": { count: 0, totalWeight: 0, totalHeight: 0, ids: [] },
        "45-63": { count: 0, totalWeight: 0, totalHeight: 0, ids: [] },
    };

    window.originalRows.forEach(row => {
        const age = parseFloat(row[window.header.indexOf("Age")]);
        const weight = parseFloat(row[window.header.indexOf("Weight")]);
        const height = parseFloat(row[window.header.indexOf("Height")]);
        const sex = parseInt(row[window.header.indexOf("Sex")]); // Gender column
        const userID = row[window.header.indexOf("ID")];

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
            ageGroups[group].ids.push(userID);
        }

        ageGroups["All Ages"].ids.push(userID); // ✅ Add all IDs to "All Ages"

    });

    // ✅ Compute averages
    const labels = Object.keys(ageGroups).filter(label => label !== "All Ages"); // Exclude "All Ages" from pie chart
    const dataValues = labels.map(group => ageGroups[group].count);
    const avgStats = labels.map(group => {
        const { count, totalWeight, totalHeight } = ageGroups[group];
        return count > 0
            ? `Avg Weight: ${(totalWeight / count).toFixed(1)} kg\nAvg Height: ${(totalHeight / count).toFixed(1)} cm`
            : "No Data";
    });

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
        "10-18": { count: 0, totalWeight: 0, totalHeight: 0, ids: [] },
        "18-30": { count: 0, totalWeight: 0, totalHeight: 0, ids: [] },
        "30-45": { count: 0, totalWeight: 0, totalHeight: 0, ids: [] },
        "45-63": { count: 0, totalWeight: 0, totalHeight: 0, ids: [] },
    };

    let validIDs = [];

    filteredRows.forEach(row => {
        const age = parseFloat(row[window.header.indexOf("Age")]);
        const weight = parseFloat(row[window.header.indexOf("Weight")]);
        const height = parseFloat(row[window.header.indexOf("Height")]);
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
            ageGroups[group].ids.push(userID);
            validIDs.push(userID);
        }
    });

    // ✅ Compute new chart data
    const labels = Object.keys(ageGroups);
    const dataValues = labels.map(group => ageGroups[group].count);
    const avgStats = labels.map(group => {
        const { count, totalWeight, totalHeight } = ageGroups[group];
        return count > 0
            ? `Avg Weight: ${(totalWeight / count).toFixed(1)} kg\nAvg Height: ${(totalHeight / count).toFixed(1)} cm`
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
        textElement.textContent = "This is the default text for all.";
    } else if (gender === 0) {
        textElement.textContent = "This is the text for males.";
    } else if (gender === 1) {
        textElement.textContent = "This is the text for females.";
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







document.getElementById("toggleTableBtn").addEventListener("click", function() {
    const sidebar = document.getElementById("tableSidebar");
    if (sidebar.style.left === "0px") {
        sidebar.style.left = "-530px"; // Hide sidebar
        this.style.left = "80px"; // Move button back to original position
        this.textContent = "Expand Data";
    } else {
        sidebar.style.left = "0px"; // Show sidebar
        this.style.left = "600px"; // Move button to the right so it's visible
        this.textContent = "Collapse Data";
    }
});





const speedControl = document.getElementById('speed');
let speed = speedControl.value;
speedControl.addEventListener('input', () => speed = speedControl.value);

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

// Animate particles
function animate() {
    let animationSpeed = 0.5 * speed;

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






// 📌 Step 5: Load Data on Page Load
window.onload = async function() {
    await loadTestMeasureIDs(); // Load all `ID_test` values from `test_measure.csv`
    await loadData(); // Load and process `subject-info.csv`
    applyFilters(); // Apply age and gender filters

};


