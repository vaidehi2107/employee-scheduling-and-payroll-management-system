import { useEffect, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import API from "../api"; // adjust to your actual axios instance path

const DATASET_LABEL_TO_KEY = {
    "Present": "present",
    "Paid leave": "paidLeave",
    "Non-paid leave": "nonPaidLeave",
    "Holiday / week off": "nonWorking"
};

// Keeps the tooltip from turning into a wall of text on days with a lot
// of people in one bucket - shows the first few names, then a "+N more".
const formatNames = (names, max = 8) => {
    if (!names || names.length === 0) return [];
    const labels = names.map(n => (n.isHalfDay ? `${n.name} (half day)` : n.name));
    if (labels.length <= max) return labels;
    return [...labels.slice(0, max), `+${labels.length - max} more`];
};

export default function AttendanceDailyChart({ month, year }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const [days, setDays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        API.get("/dashboard/attendance/daily-summary", { params: { month, year } })
            .then(res => setDays(res.data.days))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [month, year]);

    useEffect(() => {
        if (!canvasRef.current || days.length === 0) return;
        if (chartRef.current) chartRef.current.destroy();

        chartRef.current = new Chart(canvasRef.current, {
            type: "bar",
            data: {
                labels: days.map(d => d.day),
                datasets: [
                    { label: "Present", data: days.map(d => d.present), backgroundColor: "#7c5cbf", stack: "a" },
                    { label: "Paid leave", data: days.map(d => d.paidLeave), backgroundColor: "#e07b2a", stack: "a" },
                    { label: "Non-paid leave", data: days.map(d => d.nonPaidLeave), backgroundColor: "#e05c5c", stack: "a" },
                    { label: "Holiday / week off", data: days.map(d => d.nonWorking), backgroundColor: "#d9d5f0", stack: "a" }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "top",
                        labels: {
                            font: { family: "'DM Sans', sans-serif", size: 12, weight: 500 },
                            color: "#1a1a2e",
                            usePointStyle: true,
                            pointStyle: "circle",
                            boxWidth: 8,
                            padding: 16
                        }
                    },
                    tooltip: {
                        backgroundColor: "#1a1a2e",
                        titleFont: { family: "'Sora', sans-serif", weight: 600 },
                        bodyFont: { family: "'DM Sans', sans-serif" },
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                            title: items => {
                                const d = days[items[0].dataIndex];
                                return d.holidayName ? `Day ${d.day} — ${d.holidayName}` : `Day ${d.day}`;
                            },
                            afterTitle: items => {
                                const d = days[items[0].dataIndex];
                                if (!d.unmarked) return "";
                                return [`${d.unmarked} unmarked`, ...formatNames(d.names?.unmarked)];
                            },
                            afterLabel: ctx => {
                                const d = days[ctx.dataIndex];
                                const key = DATASET_LABEL_TO_KEY[ctx.dataset.label];
                                return formatNames(d?.names?.[key]);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        title: { display: true, text: "Day of month", color: "#888", font: { family: "'DM Sans', sans-serif", size: 12 } },
                        ticks: { color: "#888", font: { family: "'DM Sans', sans-serif" } },
                        grid: { display: false }
                    },
                    y: {
                        stacked: true,
                        title: { display: true, text: "Employees", color: "#888", font: { family: "'DM Sans', sans-serif", size: 12 } },
                        ticks: { color: "#888", font: { family: "'DM Sans', sans-serif" } },
                        beginAtZero: true,
                        grid: { color: "#f0f0f8" }
                    }
                }
            }
        });

        return () => chartRef.current?.destroy();
    }, [days]);

    if (loading) return <p>Loading attendance chart...</p>;
    if (days.length === 0) return <p>No attendance data for this period.</p>;

    return (
        <div>
            <div style={{ position: "relative", width: "100%", height: 320 }}>
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
}