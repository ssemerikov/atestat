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
                this.data.methodology
            );

            // Get median values
            const medianValues = this.dataLoader.getMedianValues(
                this.data.medians,
                this.currentDirection
            );

            // Get top institutions
            const topInstitutions = this.dataLoader.getTopInstitutions(
                this.data.allResults,
                this.currentDirection,
                10
            );

            // Display institution info
            this.displayInstitutionInfo(mainData);

            // Create visualizations
            this.createVisualizations(
                mainData,
                indicators,
                blockScores,
                compareData,
                medianValues,
                topInstitutions
            );

            // Create details table
            this.createDetailsTable(mainData, indicators, this.data.methodology);

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
                <div class="value">${data['Назва установи / Закладу вищої освіти'] || 'Н/Д'}</div>
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
                <div class="value">${data['Атестаційна оцінка'] !== null ? data['Атестаційна оцінка'].toFixed(2) : 'Н/Д'}</div>
            </div>
            <div class="info-item">
                <div class="label">Група</div>
                <div class="value">
                    <span class="group-badge ${groupClass}">Група ${group}</span>
                </div>
            </div>
            <div class="info-item">
                <div class="label">Класифікаційна оцінка</div>
                <div class="value">${data['Класифікаційна оцінка'] !== null ? data['Класифікаційна оцінка'].toFixed(2) : 'Н/Д'}</div>
            </div>
            <div class="info-item">
                <div class="label">Експертна оцінка</div>
                <div class="value">${data['Експертна оцінка'] !== null ? data['Експертна оцінка'].toFixed(2) : 'Н/Д'}</div>
            </div>
        `;
    }

    /**
     * Get science direction name
     */
    getScienceDirectionName(direction) {
        const directions = this.data.methodology.science_directions;
        return directions[direction] || `Напрям ${direction}`;
    }

    /**
     * Create all visualizations
     */
    createVisualizations(mainData, indicators, blockScores, compareData, medianValues, topInstitutions) {
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

        // Bar Chart
        const barCanvas = document.getElementById('barChart');
        if (barCanvas) {
            this.charts.createBarChart(
                indicators,
                compareData,
                this.data.methodology,
                barCanvas
            );
        }

        // Scatter Plot
        const scatterContainer = document.getElementById('scatterPlot');
        if (scatterContainer) {
            this.visualizations.createScatterPlot(
                { main: mainData },
                medianValues,
                this.data.methodology,
                scatterContainer
            );
        }

        // Heatmap
        const heatmapContainer = document.getElementById('heatmap');
        if (heatmapContainer) {
            this.visualizations.createHeatmap(
                topInstitutions,
                this.data.methodology,
                heatmapContainer
            );
        }
    }

    /**
     * Create details table
     */
    createDetailsTable(mainData, indicators, methodology) {
        const tbody = document.querySelector('#detailsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        Object.entries(methodology.indicators).forEach(([key, weight]) => {
            const value = indicators[key];
            const normalizedValue = value !== null ? value : 0;
            const contribution = normalizedValue * weight;

            const row = tbody.insertRow();
            row.innerHTML = `
                <td><strong>${key}</strong></td>
                <td>${this.getIndicatorName(key, mainData)}</td>
                <td>${value !== null ? value.toFixed(4) : 'Н/Д'}</td>
                <td>${normalizedValue.toFixed(4)}</td>
                <td>${weight}</td>
                <td>${contribution.toFixed(4)}</td>
            `;
        });
    }

    /**
     * Get indicator name from data
     */
    getIndicatorName(indicator, data) {
        const key = Object.keys(data).find(k =>
            k.includes(`Індикатор ${indicator} `) ||
            k.includes(`Нормований індикатор ${indicator}*`)
        );

        if (key) {
            const parts = key.split(' ');
            return parts.slice(2).join(' ');
        }

        return indicator;
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
