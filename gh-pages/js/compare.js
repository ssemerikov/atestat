/**
 * Comparison Module
 * Handles comparison between multiple institutions
 */

class Compare {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
    }

    /**
     * Get comparison data for selected institutions
     */
    async getComparisonData(institutionNames, direction, allResults, methodology) {
        const compareData = [];

        for (const name of institutionNames) {
            if (!name || name.trim() === '') continue;

            const institutionData = this.dataLoader.getInstitutionData(
                allResults,
                name,
                direction
            );

            if (institutionData.length > 0) {
                const data = institutionData[0];
                const indicators = this.dataLoader.getIndicators(data);
                const blockScores = this.dataLoader.calculateBlockScores(indicators, methodology);

                compareData.push({
                    name: name,
                    data: data,
                    indicators: indicators,
                    blockScores: blockScores,
                    attestationScore: data['Атестаційна оцінка'],
                    group: data['Група']
                });
            }
        }

        return compareData;
    }

    /**
     * Generate comparison table
     */
    generateComparisonTable(mainData, compareData, methodology) {
        const table = document.createElement('div');
        table.className = 'comparison-table';

        // Create header
        const header = document.createElement('div');
        header.className = 'comparison-header';
        header.innerHTML = '<h3>Порівняльна таблиця</h3>';
        table.appendChild(header);

        // Create grid
        const grid = document.createElement('div');
        grid.className = 'comparison-grid';

        // Main institution card
        const mainCard = this.createComparisonCard(
            mainData.name,
            mainData.attestationScore,
            mainData.group,
            true
        );
        grid.appendChild(mainCard);

        // Comparison cards
        compareData.forEach(data => {
            const card = this.createComparisonCard(
                data.name,
                data.attestationScore,
                data.group,
                false
            );
            grid.appendChild(card);
        });

        table.appendChild(grid);
        return table;
    }

    /**
     * Create comparison card
     */
    createComparisonCard(name, score, group, isMain) {
        const card = document.createElement('div');
        card.className = isMain ? 'comparison-card selected' : 'comparison-card';

        const groupClass = group ? `group-${group.toLowerCase()}` : 'group-unknown';

        card.innerHTML = `
            <div class="institution-name">${name}</div>
            <div class="score-display">${score !== null ? score.toFixed(2) : 'N/A'}</div>
            <span class="group-badge ${groupClass}">Група ${group || '?'}</span>
            ${isMain ? '<div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--primary);">Основний ЗВО</div>' : ''}
        `;

        return card;
    }

    /**
     * Calculate comparative statistics
     */
    calculateComparativeStats(mainIndicators, compareData, methodology) {
        const stats = {
            betterThan: 0,
            worseThan: 0,
            similar: 0,
            strengths: [],
            weaknesses: []
        };

        const indicatorKeys = Object.keys(methodology.indicators);

        indicatorKeys.forEach(key => {
            const mainValue = mainIndicators[key] || 0;
            const compareValues = compareData
                .map(d => d.indicators[key] || 0)
                .filter(v => v > 0);

            if (compareValues.length === 0) return;

            const avgCompare = compareValues.reduce((a, b) => a + b, 0) / compareValues.length;
            const diff = mainValue - avgCompare;
            const weight = methodology.indicators[key];

            if (Math.abs(diff) < 0.1) {
                stats.similar++;
            } else if (diff > 0) {
                stats.betterThan++;
                if (diff > 0.5 && weight >= 1) {
                    stats.strengths.push({
                        indicator: key,
                        diff: diff,
                        weight: weight
                    });
                }
            } else {
                stats.worseThan++;
                if (diff < -0.5 && weight >= 1) {
                    stats.weaknesses.push({
                        indicator: key,
                        diff: diff,
                        weight: weight
                    });
                }
            }
        });

        // Sort by impact (diff * weight)
        stats.strengths.sort((a, b) => (b.diff * b.weight) - (a.diff * a.weight));
        stats.weaknesses.sort((a, b) => (a.diff * a.weight) - (b.diff * b.weight));

        return stats;
    }

    /**
     * Generate comparison summary
     */
    generateComparisonSummary(stats) {
        const summary = document.createElement('div');
        summary.className = 'comparison-summary';

        summary.innerHTML = `
            <h3>Підсумок порівняння</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value" style="color: var(--success)">${stats.betterThan}</div>
                    <div class="stat-label">Індикаторів краще</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: var(--info)">${stats.similar}</div>
                    <div class="stat-label">Індикаторів на рівні</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: var(--danger)">${stats.worseThan}</div>
                    <div class="stat-label">Індикаторів гірше</div>
                </div>
            </div>
        `;

        if (stats.strengths.length > 0) {
            const strengthsList = document.createElement('div');
            strengthsList.innerHTML = '<h4>Головні переваги:</h4>';
            const ul = document.createElement('ul');
            stats.strengths.slice(0, 5).forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.indicator}: +${item.diff.toFixed(2)} (вага: ${item.weight})`;
                ul.appendChild(li);
            });
            strengthsList.appendChild(ul);
            summary.appendChild(strengthsList);
        }

        if (stats.weaknesses.length > 0) {
            const weaknessesList = document.createElement('div');
            weaknessesList.innerHTML = '<h4>Головні недоліки:</h4>';
            const ul = document.createElement('ul');
            stats.weaknesses.slice(0, 5).forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.indicator}: ${item.diff.toFixed(2)} (вага: ${item.weight})`;
                ul.appendChild(li);
            });
            weaknessesList.appendChild(ul);
            summary.appendChild(weaknessesList);
        }

        return summary;
    }

    /**
     * Export comparison data
     */
    exportComparison(mainData, compareData, format = 'json') {
        const exportData = {
            main: mainData,
            comparison: compareData,
            timestamp: new Date().toISOString()
        };

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `comparison_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        return exportData;
    }
}

export default Compare;
