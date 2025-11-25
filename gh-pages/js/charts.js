/**
 * Chart.js Charts Module
 * Handles radar and bar charts
 */

class Charts {
    constructor() {
        this.radarChart = null;
        this.barChart = null;
        this.colors = [
            '#2563eb',
            '#7c3aed',
            '#db2777',
            '#f59e0b',
            '#10b981',
            '#06b6d4',
            '#ec4899',
            '#8b5cf6'
        ];
    }

    /**
     * Create radar chart for 5 blocks
     */
    createRadarChart(blockScores, compareData, methodology, canvas) {
        // Destroy existing chart
        if (this.radarChart) {
            this.radarChart.destroy();
        }

        const labels = Object.keys(methodology.blocks);
        const datasets = [];

        // Main institution dataset
        const mainData = labels.map(label => blockScores[label] || 0);
        datasets.push({
            label: 'Основний ЗВО',
            data: mainData,
            backgroundColor: 'rgba(37, 99, 235, 0.2)',
            borderColor: '#2563eb',
            borderWidth: 2,
            pointBackgroundColor: '#2563eb',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#2563eb',
            pointRadius: 4,
            pointHoverRadius: 6
        });

        // Comparison datasets
        compareData.forEach((data, index) => {
            if (data && data.blockScores) {
                const color = this.colors[index + 1] || this.colors[0];
                datasets.push({
                    label: data.name,
                    data: labels.map(label => data.blockScores[label] || 0),
                    backgroundColor: this.hexToRgba(color, 0.1),
                    borderColor: color,
                    borderWidth: 2,
                    pointBackgroundColor: color,
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: color,
                    pointRadius: 3,
                    pointHoverRadius: 5
                });
            }
        });

        // Create chart
        const ctx = canvas.getContext('2d');
        this.radarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: {
                            color: 'var(--text-secondary)',
                            backdropColor: 'transparent'
                        },
                        grid: {
                            color: 'var(--border-color)'
                        },
                        pointLabels: {
                            color: 'var(--text-primary)',
                            font: {
                                size: 12,
                                weight: '600'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: 'var(--text-primary)',
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'var(--bg-secondary)',
                        titleColor: 'var(--text-primary)',
                        bodyColor: 'var(--text-secondary)',
                        borderColor: 'var(--border-color)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ${context.parsed.r.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });

        return this.radarChart;
    }

    /**
     * Create bar chart for all indicators
     */
    createBarChart(indicators, compareData, methodology, canvas) {
        // Destroy existing chart
        if (this.barChart) {
            this.barChart.destroy();
        }

        const indicatorKeys = Object.keys(methodology.indicators).sort();
        const datasets = [];

        // Main institution dataset
        const mainData = indicatorKeys.map(key => indicators[key] || 0);
        datasets.push({
            label: 'Основний ЗВО',
            data: mainData,
            backgroundColor: '#2563eb',
            borderColor: '#1e40af',
            borderWidth: 1
        });

        // Comparison datasets
        compareData.forEach((data, index) => {
            if (data && data.indicators) {
                const color = this.colors[index + 1] || this.colors[0];
                datasets.push({
                    label: data.name,
                    data: indicatorKeys.map(key => data.indicators[key] || 0),
                    backgroundColor: color,
                    borderColor: this.darkenColor(color),
                    borderWidth: 1
                });
            }
        });

        // Create chart
        const ctx = canvas.getContext('2d');
        this.barChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: indicatorKeys,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        ticks: {
                            color: 'var(--text-secondary)',
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'var(--text-secondary)'
                        },
                        grid: {
                            color: 'var(--border-color)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: 'var(--text-primary)',
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'var(--bg-secondary)',
                        titleColor: 'var(--text-primary)',
                        bodyColor: 'var(--text-secondary)',
                        borderColor: 'var(--border-color)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            title: function (context) {
                                const indicator = context[0].label;
                                const weight = methodology.indicators[indicator];
                                return `${indicator} (Вага: ${weight})`;
                            },
                            label: function (context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });

        return this.barChart;
    }

    /**
     * Helper: Convert hex to rgba
     */
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Helper: Darken color
     */
    darkenColor(hex, percent = 20) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        ).toString(16).slice(1);
    }

    /**
     * Destroy all charts
     */
    destroyAll() {
        if (this.radarChart) {
            this.radarChart.destroy();
            this.radarChart = null;
        }
        if (this.barChart) {
            this.barChart.destroy();
            this.barChart = null;
        }
    }
}

export default Charts;
