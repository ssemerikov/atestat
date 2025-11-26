/**
 * Chart.js Charts Module
 * Handles radar and bar charts
 */

class Charts {
    constructor() {
        this.radarChart = null;
        this.barChart = null;
        this.dynamicsChart = null;
        this.medianComparisonChart = null;
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
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1f2937',
                        bodyColor: '#4b5563',
                        borderColor: '#d1d5db',
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
    createBarChart(indicators, compareData, methodology, canvas, orderedIndicatorKeys = null) {
        // Destroy existing chart
        if (this.barChart) {
            this.barChart.destroy();
        }

        // Use provided order or filter and sort
        let indicatorKeys;
        if (orderedIndicatorKeys && orderedIndicatorKeys.length > 0) {
            indicatorKeys = orderedIndicatorKeys;
        } else {
            indicatorKeys = Object.keys(methodology.indicators)
                .filter(key => indicators[key] !== null && indicators[key] !== undefined)
                .sort();
        }

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
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1f2937',
                        bodyColor: '#4b5563',
                        borderColor: '#d1d5db',
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
     * Create line chart for dynamics (time series) with comparison institutions
     */
    createDynamicsChart(mainInstitutionData, dynamikaData, canvas, comparisonInstitutionsData = []) {
        const mainInstitutionName = mainInstitutionData.name;
        const mainScore = mainInstitutionData.score;
        const mainGroup = mainInstitutionData.group;
        // Destroy existing chart
        if (this.dynamicsChart) {
            this.dynamicsChart.destroy();
        }

        if (!dynamikaData || dynamikaData.length === 0) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '14px sans-serif';
            ctx.fillStyle = 'var(--text-secondary)';
            ctx.textAlign = 'center';
            ctx.fillText('Немає даних динаміки для цього закладу', canvas.width / 2, canvas.height / 2);
            return null;
        }

        const nameField = 'Повне найменування наукової установи / закладу вищої освіти *';

        // Collect all institutions to display
        const comparisonNames = comparisonInstitutionsData.map(inst => inst.name);
        const allInstitutionNames = [mainInstitutionName, ...comparisonNames.filter(name => name)];

        // Create a map of institution names to their scores and groups
        const institutionInfo = new Map();
        institutionInfo.set(mainInstitutionName, { score: mainScore, group: mainGroup });
        comparisonInstitutionsData.forEach(inst => {
            institutionInfo.set(inst.name, { score: inst.score, group: inst.group });
        });

        // Group data by institution and indicator
        const dataByInstitutionAndIndicator = {};
        const allYears = new Set();

        allInstitutionNames.forEach(instName => {
            const institutionData = dynamikaData.filter(item => item[nameField] === instName);

            if (institutionData.length === 0) return;

            dataByInstitutionAndIndicator[instName] = {};

            institutionData.forEach(item => {
                const indicator = item['Показник'];
                const year = item['Рік'];
                const value = item['Значення'];

                if (!indicator || year === null || year === undefined || value === null || value === undefined) {
                    return;
                }

                allYears.add(year);

                if (!dataByInstitutionAndIndicator[instName][indicator]) {
                    dataByInstitutionAndIndicator[instName][indicator] = [];
                }

                dataByInstitutionAndIndicator[instName][indicator].push({ year, value });
            });
        });

        if (Object.keys(dataByInstitutionAndIndicator).length === 0) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '14px sans-serif';
            ctx.fillStyle = 'var(--text-secondary)';
            ctx.textAlign = 'center';
            ctx.fillText('Немає даних динаміки для обраних закладів', canvas.width / 2, canvas.height / 2);
            return null;
        }

        const years = [...allYears].sort();

        // Select top 5 indicators from main institution by latest value
        const mainInstData = dataByInstitutionAndIndicator[mainInstitutionName] || {};
        const topIndicators = Object.entries(mainInstData)
            .map(([indicator, data]) => {
                const latestValue = [...data].sort((a, b) => b.year - a.year)[0]?.value || 0;
                return { indicator, latestValue };
            })
            .sort((a, b) => b.latestValue - a.latestValue)
            .slice(0, 5)
            .map(item => item.indicator);

        // Create datasets for each institution and top indicators
        const datasets = [];
        let colorIndex = 0;

        allInstitutionNames.forEach((instName, instIndex) => {
            const instData = dataByInstitutionAndIndicator[instName];
            if (!instData) return;

            const isMain = instName === mainInstitutionName;
            const info = institutionInfo.get(instName);
            const score = info ? info.score : 0;
            const group = info ? info.group : '?';

            // Create short name with score and group
            let instShortName = instName.length > 25 ? instName.substring(0, 22) + '...' : instName;
            instShortName = `${instShortName} (${score.toFixed(1)}/${group})`;

            topIndicators.forEach(indicator => {
                const indicatorData = instData[indicator];
                if (!indicatorData) return;

                const color = this.colors[colorIndex % this.colors.length];
                colorIndex++;

                const data = years.map(year => {
                    const point = indicatorData.find(d => d.year === year);
                    return point ? point.value : null;
                });

                // Shorten indicator names
                let shortIndicator = indicator;
                if (indicator.toLowerCase().includes('scopus') || indicator.toLowerCase().includes('wos')) {
                    if (indicator.toLowerCase().includes('q1') && indicator.toLowerCase().includes('q2')) {
                        shortIndicator = 'Q1-Q2';
                    } else if (indicator.toLowerCase().includes('q3') && indicator.toLowerCase().includes('q4')) {
                        shortIndicator = 'Q3-Q4';
                    } else if (indicator.toLowerCase().includes('фахові') || indicator.toLowerCase().includes('без квартиля')) {
                        shortIndicator = 'фахові/без квартиля';
                    }
                }

                datasets.push({
                    label: `${instShortName} - ${shortIndicator}`,
                    data: data,
                    borderColor: color,
                    backgroundColor: this.hexToRgba(color, 0.1),
                    borderWidth: isMain ? 3 : 2,
                    pointRadius: isMain ? 5 : 4,
                    pointHoverRadius: isMain ? 7 : 6,
                    tension: 0.3,
                    fill: false,
                    borderDash: isMain ? [] : [5, 5]
                });
            });
        });

        // Create chart
        const ctx = canvas.getContext('2d');
        this.dynamicsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
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
                        title: {
                            display: true,
                            text: 'Рік',
                            color: 'var(--text-primary)',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            color: 'var(--text-secondary)'
                        },
                        grid: {
                            color: 'var(--border-color)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Значення',
                            color: 'var(--text-primary)',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
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
                        position: 'right',
                        labels: {
                            color: 'var(--text-primary)',
                            padding: 10,
                            font: {
                                size: 11
                            },
                            boxWidth: 15,
                            boxHeight: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1f2937',
                        bodyColor: '#4b5563',
                        borderColor: '#d1d5db',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            title: function (context) {
                                return `Рік: ${context[0].label}`;
                            },
                            label: function (context) {
                                return `${context.dataset.label}: ${context.parsed.y}`;
                            }
                        }
                    }
                }
            }
        });

        return this.dynamicsChart;
    }

    /**
     * Create bar chart for median comparison with median lines
     */
    createMedianComparisonChart(indicators, medianValues, methodology, canvas, orderedIndicatorKeys = null, getIndicatorName = null) {
        // Destroy existing chart
        if (this.medianComparisonChart) {
            this.medianComparisonChart.destroy();
        }

        // Use ordered keys if provided
        const indicatorKeys = orderedIndicatorKeys && orderedIndicatorKeys.length > 0
            ? orderedIndicatorKeys
            : Object.keys(methodology.indicators)
                .filter(key => indicators[key] !== null && indicators[key] !== undefined)
                .sort();

        // Prepare data
        const labels = indicatorKeys.map(key => {
            if (!getIndicatorName) return key;
            const name = getIndicatorName(key);
            if (name && name !== key) {
                const shortName = name.length > 20 ? name.substring(0, 17) + '...' : name;
                return `${key}\n${shortName}`;
            }
            return key;
        });

        const institutionValuesRaw = indicatorKeys.map(key => indicators[key] || 0);
        const medianValuesData = indicatorKeys.map(key => medianValues[key] || 0);

        // Transform values to percentage of median
        const institutionValues = indicatorKeys.map((key, index) => {
            const value = institutionValuesRaw[index];
            const median = medianValuesData[index];
            if (median === 0) return 0;
            return (value / median) * 100; // Show as percentage of median
        });

        // Median is always at 100%
        const medianPercentage = 100;

        // Calculate max for better visualization
        const maxPercentage = Math.max(...institutionValues);
        const suggestedMax = maxPercentage > 200 ? maxPercentage * 1.1 : 200;

        // Determine bar colors based on comparison with median (100%)
        const barColors = indicatorKeys.map((key, index) => {
            const percentValue = institutionValues[index];
            if (percentValue >= 100) {
                return '#10b981'; // Green for above median
            } else {
                return '#ef4444'; // Red for below median
            }
        });

        const barBorderColors = indicatorKeys.map((key, index) => {
            const percentValue = institutionValues[index];
            if (percentValue >= 100) {
                return '#059669';
            } else {
                return '#dc2626';
            }
        });

        // Create chart
        const ctx = canvas.getContext('2d');
        this.medianComparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Значення ЗВО',
                        data: institutionValues,
                        backgroundColor: barColors,
                        borderColor: barBorderColors,
                        borderWidth: 2
                    }
                ]
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
                        max: suggestedMax,
                        ticks: {
                            color: 'var(--text-secondary)',
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        grid: {
                            color: 'var(--border-color)'
                        },
                        title: {
                            display: true,
                            text: '% від медіани',
                            color: 'var(--text-primary)',
                            font: {
                                size: 12,
                                weight: 'bold'
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
                            },
                            generateLabels: function(chart) {
                                return [
                                    {
                                        text: 'Значення ЗВО (зелений = вище медіани, червоний = нижче)',
                                        fillStyle: '#6b7280',
                                        strokeStyle: '#6b7280',
                                        lineWidth: 2,
                                        hidden: false
                                    },
                                    {
                                        text: 'Медіана (помаранчева лінія)',
                                        fillStyle: '#f59e0b',
                                        strokeStyle: '#f59e0b',
                                        lineWidth: 3,
                                        hidden: false
                                    }
                                ];
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1f2937',
                        bodyColor: '#4b5563',
                        borderColor: '#d1d5db',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const index = context.dataIndex;
                                const valueRaw = institutionValuesRaw[index];
                                const median = medianValuesData[index];
                                const percentValue = institutionValues[index];
                                const diff = valueRaw - median;

                                return [
                                    `Відносно медіани: ${percentValue.toFixed(1)}%`,
                                    `─────────────────`,
                                    `Значення ЗВО: ${valueRaw.toFixed(4)}`,
                                    `Медіана: ${median.toFixed(4)}`,
                                    `Різниця: ${diff >= 0 ? '+' : ''}${diff.toFixed(4)}`
                                ];
                            }
                        }
                    }
                },
                // Custom plugin to draw median line at 100%
                plugins: [{
                    id: 'medianLine',
                    afterDatasetsDraw: function(chart) {
                        const ctx = chart.ctx;
                        const chartArea = chart.chartArea;
                        const yScale = chart.scales.y;
                        const yPos = yScale.getPixelForValue(medianPercentage);

                        ctx.save();
                        ctx.strokeStyle = '#f59e0b';
                        ctx.lineWidth = 3;
                        ctx.setLineDash([5, 5]);

                        // Draw horizontal line across entire chart at 100%
                        ctx.beginPath();
                        ctx.moveTo(chartArea.left, yPos);
                        ctx.lineTo(chartArea.right, yPos);
                        ctx.stroke();

                        // Add label
                        ctx.fillStyle = '#f59e0b';
                        ctx.font = 'bold 12px sans-serif';
                        ctx.textAlign = 'right';
                        ctx.fillText('← Медіана (100%)', chartArea.right - 5, yPos - 5);

                        ctx.restore();
                    }
                }]
            }
        });

        return this.medianComparisonChart;
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
        if (this.dynamicsChart) {
            this.dynamicsChart.destroy();
            this.dynamicsChart = null;
        }
        if (this.medianComparisonChart) {
            this.medianComparisonChart.destroy();
            this.medianComparisonChart = null;
        }
    }
}

export default Charts;
