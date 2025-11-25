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
            detali: null,
            medians: null,
            dynamika: null
        };
        this.baseURL = './data/';
    }

    /**
     * Load all necessary data files
     */
    async loadAll() {
        try {
            const [allResults, methodology, statsByDirection, detali, medians, dynamika] = await Promise.all([
                this.loadAllResults(),
                this.loadMethodology(),
                this.loadStatsByDirection(),
                this.loadDetali(),
                this.loadMedians(),
                this.loadDynamika()
            ]);

            return {
                allResults,
                methodology,
                statsByDirection,
                detali,
                medians,
                dynamika
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
     * Load detali data (detailed indicators)
     */
    async loadDetali() {
        if (this.cache.detali) {
            return this.cache.detali;
        }

        const response = await fetch(`${this.baseURL}detali.json`);
        if (!response.ok) {
            throw new Error('Failed to load detali.json');
        }

        this.cache.detali = await response.json();
        return this.cache.detali;
    }

    /**
     * Load medians data
     */
    async loadMedians() {
        if (this.cache.medians) {
            return this.cache.medians;
        }

        const response = await fetch(`${this.baseURL}medians.json`);
        if (!response.ok) {
            throw new Error('Failed to load medians.json');
        }

        this.cache.medians = await response.json();
        return this.cache.medians;
    }

    /**
     * Load dynamika data (time series)
     */
    async loadDynamika() {
        if (this.cache.dynamika) {
            return this.cache.dynamika;
        }

        const response = await fetch(`${this.baseURL}dynamika.json`);
        if (!response.ok) {
            throw new Error('Failed to load dynamika.json');
        }

        this.cache.dynamika = await response.json();
        return this.cache.dynamika;
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
            const nameField = item['Назва Установи / Середньорічні показники'] ||
                             item['Назва установи / Закладу вищої освіти'];
            return nameField !== null;
        });
    }

    /**
     * Get list of all institutions
     */
    getInstitutions(data) {
        const institutions = new Set();
        data.allResults.forEach(item => {
            const name = item['Назва Установи / Середньорічні показники'] ||
                        item['Назва установи / Закладу вищої освіти'];
            if (name && name.trim()) {
                institutions.add(name.trim());
            }
        });
        return Array.from(institutions).sort();
    }

    /**
     * Get data for specific institution
     */
    getInstitutionData(allResults, institutionName, directionName = null) {
        const results = allResults.filter(item => {
            const name = item['Назва Установи / Середньорічні показники'] ||
                        item['Назва установи / Закладу вищої освіти'];
            const nameMatch = name === institutionName;

            if (!directionName) {
                return nameMatch;
            }

            // Match by direction name (e.g., "Суспільний", "Аграрно-ветеринарний")
            return nameMatch && item['Напрям'] === directionName;
        });

        return results.length > 0 ? results[0] : null;
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
     * Get median values for indicators from medians.json
     */
    getMedianValues(medians, directionName = null, institutionType = null) {
        if (!medians || medians.length === 0) {
            return {};
        }

        // Filter medians by direction and institution type
        const filteredMedians = medians.filter(item => {
            let match = true;

            if (directionName && item['Напрям'] !== directionName) {
                match = false;
            }

            if (institutionType && item['Тип установи'] !== institutionType) {
                match = false;
            }

            return match;
        });

        // Convert to indicator => median mapping
        const medianValues = {};
        filteredMedians.forEach(item => {
            const indicator = item['Індикатор'];
            const median = item['Медіана'];
            if (indicator && median !== null && median !== undefined) {
                medianValues[indicator] = median;
            }
        });

        return medianValues;
    }

    /**
     * Get detailed indicator data for institution
     */
    getDetaliForInstitution(detali, institutionName) {
        if (!detali || detali.length === 0) {
            return [];
        }

        const nameField = 'Назва установи / Закладу вищої освіти';
        return detali.filter(item => item[nameField] === institutionName);
    }

    /**
     * Get time series data for institution
     */
    getDynamikaForInstitution(dynamika, institutionName) {
        if (!dynamika || dynamika.length === 0) {
            return [];
        }

        const nameField = 'Повне найменування наукової установи / закладу вищої освіти *';
        return dynamika.filter(item => item[nameField] === institutionName);
    }

    /**
     * Get time series data by indicator
     */
    getDynamikaByIndicator(dynamika, institutionName, indicator) {
        const institutionData = this.getDynamikaForInstitution(dynamika, institutionName);

        return institutionData
            .filter(item => item['Показник'] === indicator)
            .sort((a, b) => (a['Рік'] || 0) - (b['Рік'] || 0));
    }

    /**
     * Get top N institutions by score
     */
    getTopInstitutions(allResults, directionName = null, n = 10) {
        const filteredData = directionName
            ? allResults.filter(item => item['Напрям'] === directionName)
            : allResults;

        const scoreField = 'Попередня атестаційна оцінка';

        return filteredData
            .filter(item => item[scoreField] !== null && item[scoreField] !== undefined)
            .sort((a, b) => (b[scoreField] || 0) - (a[scoreField] || 0))
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
            detali: null,
            medians: null,
            dynamika: null
        };
    }
}

export default DataLoader;
