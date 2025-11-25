/**
 * Recommendations Module
 * Generates automatic recommendations based on analysis
 */

class Recommendations {
    constructor() {
        this.priorityLevels = {
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low'
        };
    }

    /**
     * Generate recommendations based on indicators and comparison
     */
    generateRecommendations(indicators, blockScores, medianValues, methodology, group) {
        const recommendations = [];

        // Analyze each block
        Object.entries(blockScores).forEach(([blockName, score]) => {
            const blockIndicators = methodology.blocks[blockName];
            const blockRecommendations = this.analyzeBlock(
                blockName,
                blockIndicators,
                indicators,
                medianValues,
                methodology
            );
            recommendations.push(...blockRecommendations);
        });

        // Add group-specific recommendations
        const groupRecommendations = this.getGroupRecommendations(group, blockScores);
        recommendations.push(...groupRecommendations);

        // Sort by priority
        recommendations.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        return recommendations;
    }

    /**
     * Analyze specific block
     */
    analyzeBlock(blockName, blockIndicators, indicators, medianValues, methodology) {
        const recommendations = [];
        const weakIndicators = [];

        blockIndicators.forEach(indicatorKey => {
            const value = indicators[indicatorKey] || 0;
            const median = medianValues[indicatorKey] || 0;
            const weight = methodology.indicators[indicatorKey];

            if (value < median * 0.7 && weight >= 1) {
                weakIndicators.push({
                    key: indicatorKey,
                    value: value,
                    median: median,
                    weight: weight,
                    gap: median - value
                });
            }
        });

        if (weakIndicators.length > 0) {
            // Sort by impact (gap * weight)
            weakIndicators.sort((a, b) => (b.gap * b.weight) - (a.gap * a.weight));

            const topWeak = weakIndicators[0];
            const recommendation = this.createRecommendation(
                blockName,
                topWeak,
                this.priorityLevels.HIGH
            );
            recommendations.push(recommendation);
        }

        return recommendations;
    }

    /**
     * Create recommendation object
     */
    createRecommendation(blockName, indicator, priority) {
        const recommendations = {
            'Кадровий потенціал': {
                'I1': {
                    title: 'Підвищення кількості захистів докторів філософії',
                    description: 'Рекомендується активізувати роботу з аспірантами, забезпечити якісне наукове керівництво та створити умови для своєчасного захисту дисертацій.',
                    actions: [
                        'Проведення регулярних семінарів для аспірантів',
                        'Залучення досвідчених наукових керівників',
                        'Створення системи моніторингу прогресу аспірантів'
                    ]
                },
                'I2': {
                    title: 'Збільшення кількості докторів наук',
                    description: 'Необхідно стимулювати наукових працівників до здобуття наукового ступеня доктора наук.',
                    actions: [
                        'Надання фінансової підтримки для підготовки докторських дисертацій',
                        'Створення наукових шкіл',
                        'Забезпечення можливості стажування у провідних наукових центрах'
                    ]
                },
                'I3': {
                    title: 'Залучення молодих вчених',
                    description: 'Рекомендується активізувати роботу з залучення молодих науковців.',
                    actions: [
                        'Створення конкурентних умов праці для молоді',
                        'Програми підтримки молодих вчених',
                        'Надання можливостей для професійного розвитку'
                    ]
                },
                'I4': {
                    title: 'Збільшення штату наукових працівників',
                    description: 'Необхідно збільшити кількість наукових працівників за основним місцем роботи.',
                    actions: [
                        'Оптимізація штатного розпису',
                        'Залучення науковців з інших установ',
                        'Підвищення конкурентоспроможності заробітної плати'
                    ]
                }
            },
            'Фінансова діяльність': {
                'I8': {
                    title: 'Залучення міжнародних грантів (Horizon, NATO)',
                    description: 'Рекомендується активізувати роботу із залучення міжнародного грантового фінансування.',
                    actions: [
                        'Створення офісу з підтримки міжнародних проєктів',
                        'Навчання науковців написанню грантових заявок',
                        'Партнерство з європейськими університетами'
                    ]
                },
                'I9': {
                    title: 'Диверсифікація джерел фінансування',
                    description: 'Необхідно розширити спектр міжнародних грантових програм.',
                    actions: [
                        'Моніторинг доступних грантових програм',
                        'Підготовка конкурентних заявок',
                        'Розвиток міжнародної співпраці'
                    ]
                },
                'I11': {
                    title: 'Збільшення обсягів госпдоговірної діяльності',
                    description: 'Рекомендується активізувати співпрацю з бізнесом та державним сектором.',
                    actions: [
                        'Маркетинг наукових розробок',
                        'Участь у виставках та конференціях',
                        'Створення центру трансферу технологій'
                    ]
                }
            },
            'Публікаційна активність': {
                'I15': {
                    title: 'Підвищення публікаційної активності у Scopus/WoS',
                    description: 'Необхідно збільшити кількість публікацій у високорейтингових виданнях.',
                    actions: [
                        'Навчання науковців написанню англомовних статей',
                        'Фінансова підтримка публікацій',
                        'Співпраця з іноземними співавторами'
                    ]
                },
                'I16': {
                    title: 'Публікації у високоімпактних журналах',
                    description: 'Рекомендується орієнтуватися на журнали з високим імпакт-фактором.',
                    actions: [
                        'Аналіз топових журналів у своїй галузі',
                        'Підвищення якості досліджень',
                        'Міжнародна співпраця'
                    ]
                },
                'I19': {
                    title: 'Збільшення цитованості',
                    description: 'Необхідно працювати над підвищенням цитованості публікацій.',
                    actions: [
                        'Просування публікацій у наукових мережах',
                        'Участь у міжнародних конференціях',
                        'Якісні дослідження актуальних тем'
                    ]
                }
            },
            'Інтелектуальна власність': {
                'I26': {
                    title: 'Активізація патентної діяльності',
                    description: 'Рекомендується збільшити кількість охоронних документів на ОІВ.',
                    actions: [
                        'Підтримка патентування розробок',
                        'Навчання процедурам патентування',
                        'Фінансування патентної діяльності'
                    ]
                },
                'I29': {
                    title: 'Збільшення міжнародних патентів',
                    description: 'Необхідно активізувати міжнародне патентування.',
                    actions: [
                        'Оцінка комерційного потенціалу розробок',
                        'Партнерство з міжнародними компаніями',
                        'Фінансова підтримка міжнародного патентування'
                    ]
                }
            },
            'Конкурсне фінансування': {
                'I32': {
                    title: 'Участь у конкурсах НФД',
                    description: 'Рекомендується активно брати участь у конкурсах Національного фонду досліджень.',
                    actions: [
                        'Моніторинг конкурсів НФД',
                        'Підготовка якісних заявок',
                        'Формування сильних наукових колективів'
                    ]
                },
                'I37': {
                    title: 'Залучення інших джерел конкурсного фінансування',
                    description: 'Необхідно диверсифікувати джерела конкурсного фінансування.',
                    actions: [
                        'Пошук нових грантових програм',
                        'Участь у міжнародних конкурсах',
                        'Розвиток компетенцій з написання заявок'
                    ]
                }
            }
        };

        const blockRecs = recommendations[blockName] || {};
        const indicatorRec = blockRecs[indicator.key] || {
            title: `Покращення показника ${indicator.key}`,
            description: `Показник ${indicator.key} нижче медіани на ${indicator.gap.toFixed(2)}. Необхідно вжити заходів для його покращення.`,
            actions: ['Аналіз причин низького показника', 'Розробка плану покращення', 'Моніторинг прогресу']
        };

        return {
            block: blockName,
            indicator: indicator.key,
            title: indicatorRec.title,
            description: indicatorRec.description,
            actions: indicatorRec.actions,
            priority: priority,
            impact: indicator.gap * indicator.weight,
            currentValue: indicator.value,
            targetValue: indicator.median
        };
    }

    /**
     * Get recommendations based on attestation group
     */
    getGroupRecommendations(group, blockScores) {
        const recommendations = [];

        if (group === 'Г') {
            recommendations.push({
                title: 'КРИТИЧНА СИТУАЦІЯ: Не пройдено атестацію',
                description: 'ЗВО не пройшов атестацію. Необхідні термінові комплексні заходи для покращення всіх показників.',
                priority: this.priorityLevels.HIGH,
                actions: [
                    'Термінова розробка антикризової програми',
                    'Залучення зовнішніх експертів',
                    'Перегляд стратегії розвитку',
                    'Мобілізація всіх ресурсів'
                ]
            });
        } else if (group === 'В') {
            recommendations.push({
                title: 'Необхідне покращення показників',
                description: 'ЗВО має задовільний рівень, але є значний потенціал для покращення.',
                priority: this.priorityLevels.MEDIUM,
                actions: [
                    'Фокус на пріоритетних напрямах',
                    'Оптимізація використання ресурсів',
                    'Впровадження best practices',
                    'Регулярний моніторинг прогресу'
                ]
            });
        } else if (group === 'Б') {
            recommendations.push({
                title: 'Прагнення до вершини',
                description: 'ЗВО має високий рівень. Рекомендується зосередитися на досягненні найвищої групи.',
                priority: this.priorityLevels.LOW,
                actions: [
                    'Аналіз кращих практик групи А',
                    'Точкові покращення слабких показників',
                    'Збереження досягнутого рівня',
                    'Інноваційні підходи до розвитку'
                ]
            });
        }

        return recommendations;
    }

    /**
     * Render recommendations to HTML
     */
    renderRecommendations(recommendations, container) {
        container.innerHTML = '';

        if (recommendations.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Рекомендації відсутні. Всі показники на високому рівні!</p>';
            return;
        }

        recommendations.forEach((rec, index) => {
            const item = document.createElement('div');
            item.className = `recommendation-item priority-${rec.priority}`;

            let actionsHtml = '';
            if (rec.actions && rec.actions.length > 0) {
                actionsHtml = '<ul>' + rec.actions.map(action => `<li>${action}</li>`).join('') + '</ul>';
            }

            let metricsHtml = '';
            if (rec.currentValue !== undefined && rec.targetValue !== undefined) {
                metricsHtml = `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                        <div style="display: flex; gap: 1rem; font-size: 0.875rem;">
                            <div>Поточне значення: <strong>${rec.currentValue.toFixed(2)}</strong></div>
                            <div>Цільове значення (медіана): <strong>${rec.targetValue.toFixed(2)}</strong></div>
                            <div>Розрив: <strong style="color: var(--danger)">${(rec.targetValue - rec.currentValue).toFixed(2)}</strong></div>
                        </div>
                    </div>
                `;
            }

            item.innerHTML = `
                <span class="priority-badge ${rec.priority}">${this.getPriorityLabel(rec.priority)}</span>
                <h3>${rec.title}</h3>
                ${rec.block ? `<div style="font-size: 0.875rem; color: var(--text-tertiary); margin-bottom: 0.5rem;">Блок: ${rec.block} ${rec.indicator ? `| Індикатор: ${rec.indicator}` : ''}</div>` : ''}
                <p>${rec.description}</p>
                ${actionsHtml}
                ${metricsHtml}
            `;

            container.appendChild(item);
        });
    }

    /**
     * Get priority label
     */
    getPriorityLabel(priority) {
        const labels = {
            high: 'Високий пріоритет',
            medium: 'Середній пріоритет',
            low: 'Низький пріоритет'
        };
        return labels[priority] || priority;
    }
}

export default Recommendations;
