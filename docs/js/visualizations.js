/**
 * D3.js Visualizations Module
 * Handles scatter plot and heatmap visualizations
 */

class Visualizations {
    constructor() {
        this.colors = {
            primary: '#2563eb',
            secondary: '#7c3aed',
            tertiary: '#db2777',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444'
        };
    }

    /**
     * Create scatter plot: position vs median
     */
    createScatterPlot(data, medianValues, methodology, container) {
        // Clear container
        d3.select(container).selectAll('*').remove();

        // Prepare data points
        const points = [];
        const mainInstitution = data.main;

        for (let i = 1; i <= 37; i++) {
            const indicatorKey = `I${i}`;
            const dataKey = Object.keys(mainInstitution).find(key =>
                key.includes(`Нормований індикатор ${indicatorKey}*`)
            );

            if (dataKey) {
                const value = mainInstitution[dataKey];
                const median = medianValues[indicatorKey];

                if (value !== null && !isNaN(value) && median !== null && !isNaN(median)) {
                    points.push({
                        indicator: indicatorKey,
                        value: value,
                        median: median,
                        diff: value - median,
                        weight: methodology.indicators[indicatorKey]
                    });
                }
            }
        }

        // Set dimensions
        const margin = { top: 40, right: 40, bottom: 60, left: 60 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(points, d => d.median) * 1.1])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(points, d => d.value) * 1.1])
            .range([height, 0]);

        // Create tooltip
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'chart-tooltip')
            .style('position', 'absolute')
            .style('opacity', 0);

        // Add grid lines
        svg.append('g')
            .attr('class', 'grid')
            .selectAll('line')
            .data(xScale.ticks(10))
            .enter()
            .append('line')
            .attr('class', 'grid-line')
            .attr('x1', d => xScale(d))
            .attr('x2', d => xScale(d))
            .attr('y1', 0)
            .attr('y2', height)
            .style('stroke', '#e0e0e0')
            .style('stroke-dasharray', '2,2');

        // Add median line (diagonal)
        svg.append('line')
            .attr('class', 'median-line')
            .attr('x1', 0)
            .attr('y1', height)
            .attr('x2', width)
            .attr('y2', 0)
            .style('stroke', this.colors.danger)
            .style('stroke-width', 2)
            .style('stroke-dasharray', '5,5');

        // Add axes
        const xAxis = d3.axisBottom(xScale);
        const yAxis = d3.axisLeft(yScale);

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis);

        svg.append('g')
            .call(yAxis);

        // Add axis labels
        svg.append('text')
            .attr('class', 'axis-label')
            .attr('x', width / 2)
            .attr('y', height + 50)
            .style('text-anchor', 'middle')
            .style('fill', 'var(--text-primary)')
            .text('Медіанне значення');

        svg.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -50)
            .style('text-anchor', 'middle')
            .style('fill', 'var(--text-primary)')
            .text('Значення ЗВО');

        // Add points
        svg.selectAll('.dot')
            .data(points)
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('cx', d => xScale(d.median))
            .attr('cy', d => yScale(d.value))
            .attr('r', d => 3 + d.weight)
            .style('fill', d => d.diff > 0 ? this.colors.success : this.colors.danger)
            .style('opacity', 0.7)
            .style('stroke', '#fff')
            .style('stroke-width', 1)
            .on('mouseover', function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', d.weight + 6)
                    .style('opacity', 1);

                tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);

                tooltip.html(`
                    <div class="tooltip-title">${d.indicator}</div>
                    <div class="tooltip-content">
                        <div class="tooltip-row">
                            <span class="tooltip-label">Значення:</span>
                            <span class="tooltip-value">${d.value.toFixed(2)}</span>
                        </div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">Медіана:</span>
                            <span class="tooltip-value">${d.median.toFixed(2)}</span>
                        </div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">Різниця:</span>
                            <span class="tooltip-value" style="color: ${d.diff > 0 ? '#10b981' : '#ef4444'}">
                                ${d.diff > 0 ? '+' : ''}${d.diff.toFixed(2)}
                            </span>
                        </div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">Вага:</span>
                            <span class="tooltip-value">${d.weight}</span>
                        </div>
                    </div>
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', d.weight + 3)
                    .style('opacity', 0.7);

                tooltip.transition()
                    .duration(200)
                    .style('opacity', 0);
            });

        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -20)
            .style('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .style('fill', 'var(--text-primary)')
            .text('Позиція відносно медіани (вище лінії = краще за медіану)');
    }

    /**
     * Create heatmap for top 10 institutions
     */
    createHeatmap(topInstitutions, methodology, container) {
        // Clear container
        d3.select(container).selectAll('*').remove();

        if (topInstitutions.length === 0) {
            d3.select(container)
                .append('p')
                .style('text-align', 'center')
                .style('color', 'var(--text-secondary)')
                .text('Немає даних для відображення');
            return;
        }

        // Prepare data
        const indicators = Object.keys(methodology.indicators);
        const institutions = topInstitutions.map(d =>
            d['Назва Установи / Середньорічні показники'] ||
            d['Назва установи / Закладу вищої освіти'] ||
            'Невідомо'
        );

        const heatmapData = [];
        topInstitutions.forEach((inst, i) => {
            indicators.forEach(indicator => {
                const dataKey = Object.keys(inst).find(key =>
                    key.includes(`Нормований індикатор ${indicator}*`)
                );

                if (dataKey) {
                    const value = inst[dataKey];
                    if (value !== null && !isNaN(value)) {
                        heatmapData.push({
                            institution: institutions[i],
                            indicator: indicator,
                            value: value
                        });
                    }
                }
            });
        });

        // If no data found (because all_results doesn't have indicators), show message
        if (heatmapData.length === 0) {
            d3.select(container)
                .append('p')
                .style('text-align', 'center')
                .style('color', 'var(--text-secondary)')
                .text('Дані індикаторів недоступні для цього напряму');
            return;
        }

        // Set dimensions
        const margin = { top: 80, right: 40, bottom: 100, left: 250 };
        const cellWidth = 25;
        const cellHeight = 30;
        const width = indicators.length * cellWidth;
        const height = institutions.length * cellHeight;

        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales
        const xScale = d3.scaleBand()
            .domain(indicators)
            .range([0, width])
            .padding(0.05);

        const yScale = d3.scaleBand()
            .domain(institutions)
            .range([0, height])
            .padding(0.05);

        // Color scale
        const maxValue = d3.max(heatmapData, d => d.value);
        const colorScale = d3.scaleSequential()
            .domain([0, maxValue])
            .interpolator(d3.interpolateRgb('#fee', '#d00'));

        // Create tooltip
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'chart-tooltip')
            .style('position', 'absolute')
            .style('opacity', 0);

        // Add cells
        svg.selectAll('.cell')
            .data(heatmapData)
            .enter()
            .append('rect')
            .attr('class', 'cell')
            .attr('x', d => xScale(d.indicator))
            .attr('y', d => yScale(d.institution))
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .style('fill', d => colorScale(d.value))
            .style('stroke', '#fff')
            .style('stroke-width', 1)
            .on('mouseover', function (event, d) {
                d3.select(this)
                    .style('stroke', 'var(--text-primary)')
                    .style('stroke-width', 2);

                tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);

                tooltip.html(`
                    <div class="tooltip-title">${d.indicator}</div>
                    <div class="tooltip-content">
                        <div class="tooltip-row">
                            <span class="tooltip-label">ЗВО:</span>
                            <span class="tooltip-value">${d.institution}</span>
                        </div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">Значення:</span>
                            <span class="tooltip-value">${d.value.toFixed(2)}</span>
                        </div>
                    </div>
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this)
                    .style('stroke', '#fff')
                    .style('stroke-width', 1);

                tooltip.transition()
                    .duration(200)
                    .style('opacity', 0);
            });

        // Add x-axis
        svg.append('g')
            .selectAll('text')
            .data(indicators)
            .enter()
            .append('text')
            .attr('class', 'indicator-label')
            .attr('x', d => xScale(d) + xScale.bandwidth() / 2)
            .attr('y', -10)
            .style('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', 'var(--text-secondary)')
            .text(d => d);

        // Add y-axis
        svg.append('g')
            .selectAll('text')
            .data(institutions)
            .enter()
            .append('text')
            .attr('class', 'institution-label')
            .attr('x', -10)
            .attr('y', d => yScale(d) + yScale.bandwidth() / 2)
            .style('text-anchor', 'end')
            .style('font-size', '12px')
            .style('fill', 'var(--text-primary)')
            .style('alignment-baseline', 'middle')
            .text(d => {
                // Truncate long names
                if (!d) return '';
                return d.length > 40 ? d.substring(0, 37) + '...' : d;
            });

        // Add legend
        this.addHeatmapLegend(container, colorScale, maxValue);
    }

    /**
     * Add legend for heatmap
     */
    addHeatmapLegend(container, colorScale, maxValue) {
        const legendContainer = d3.select(container)
            .append('div')
            .attr('class', 'heatmap-legend');

        legendContainer.append('span')
            .attr('class', 'heatmap-scale-label')
            .text('0');

        const scale = legendContainer.append('div')
            .attr('class', 'heatmap-scale');

        // Create gradient
        const steps = 10;
        for (let i = 0; i < steps; i++) {
            const value = (maxValue / steps) * i;
            scale.append('div')
                .attr('class', 'heatmap-scale-item')
                .style('background-color', colorScale(value));
        }

        legendContainer.append('span')
            .attr('class', 'heatmap-scale-label')
            .text(maxValue.toFixed(1));
    }

    /**
     * Cleanup tooltips
     */
    cleanup() {
        d3.selectAll('.chart-tooltip').remove();
    }
}

export default Visualizations;
