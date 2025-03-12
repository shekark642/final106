let chartInstance = null;
let storedTestIDs = []; // Store all unique ID_test values from test_measure.csv
let filteredChartInstance = null; // Store the chart instance
let filteredChartInstance2 = null; // Store the chart instance

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

    // Destroy previous chart if it exists
    if (chartInstance) {
        chartInstance.destroy();
    }

    let originalColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4CAF50"]; // Original colors


    // Create the chart
    chartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [...originalColors], // Use original colors
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return tooltips[context.dataIndex]; // Show avg stats on hover
                        }
                    }
                }
            },
            // 🔥 Add onClick event to filter data when clicking a slice
            onClick: async (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index; // Get the clicked slice index
                    const selectedAgeGroup = labels[index]; // Get the age group

                    chartInstance.data.datasets[0].backgroundColor = originalColors.map((color, i) =>
                        i === index ? shadeColor(color, -20) : color
                    );

                    chartInstance.update(); // Redraw chart with new colors

                    // ✅ Update message text





                    // Fetch IDs of this age group and display filtered data
                        const validIDs = ageGroups[selectedAgeGroup]?.ids || [];


                        const normalizedTestIDs = storedTestIDs.map(id => id.replace(/_1$/, ""));

                        // ✅ Find matching IDs after normalization
                        const matchingIDs = normalizedTestIDs.filter(id => validIDs.includes(id));



                        
                        if (matchingIDs.length > 0) {
                            await filterAndDisplayTable(selectedAgeGroup, matchingIDs);
                        } else {
                            document.getElementById("outputTable").innerHTML = `<p style="color: red;">No matching data found for selected age group.</p>`;
                        }
                    }
                }
            }
        });

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
        const displayedRows = groupedData;




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
        filteredRows.forEach(row => {
            const time = parseFloat(row[timeIndex]) || 0;
            const hr = parseFloat(row[hrIndex]) || 0;
            const speed = parseFloat(row[speedIndex]) || 0;
            const vo2 = parseFloat(row[vo2Index]) || 0;
            const vco2 = parseFloat(row[vco2Index]) || 0;


            if (!timeMap[time]) {
                timeMap[time] = { totalHR: 0, totalSpeed: 0, count: 0, totalVO2: 0, totalVCO2: 0 };
            }

            timeMap[time].totalHR += hr;
            timeMap[time].totalSpeed += speed;
            timeMap[time].count += 1;
            timeMap[time].totalVO2 += vo2;
            timeMap[time].totalVCO2 += vco2;


        });

        console.log('timemap', timeMap)


        // ✅ Convert timeMap to sorted arrays
        const sortedTimes = Object.keys(timeMap).map(t => parseFloat(t)).sort((a, b) => a - b);
        const avgHR = sortedTimes.map(t => timeMap[t].totalHR / timeMap[t].count);
        const avgSpeed = sortedTimes.map(t => timeMap[t].totalSpeed / timeMap[t].count);
        const avgVO2 = sortedTimes.map(t => timeMap[t].totalVO2 / timeMap[t].count);
        const avgVCO2 = sortedTimes.map(t => timeMap[t].totalVCO2 / timeMap[t].count);


        console.log("📊 Sorted Time Steps:", sortedTimes);
        console.log("📊 Average HR for Each Time:", avgHR);
        console.log("📊 Average Speed for Each Time:", avgSpeed);

        // ✅ Call function to render the graph

        renderFilteredChart(sortedTimes, avgHR, avgSpeed);
        renderVCO2VO2SpeedChart(sortedTimes, avgVO2, avgVCO2, avgSpeed);


    } catch (error) {
        console.error("❌ Error filtering test_measure data:", error);
        document.getElementById("outputTable").innerHTML = `<p style="color: red;">Error loading data.</p>`;
    }

}

function renderFilteredChart(time, avgHR, avgSpeed) {
    console.log("📊 Attempting to Render Chart...");

    const ctx = document.getElementById("filteredChart");
    if (!ctx) {
        console.error("❌ ERROR: Canvas element for chart not found!");
        return;
    }

    if (filteredChartInstance) {
        console.log("🔄 Destroying previous chart instance...");
        filteredChartInstance.destroy();
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
    if (!ctx) {
        console.error("❌ ERROR: Canvas element for chart not found!");
        return;
    }

    if (filteredChartInstance2) {
        console.log("🔄 Destroying previous chart instance...");
        filteredChartInstance2.destroy();
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









function applyFilters() {
    if (!window.originalRows) return;

    // ✅ Categorize participants into age groups
    const ageGroups = {
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
    });

    // ✅ Compute averages
    const labels = Object.keys(ageGroups);
    const dataValues = labels.map(group => ageGroups[group].count);
    const avgStats = labels.map(group => {
        const { count, totalWeight, totalHeight } = ageGroups[group];
        return count > 0
            ? `Avg Weight: ${(totalWeight / count).toFixed(1)} kg\nAvg Height: ${(totalHeight / count).toFixed(1)} cm`
            : "No Data";
    });

    // ✅ Render the updated chart
    renderChart(labels, dataValues, avgStats, ageGroups);
}

function filterByGender(gender) {
    currentGender = gender;
    applyFilters();



    // ✅ Select the text container
    const textElement = document.getElementById("dynamic-text");

    // ✅ Update the text based on gender selection
    if (gender === null) {
        textElement.textContent = "This is the default text for all.";
    } else if (gender === 0) {
        textElement.textContent = "This is the text for males.";
    } else if (gender === 1) {
        textElement.textContent = "This is the text for females.";
    }



    // ✅ Remove 'active' class from all buttons
    document.querySelectorAll("#genderFilter button").forEach(btn => btn.classList.remove("active"));

    // ✅ Add 'active' class to the selected button
    if (gender === null) {
        document.querySelector("#genderFilter button:nth-child(1)").classList.add("active"); // "All"
    } else if (gender === 0) {
        document.querySelector("#genderFilter button:nth-child(2)").classList.add("active"); // "Men"
    } else if (gender === 1) {
        document.querySelector("#genderFilter button:nth-child(3)").classList.add("active"); // "Women"
    }
}


// ???
function shadeColor(color, percent) {
    let f = parseInt(color.slice(1), 16),
        t = percent < 0 ? 0 : 255,
        p = Math.abs(percent) / 80, // 🔥 Increase darkening effect slightly
        R = f >> 16,
        G = (f >> 8) & 0x00FF,
        B = f & 0x0000FF;
    return `rgb(${Math.round((t - R) * p + R)}, ${Math.round((t - G) * p + G)}, ${Math.round((t - B) * p + B)})`;
}







document.getElementById("toggleTableBtn").addEventListener("click", function() {
    const sidebar = document.getElementById("tableSidebar");
    if (sidebar.style.left === "0px") {
        sidebar.style.left = "-300px"; // Hide sidebar
        this.style.left = "10px"; // Move button back to original position
        this.textContent = "Expand Data";
    } else {
        sidebar.style.left = "0px"; // Show sidebar
        this.style.left = "320px"; // Move button to the right so it's visible
        this.textContent = "Collapse Data";
    }
});





// 📌 Step 5: Load Data on Page Load
window.onload = async function() {
    await loadTestMeasureIDs(); // Load all `ID_test` values from `test_measure.csv`
    await loadData(); // Load and process `subject-info.csv`
    applyFilters(); // Apply age and gender filters

};


