const BASE_URL = window.location.origin;const socket = io(BASE_URL);
const token = localStorage.getItem("token");

const projectId = new URLSearchParams(
    window.location.search
).get("project");

// --------------------------------------------------
// Doughnut Chart
// --------------------------------------------------

const levelCtx = document.getElementById("levelChart").getContext("2d");

const levelChart = new Chart(levelCtx, {
    type: "doughnut",
    data: {
        labels: ["Error", "Warn", "Info"],
        datasets: [{
            data: [0, 0, 0],
            backgroundColor: [
                "#f8717140",
                "#fbbf2440",
                "#60a5fa40"
            ],
            borderColor: [
                "#f87171",
                "#fbbf24",
                "#60a5fa"
            ],
            borderWidth: 2
        }]
    },
    options: {
        responsive: true,
        animation: false,
        cutout: "65%",
        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    color: "#64748b",
                    font: {
                        size: 11
                    },
                    padding: 12
                }
            }
        }
    }
});

// --------------------------------------------------
// Dashboard API
// --------------------------------------------------

async function loadOverview() {

    const res = await fetch(
        `${BASE_URL}/analytics/overview?project=${projectId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    const data = await res.json();

    // Overview cards
    document.getElementById("totalLogs").textContent = data.total_logs;
    document.getElementById("errorLogs").textContent = data.error_logs;
    document.getElementById("warnLogs").textContent = data.warn_logs;
    document.getElementById("infoLogs").textContent = data.info_logs;

    // Error Rate
    const errorRate =
        data.total_logs === 0
            ? 0
            : (data.error_logs / data.total_logs) * 100;

    document.getElementById("errorRate").textContent =
        `${errorRate.toFixed(1)}%`;

    // Queue Status
    document.getElementById("queueWaiting").textContent =
        data.queue.waiting;

    document.getElementById("queueActive").textContent =
        data.queue.active;

    document.getElementById("queueFailed").textContent =
        data.queue.failed;

    // Doughnut Chart
    levelChart.data.datasets[0].data = [
        data.error_logs,
        data.warn_logs,
        data.info_logs
    ];
    console.log(levelChart.data.datasets[0].data);

    levelChart.update("none");
}

async function loadServices() {

    const res = await fetch(
    `${BASE_URL}/analytics/services?project=${projectId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const services = await res.json();

    const table = document.getElementById("servicesTable");
    table.innerHTML = "";

    services.forEach(service => {

        table.insertAdjacentHTML(
            "beforeend",
            `
            <tr>
                <td>${service.service_name}</td>
                <td>${service.count}</td>
            </tr>
            `
        );

    });

}

async function loadLogs() {

    const res = await fetch(
    `${BASE_URL}/analytics/logs?project=${projectId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    const logs = await res.json();

    const table = document.getElementById("logsTable");
    table.innerHTML = "";

    logs.forEach(addLogRow);

}

// --------------------------------------------------
// Live Logs
// --------------------------------------------------

function addLogRow(log) {

    const table = document.getElementById("logsTable");

    table.insertAdjacentHTML(
        "afterbegin",
        `
        <tr>
            <td>${log.service_name}</td>

            <td>
                <span class="badge badge-${log.level}">
                    ${log.level}
                </span>
            </td>

            <td>${log.message}</td>

            <td>${new Date(log.created_at).toLocaleString()}</td>
        </tr>
        `
    );

    if (table.rows.length > 50) {
        table.deleteRow(50);
    }
}

// --------------------------------------------------
// Dashboard Refresh
// --------------------------------------------------

async function refreshDashboard() {

    await Promise.all([
        loadOverview(),
        loadServices(),
        loadLogs()
    ]);

}

// --------------------------------------------------
// Socket.IO
// --------------------------------------------------

socket.on("connect", () => {
    console.log("Connected:", socket.id);
});

socket.on("disconnect", () => {
    console.log("Disconnected");
});

socket.on("new-log", async (log) => {
    if(log.project_id != projectId){
        return;
    }

    addLogRow(log);

    await Promise.all([
        loadOverview(),
        loadServices()
    ]);

});

refreshDashboard();