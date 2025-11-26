/**
 * Main Application Module
 * Coordinates all functionality
 */

import DataLoader from './data-loader.js';
import Charts from './charts.js';
import Visualizations from './visualizations.js';
import Compare from './compare.js';
import Recommendations from './recommendations.js';

class App {
    constructor() {
        this.dataLoader = new DataLoader();
        this.charts = new Charts();
        this.visualizations = new Visualizations();
        this.compare = new Compare(this.dataLoader);
        this.recommendations = new Recommendations();

        this.data = null;
        this.currentInstitution = 'Криворізький державний педагогічний університет';
        this.currentDirection = null; // null means all directions, or use "Суспільний", "Аграрно-ветеринарний"
        this.selectedCompareInstitutions = [];

        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        this.setupTheme();
        this.setupEventListeners();
        await this.loadData();
        this.populateSelects();

        // Auto-select default institution and analyze
        const mainSelect = document.getElementById('mainInstitution');
        if (mainSelect) {
            mainSelect.value = this.currentInstitution;
            this.analyzeData();
        }
    }

    /**
     * Setup theme toggle
     */
    setupTheme() {
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
            });
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        const exportPDF = document.getElementById('exportPDF');
        const exportExcel = document.getElementById('exportExcel');
        const mainInstitution = document.getElementById('mainInstitution');
        const scienceDirection = document.getElementById('scienceDirection');

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeData());
        }

        if (exportPDF) {
            exportPDF.addEventListener('click', () => this.exportToPDF());
        }

        if (exportExcel) {
            exportExcel.addEventListener('click', () => this.exportToExcel());
        }

        if (mainInstitution) {
            mainInstitution.addEventListener('change', (e) => {
                this.currentInstitution = e.target.value;
            });
        }

        if (scienceDirection) {
            scienceDirection.addEventListener('change', (e) => {
                this.currentDirection = e.target.value || null;
            });
        }
    }

    /**
     * Load all data
     */
    async loadData() {
        this.showLoading(true);
        try {
            this.data = await this.dataLoader.loadAll();
            this.hideError();
        } catch (error) {
            this.showError(error.message);
            console.error('Error loading data:', error);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Populate select dropdowns
     */
    populateSelects() {
        if (!this.data) return;

        const institutions = this.dataLoader.getInstitutions(this.data);
        const mainSelect = document.getElementById('mainInstitution');
        const compareSelects = document.querySelectorAll('.compare-select');

        // Populate main institution select
        if (mainSelect) {
            mainSelect.innerHTML = '<option value="">-- Оберіть ЗВО --</option>';
            institutions.forEach(inst => {
                const option = document.createElement('option');
                option.value = inst;
                option.textContent = inst;
                if (inst === this.currentInstitution) {
                    option.selected = true;
                }
                mainSelect.appendChild(option);
            });
        }

        // Populate comparison selects
        compareSelects.forEach(select => {
            select.innerHTML = '<option value="">-- Оберіть ЗВО --</option>';
            institutions.forEach(inst => {
                const option = document.createElement('option');
                option.value = inst;
                option.textContent = inst;
                select.appendChild(option);
            });
        });

        // Update date
        const dateElement = document.getElementById('dataUpdateDate');
        if (dateElement) {
            dateElement.textContent = new Date().toLocaleDateString('uk-UA');
        }
    }

    /**
     * Analyze data and display results
     */
    async analyzeData() {
        if (!this.data) {
            this.showError('Дані не завантажені');
            return;
        }

        if (!this.currentInstitution) {
            this.showError('Оберіть ЗВО для аналізу');
            return;
        }

        this.showLoading(true);

        try {
            // Get main institution data
            const institutionData = this.dataLoader.getInstitutionData(
                this.data.allResults,
                this.currentInstitution,
                this.currentDirection
            );

            if (institutionData.length === 0) {
                throw new Error('Не знайдено даних для обраного ЗВО та напряму');
            }

            const mainData = institutionData[0];
            const indicators = this.dataLoader.getIndicators(
                this.currentInstitution,
                this.data.detali
            );
            const blockScores = this.dataLoader.calculateBlockScores(
                indicators,
                this.data.methodology
            );

            // Get comparison data
            const compareSelects = document.querySelectorAll('.compare-select');
            this.selectedCompareInstitutions = Array.from(compareSelects)
                .map(select => select.value)
                .filter(value => value && value.trim() !== '');

            const compareData = await this.compare.getComparisonData(
                this.selectedCompareInstitutions,
                this.currentDirection,
                this.data.allResults,
                this.data.methodology,
                this.data.detali
            );

            // Get median values
            const medianValues = this.dataLoader.getMedianValues(
                this.data.medians,
                this.currentDirection
            );

            // Get top 10 institutions
            const topInstitutions = this.dataLoader.getTopInstitutions(
                this.data.allResults,
                this.currentDirection,
                10
            );

            // Get first and last institutions in each category (А, Б, В) for heatmap
            const categoryInstitutions = [];
            const directionResults = this.data.allResults.filter(inst => {
                const direction = inst['Напрям'] || inst['Категорія'] || '';
                return direction.includes(this.currentDirection);
            });

            // Group by category (А, Б, В)
            const groupsByCategory = {
                'А': [],
                'Б': [],
                'В': []
            };

            directionResults.forEach(inst => {
                const group = inst['Група'];
                if (groupsByCategory[group]) {
                    groupsByCategory[group].push(inst);
                }
            });

            // Sort each group by score and get first and last
            ['А', 'Б', 'В'].forEach(category => {
                const institutions = groupsByCategory[category];
                if (institutions.length > 0) {
                    // Sort by score descending
                    institutions.sort((a, b) => {
                        const scoreA = a['Попередня атестаційна оцінка'] || a['Атестаційна оцінка'] || 0;
                        const scoreB = b['Попередня атестаційна оцінка'] || b['Атестаційна оцінка'] || 0;
                        return scoreB - scoreA;
                    });

                    // Add first (highest score)
                    categoryInstitutions.push(institutions[0]);

                    // Add last (lowest score) if different from first
                    if (institutions.length > 1) {
                        categoryInstitutions.push(institutions[institutions.length - 1]);
                    }
                }
            });

            // Add category institutions to comparison data
            categoryInstitutions.forEach(inst => {
                const instName = inst['Назва Установи / Середньорічні показники'] ||
                                inst['Назва установи / Закладу вищої освіти'];
                const group = inst['Група'] || '?';

                // Check if not already in compareData
                const alreadyExists = compareData.some(comp => comp.name === instName);
                if (!alreadyExists) {
                    const indicators = this.dataLoader.getIndicators(instName, this.data.detali);
                    const blockScores = this.dataLoader.calculateBlockScores(
                        indicators,
                        this.data.methodology
                    );
                    compareData.push({
                        name: `${instName} (${group})`,
                        indicators: indicators,
                        blockScores: blockScores
                    });
                }
            });

            // Get indicators for top institutions
            const topInstitutionsWithIndicators = topInstitutions.map(inst => {
                const name = inst['Назва Установи / Середньорічні показники'] ||
                            inst['Назва установи / Закладу вищої освіти'];
                const indicators = this.dataLoader.getIndicators(name, this.data.detali);
                return { name, indicators };
            });

            // Display institution info
            this.displayInstitutionInfo(mainData);

            // Create details table first to establish indicator order
            const orderedIndicatorKeys = this.createDetailsTable(mainData, indicators, this.data.methodology, medianValues);

            // Create visualizations with ordered indicators
            this.createVisualizations(
                mainData,
                indicators,
                blockScores,
                compareData,
                medianValues,
                topInstitutionsWithIndicators,
                orderedIndicatorKeys,
                categoryInstitutions
            );

            // Generate recommendations
            this.generateRecommendations(
                indicators,
                blockScores,
                medianValues,
                mainData['Група']
            );

            // Show visualizations section
            document.getElementById('visualizations').classList.remove('hidden');
            document.getElementById('institutionInfo').classList.remove('hidden');

            this.hideError();
        } catch (error) {
            this.showError(error.message);
            console.error('Error analyzing data:', error);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Display institution information
     */
    displayInstitutionInfo(data) {
        const container = document.getElementById('infoContent');
        if (!container) return;

        const group = data['Група'] || '?';
        const groupClass = `group-${group.toLowerCase()}`;

        container.innerHTML = `
            <div class="info-item">
                <div class="label">Назва закладу</div>
                <div class="value">${data['Назва Установи / Середньорічні показники'] || data['Назва установи / Закладу вищої освіти'] || 'Н/Д'}</div>
            </div>
            <div class="info-item">
                <div class="label">Регіон</div>
                <div class="value">${data['Регіон'] || 'Н/Д'}</div>
            </div>
            <div class="info-item">
                <div class="label">Область</div>
                <div class="value">${data['Область'] || 'Н/Д'}</div>
            </div>
            <div class="info-item">
                <div class="label">Науковий напрям</div>
                <div class="value">${this.getScienceDirectionName(data['Напрям'])}</div>
            </div>
            <div class="info-item">
                <div class="label">Атестаційна оцінка</div>
                <div class="value">${data['Попередня атестаційна оцінка'] !== null ? data['Попередня атестаційна оцінка'].toFixed(2) : 'Н/Д'}</div>
            </div>
            <div class="info-item">
                <div class="label">Група</div>
                <div class="value">
                    <span class="group-badge ${groupClass}">Група ${group}</span>
                </div>
            </div>
            <div class="info-item">
                <div class="label">Зважена сумарна оцінка</div>
                <div class="value">${data['Зважена сумарна оцінка (80/20)'] !== null && data['Зважена сумарна оцінка (80/20)'] !== undefined ? data['Зважена сумарна оцінка (80/20)'].toFixed(2) : 'Н/Д'}</div>
            </div>
            <div class="info-item">
                <div class="label">Нормована оцінка</div>
                <div class="value">${data['Нормована зважена сумарна оцінка'] !== null && data['Нормована зважена сумарна оцінка'] !== undefined ? data['Нормована зважена сумарна оцінка'].toFixed(2) : 'Н/Д'}</div>
            </div>
        `;
    }

    /**
     * Get science direction name
     */
    getScienceDirectionName(direction) {
        // If direction is already a string name, return it directly
        if (typeof direction === 'string') {
            return direction;
        }

        // Otherwise, try to map from methodology
        const directions = this.data.methodology.science_directions;
        return directions[direction] || `Напрям ${direction}`;
    }

    /**
     * Create all visualizations
     */
    createVisualizations(mainData, indicators, blockScores, compareData, medianValues, topInstitutions, orderedIndicatorKeys, categoryInstitutions = []) {
        // Radar Chart
        const radarCanvas = document.getElementById('radarChart');
        if (radarCanvas) {
            this.charts.createRadarChart(
                blockScores,
                compareData,
                this.data.methodology,
                radarCanvas
            );
        }

        // Bar Chart with ordered indicators
        const barCanvas = document.getElementById('barChart');
        if (barCanvas) {
            this.charts.createBarChart(
                indicators,
                compareData,
                this.data.methodology,
                barCanvas,
                orderedIndicatorKeys,
                medianValues,
                (key) => this.getIndicatorName(key)
            );
        }

        // Heatmap with all relevant institutions (main, top 10, and comparison)
        const heatmapContainer = document.getElementById('heatmap');
        if (heatmapContainer) {
            const mainInstitutionName = mainData['Назва Установи / Середньорічні показники'] ||
                                       mainData['Назва установи / Закладу вищої освіти'];

            // Get comparison names
            const comparisonNames = compareData.map(comp => comp.name);

            // Collect all institutions to include
            const allInstitutionsMap = new Map();

            // Add main institution
            const mainScore = mainData['Попередня атестаційна оцінка'] || mainData['Атестаційна оцінка'] || 0;
            const mainGroup = mainData['Група'] || '?';
            allInstitutionsMap.set(mainInstitutionName, {
                name: mainInstitutionName,
                indicators: indicators,
                score: mainScore,
                group: mainGroup,
                isMain: true,
                isComparison: false
            });

            // Add top 10 institutions
            topInstitutions.forEach(inst => {
                if (!allInstitutionsMap.has(inst.name)) {
                    const instData = this.dataLoader.getInstitutionData(
                        this.data.allResults,
                        inst.name,
                        this.currentDirection
                    )[0];
                    const score = instData ? (instData['Попередня атестаційна оцінка'] || instData['Атестаційна оцінка'] || 0) : 0;
                    const group = instData ? (instData['Група'] || '?') : '?';
                    allInstitutionsMap.set(inst.name, {
                        name: inst.name,
                        indicators: inst.indicators,
                        score: score,
                        group: group,
                        isMain: false,
                        isComparison: false
                    });
                }
            });

            // Add comparison institutions
            comparisonNames.forEach(compName => {
                if (!allInstitutionsMap.has(compName)) {
                    const compInst = compareData.find(c => c.name === compName);
                    const instData = this.dataLoader.getInstitutionData(
                        this.data.allResults,
                        compName,
                        this.currentDirection
                    )[0];
                    const score = instData ? (instData['Попередня атестаційна оцінка'] || instData['Атестаційна оцінка'] || 0) : 0;
                    const group = instData ? (instData['Група'] || '?') : '?';
                    if (compInst) {
                        allInstitutionsMap.set(compName, {
                            name: compName,
                            indicators: compInst.indicators,
                            score: score,
                            group: group,
                            isMain: false,
                            isComparison: true
                        });
                    }
                } else {
                    // Mark as comparison if already in map
                    const existing = allInstitutionsMap.get(compName);
                    existing.isComparison = true;
                }
            });

            // Add first and last institutions from each category
            categoryInstitutions.forEach(inst => {
                const instName = inst['Назва Установи / Середньорічні показники'] ||
                                inst['Назва установи / Закладу вищої освіти'];
                if (!allInstitutionsMap.has(instName)) {
                    const indicators = this.dataLoader.getIndicators(instName, this.data.detali);
                    const score = inst['Попередня атестаційна оцінка'] || inst['Атестаційна оцінка'] || 0;
                    const group = inst['Група'] || '?';
                    allInstitutionsMap.set(instName, {
                        name: instName,
                        indicators: indicators,
                        score: score,
                        group: group,
                        isMain: false,
                        isComparison: false
                    });
                }
            });

            // Convert to array and sort by score descending
            const allInstitutionsArray = Array.from(allInstitutionsMap.values())
                .sort((a, b) => b.score - a.score);

            this.visualizations.createHeatmap(
                allInstitutionsArray,
                this.data.methodology,
                heatmapContainer,
                orderedIndicatorKeys,
                (key) => this.getIndicatorName(key)
            );
        }

        // Dynamics Chart with comparison institutions
        const dynamicsCanvas = document.getElementById('dynamicsChart');
        if (dynamicsCanvas) {
            const mainInstitutionName = mainData['Назва Установи / Середньорічні показники'] ||
                                       mainData['Назва установи / Закладу вищої освіти'];
            const mainScore = mainData['Попередня атестаційна оцінка'] || mainData['Атестаційна оцінка'] || 0;
            const mainGroup = mainData['Група'] || '?';

            // Get names and scores of comparison institutions
            const comparisonWithScores = compareData.map(comp => {
                const compInstData = this.dataLoader.getInstitutionData(
                    this.data.allResults,
                    comp.name,
                    this.currentDirection
                )[0];
                const score = compInstData ? (compInstData['Попередня атестаційна оцінка'] || compInstData['Атестаційна оцінка'] || 0) : 0;
                const group = compInstData ? (compInstData['Група'] || '?') : '?';
                return { name: comp.name, score, group };
            });

            this.charts.createDynamicsChart(
                { name: mainInstitutionName, score: mainScore, group: mainGroup },
                this.data.dynamika,
                dynamicsCanvas,
                comparisonWithScores
            );
        }
    }

    /**
     * Create details table and return ordered indicator keys
     */
    createDetailsTable(mainData, indicators, methodology, medianValues) {
        const tbody = document.querySelector('#detailsTable tbody');
        if (!tbody) return [];

        tbody.innerHTML = '';

        // Create array of indicators with their data
        const indicatorArray = [];
        Object.entries(methodology.indicators).forEach(([key, weight]) => {
            const value = indicators[key];

            // Skip indicators with no data (null or undefined)
            if (value === null || value === undefined) {
                return;
            }

            const median = medianValues[key] || null;
            indicatorArray.push({ key, value, weight, median });
        });

        // Sort by contribution (value * weight) descending
        indicatorArray.sort((a, b) => (b.value * b.weight) - (a.value * a.weight));

        // Store the ordered keys for use in other visualizations
        this.orderedIndicatorKeys = indicatorArray.map(item => item.key);

        // Create table rows
        indicatorArray.forEach(({ key, value, weight, median }) => {
            const normalizedValue = value !== null ? value : 0;
            const contribution = normalizedValue * weight;

            const row = tbody.insertRow();

            // Add background color based on comparison with median
            if (median !== null && median !== undefined && median !== 0) {
                if (value > median) {
                    row.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'; // Light green for above median
                } else if (value < median) {
                    row.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; // Light red for below median
                }
            }

            row.innerHTML = `
                <td><strong>${key}</strong></td>
                <td>${this.getIndicatorName(key)}</td>
                <td>${value !== null ? value.toFixed(4) : 'Н/Д'}</td>
                <td>${median !== null ? median.toFixed(4) : 'Н/Д'}</td>
                <td>${normalizedValue.toFixed(4)}</td>
                <td>${weight}</td>
                <td>${contribution.toFixed(4)}</td>
            `;
        });

        return this.orderedIndicatorKeys;
    }

    /**
     * Get indicator name from detali data
     */
    getIndicatorName(indicator) {
        if (!this.data || !this.data.detali) {
            return '';
        }

        // Find the first occurrence of this indicator in detali data
        const detaliItem = this.data.detali.find(item => {
            const indicatorName = item['Назва показника'];
            if (!indicatorName) return false;

            // Match indicator pattern (e.g., "І3" or "I3")
            const match = indicatorName.match(/[ІI](\d+)/);
            return match && `I${match[1]}` === indicator;
        });

        if (detaliItem && detaliItem['Назва показника']) {
            // Extract the descriptive part (without the indicator code)
            const fullName = detaliItem['Назва показника'];
            // Remove the indicator code pattern (e.g., "П6, І3" or "І15")
            let cleaned = fullName
                .replace(/[ПРФ]?\d+,?\s*[ІI]\d+/g, '')
                .replace(/^[ІI]\d+\.?\s*/g, '')  // Remove indicator at the start
                .replace(/[,\s]+$/, '')  // Remove trailing commas/spaces
                .replace(/^[,\s]+/, '')  // Remove leading commas/spaces
                .trim();

            // If cleaning resulted in empty string, return the full name
            return cleaned || fullName;
        }

        return '';
    }

    /**
     * Generate recommendations
     */
    generateRecommendations(indicators, blockScores, medianValues, group) {
        const recommendations = this.recommendations.generateRecommendations(
            indicators,
            blockScores,
            medianValues,
            this.data.methodology,
            group
        );

        const container = document.getElementById('recommendations');
        if (container) {
            this.recommendations.renderRecommendations(recommendations, container);
        }
    }

    /**
     * Export to PDF
     */
    async exportToPDF() {
        const element = document.querySelector('.main-content');
        const opt = {
            margin: 10,
            filename: `attestation_analysis_${this.currentInstitution}_${Date.now()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            await html2pdf().set(opt).from(element).save();
        } catch (error) {
            this.showError('Помилка експорту в PDF: ' + error.message);
        }
    }

    /**
     * Export to Excel
     */
    exportToExcel() {
        if (!this.data) return;

        const institutionData = this.dataLoader.getInstitutionData(
            this.data.allResults,
            this.currentInstitution,
            this.currentDirection
        );

        if (institutionData.length === 0) return;

        const mainData = institutionData[0];
        const indicators = this.dataLoader.getIndicators(mainData);

        // Prepare data for Excel
        const excelData = [];
        excelData.push(['Індикатор', 'Значення', 'Вага']);

        Object.entries(this.data.methodology.indicators).forEach(([key, weight]) => {
            excelData.push([
                key,
                indicators[key] || 0,
                weight
            ]);
        });

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, 'Показники');

        // Save file
        XLSX.writeFile(wb, `attestation_${this.currentInstitution}_${Date.now()}.xlsx`);
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        const loader = document.getElementById('loadingIndicator');
        if (loader) {
            loader.classList.toggle('hidden', !show);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
} else {
    new App();
}
