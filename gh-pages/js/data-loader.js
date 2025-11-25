/**
 * Data Loader Module
 * Handles loading and caching of JSON data files
 */

class DataLoader {
    constructor() {
        this.cache = {
            allResults: null,
            methodology: null,
            statsByDirection: null,
            validation: null
        };
        this.baseURL = './data/';
    }

    /**
     * Load all necessary data files
     */
    async loadAll() {
        try {
            const [allResults, methodology, statsByDirection, validation] = await Promise.all([
                this.loadAllResults(),
                this.loadMethodology(),
                this.loadStatsByDirection(),
                this.loadValidation()
            ]);

            return {
                allResults,
                methodology,
                statsByDirection,
                validation
            };
        } catch (error) {
            console.error('Error loading data:', error);
            throw new Error('Не вдалося завантажити дані. Перевірте з\'єднання та спробуйте ще раз.');
        }
    }

    /**
     * Load all results data
     */
    async loadAllResults() {
        if (this.cache.allResults) {
            return this.cache.allResults;
        }

        const response = await fetch(`${this.baseURL}all_results.json`);
        if (!response.ok) {
            throw new Error('Failed to load all_results.json');
        }

        const data = await response.json();
        this.cache.allResults = this.processAllResults(data);
        return this.cache.allResults;
    }

    /**
     * Load methodology data
     */
    async loadMethodology() {
        if (this.cache.methodology) {
            return this.cache.methodology;
        }

        const response = await fetch(`${this.baseURL}methodology.json`);
        if (!response.ok) {
            throw new Error('Failed to load methodology.json');
        }

        this.cache.methodology = await response.json();
        return this.cache.methodology;
    }

    /**
     * Load statistics by direction
     */
    async loadStatsByDirection() {
        if (this.cache.statsByDirection) {
            return this.cache.statsByDirection;
        }

        const response = await fetch(`${this.baseURL}stats_by_direction.json`);
        if (!response.ok) {
            throw new Error('Failed to load stats_by_direction.json');
        }

        this.cache.statsByDirection = await response.json();
        return this.cache.statsByDirection;
    }

    /**
     * Load validation data
     */
    async loadValidation() {
        if (this.cache.validation) {
            return this.cache.validation;
        }

        const response = await fetch(`${this.baseURL}validation.json`);
        if (!response.ok) {
            throw new Error('Failed to load validation.json');
        }

        this.cache.validation = await response.json();
        return this.cache.validation;
    }

    /**
     * Process all results to handle NaN values and clean data
     */
    processAllResults(data) {
        return data.map(item => {
            const processed = {};
            for (const [key, value] of Object.entries(item)) {
                // Handle NaN values
                if (value === 'NaN' || (typeof value === 'number' && isNaN(value))) {
                    processed[key] = null;
                } else {
                    processed[key] = value;
                }
            }
            return processed;
        }).filter(item => {
            // Filter out completely empty rows
            return item['Назва установи / Закладу вищої освіти'] !== null;
        });
    }

    /**
     * Get list of all institutions
     */
    getInstitutions(data) {
        const institutions = new Set();
        data.allResults.forEach(item => {
            const name = item['Назва установи / Закладу вищої освіти'];
            if (name && name.trim()) {
                institutions.add(name.trim());
            }
        });
        return Array.from(institutions).sort();
    }

    /**
     * Get data for specific institution
     */
    getInstitutionData(allResults, institutionName, direction = 0) {
        const results = allResults.filter(item => {
            const nameMatch = item['Назва установи / Закладу вищої освіти'] === institutionName;
            if (direction === 0) {
                return nameMatch;
            }
            return nameMatch && item['Напрям'] == direction;
        });

        return results;
    }

    /**
     * Get indicators for institution
     */
    getIndicators(institutionData) {
        const indicators = {};

        for (let i = 1; i <= 37; i++) {
            const indicatorKey = `I${i}`;
            const normalizedKey = `Нормований індикатор ${indicatorKey}*`;

            // Find the key in the data that contains this indicator
            const dataKey = Object.keys(institutionData).find(key =>
                key.includes(`Нормований індикатор ${indicatorKey}*`)
            );

            if (dataKey) {
                indicators[indicatorKey] = institutionData[dataKey];
            } else {
                indicators[indicatorKey] = null;
            }
        }

        return indicators;
    }

    /**
     * Calculate block scores from indicators
     */
    calculateBlockScores(indicators, methodology) {
        const blockScores = {};

        for (const [blockName, indicatorList] of Object.entries(methodology.blocks)) {
            let blockScore = 0;
            let validCount = 0;

            indicatorList.forEach(indicatorKey => {
                const value = indicators[indicatorKey];
                const weight = methodology.indicators[indicatorKey];

                if (value !== null && !isNaN(value) && weight) {
                    blockScore += value * weight;
                    validCount++;
                }
            });

            blockScores[blockName] = validCount > 0 ? blockScore : 0;
        }

        return blockScores;
    }

    /**
     * Get median values for all indicators
     */
    getMedianValues(allResults, direction = 0) {
        const filteredData = direction === 0
            ? allResults
            : allResults.filter(item => item['Напрям'] == direction);

        const medians = {};

        for (let i = 1; i <= 37; i++) {
            const indicatorKey = `I${i}`;
            const dataKey = Object.keys(filteredData[0] || {}).find(key =>
                key.includes(`Нормований індикатор ${indicatorKey}*`)
            );

            if (dataKey) {
                const values = filteredData
                    .map(item => item[dataKey])
                    .filter(val => val !== null && !isNaN(val))
                    .sort((a, b) => a - b);

                if (values.length > 0) {
                    const mid = Math.floor(values.length / 2);
                    medians[indicatorKey] = values.length % 2 === 0
                        ? (values[mid - 1] + values[mid]) / 2
                        : values[mid];
                } else {
                    medians[indicatorKey] = 0;
                }
            }
        }

        return medians;
    }

    /**
     * Get top N institutions by score
     */
    getTopInstitutions(allResults, direction = 0, n = 10) {
        const filteredData = direction === 0
            ? allResults
            : allResults.filter(item => item['Напрям'] == direction);

        return filteredData
            .filter(item => item['Атестаційна оцінка'] !== null)
            .sort((a, b) => b['Атестаційна оцінка'] - a['Атестаційна оцінка'])
            .slice(0, n);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache = {
            allResults: null,
            methodology: null,
            statsByDirection: null,
            validation: null
        };
    }
}

export default DataLoader;
