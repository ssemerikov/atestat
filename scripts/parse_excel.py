#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсинг Excel файлу з результатами атестації ЗВО

Автори: Гаманюк Віта Анатоліївна, С. О. Семеріков
Засіб розробки: Claude Code
"""

import pandas as pd
import numpy as np
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import warnings

warnings.filterwarnings('ignore', category=UserWarning, module='openpyxl')


class AttestationDataParser:
    """Клас для парсингу та консолідації даних атестації ЗВО"""

    # Константи з методики атестації
    TOTAL_KI = 54.0  # Загальна сума вагових коефіцієнтів для ЗВО (35 індикаторів для НУ = 52.5)

    # Вагові коефіцієнти всіх 37 індикаторів (згідно з офіційною методикою)
    INDICATORS_KI = {
        # Блок 1: Кадровий потенціал (6,5)
        'I1': 1.0, 'I2': 1.0, 'I3': 1.0, 'I4': 1.0, 'I5': 0.5, 'I6': 1.0,
        # Блок 2: Фінансова діяльність (13,5)
        'I7': 1.0, 'I8': 3.0, 'I9': 2.0, 'I10': 1.0, 'I11': 3.0, 'I12': 2.0, 'I13': 1.0, 'I14': 0.5,
        # Блок 3: Публікаційна активність (9,55)
        'I15': 1.5, 'I16': 1.2, 'I17': 1.0, 'I18': 1.0, 'I19': 1.5, 'I20': 0.75, 'I21': 0.35, 'I22': 0.5, 'I23': 0.2,
        # Блок 4: Інтелектуальна власність (13,5)
        'I24': 1.0, 'I25': 1.0, 'I26': 3.0, 'I27': 1.0, 'I28': 1.0, 'I29': 4.0, 'I30': 0.5, 'I31': 2.0,
        # Блок 5: Конкурсне фінансування (13,5)
        'I32': 4.0, 'I33': 1.0, 'I34': 2.0, 'I35': 0.5, 'I36': 2.0, 'I37': 4.0
    }

    # Блоки індикаторів
    INDICATOR_BLOCKS = {
        'Кадровий потенціал': ['I1', 'I2', 'I3', 'I4', 'I5', 'I6'],
        'Фінансова діяльність': ['I7', 'I8', 'I9', 'I10', 'I11', 'I12', 'I13', 'I14'],
        'Публікаційна активність': ['I15', 'I16', 'I17', 'I18', 'I19', 'I20', 'I21', 'I22'],
        'Інтелектуальна власність': ['I23', 'I24', 'I25', 'I26', 'I27', 'I28', 'I29', 'I30', 'I31'],
        'Конкурсне фінансування': ['I32', 'I33', 'I34', 'I35', 'I36', 'I37']
    }

    # Наукові напрями
    SCIENCE_DIRECTIONS = {
        1: 'Аграрно-ветеринарний',
        2: 'Гуманітарно-мистецький',
        3: 'Суспільний',
        4: 'Біомедичний',
        5: 'Природничо-математичний',
        6: 'Інженерно-технологічний',
        7: 'Безпековий'
    }

    # Групи атестації
    ATTESTATION_GROUPS = {
        'А': {'min': 75, 'max': 100, 'description': 'Найвища оцінка ефективності'},
        'Б': {'min': 50, 'max': 75, 'description': 'Висока оцінка ефективності'},
        'В': {'min': 25, 'max': 50, 'description': 'Задовільна оцінка ефективності'},
        'Г': {'min': 0, 'max': 25, 'description': 'НЕ ПРОЙШЛИ АТЕСТАЦІЮ'}
    }

    def __init__(self, excel_path: str):
        """
        Ініціалізація парсера

        Args:
            excel_path: Шлях до Excel файлу з результатами атестації
        """
        self.excel_path = Path(excel_path)
        if not self.excel_path.exists():
            raise FileNotFoundError(f"Файл не знайдено: {excel_path}")

        self.sheets = {}
        self.consolidated_data = None
        self.validation_results = {}

    def load_all_sheets(self) -> Dict[str, pd.DataFrame]:
        """
        Завантаження всіх вкладок Excel файлу

        Returns:
            Словник з назвами вкладок та відповідними DataFrame
        """
        print(f"📂 Завантаження Excel файлу: {self.excel_path.name}")

        try:
            excel_file = pd.ExcelFile(self.excel_path, engine='openpyxl')
            sheet_names = excel_file.sheet_names

            print(f"📊 Знайдено {len(sheet_names)} вкладок:")

            for sheet_name in sheet_names:
                df = pd.read_excel(excel_file, sheet_name=sheet_name)
                self.sheets[sheet_name] = df
                print(f"  ✓ {sheet_name}: {df.shape[0]} рядків × {df.shape[1]} стовпців")

            return self.sheets

        except Exception as e:
            raise Exception(f"Помилка при завантаженні Excel файлу: {str(e)}")

    def _extract_indicator_columns(self, df_raw: pd.DataFrame) -> Dict[str, int]:
        """
        Витягування індексів колонок для кожного індикатора I1-I37
        з рядка 0 (row with indicator labels)

        Args:
            df_raw: Сирий DataFrame з вкладки Довідники

        Returns:
            Словник {indicator: column_index}, наприклад {'I1': 17, 'I2': 20, ...}
        """
        import re

        indicator_columns = {}

        # Рядок 0 містить позначки індикаторів
        header_row = df_raw.iloc[0]

        for col_idx, value in enumerate(header_row):
            if pd.notna(value):
                value_str = str(value).strip()
                # Шукаємо патерн "I" followed by digits (без зірочки)
                match = re.match(r'^I(\d+)$', value_str)
                if match:
                    indicator_num = match.group(1)
                    indicator_name = f'I{indicator_num}'
                    indicator_columns[indicator_name] = col_idx

        return indicator_columns

    def parse_dovidnyky_sheet(self) -> Tuple[pd.DataFrame, Dict[str, int]]:
        """
        Парсинг вкладки 'Довідники' з всіма показниками P, R, F, I
        з правильним розбором багаторівневих заголовків

        Returns:
            Tuple з DataFrame (дані, пропустивши заголовки) та словником індексів індикаторів
        """
        print("\n📋 Парсинг вкладки 'Довідники'...")

        # Завантажуємо сирі дані для аналізу заголовків
        df_raw = pd.read_excel(self.excel_path, sheet_name='Довідники', nrows=5, engine='openpyxl')

        # Витягуємо індекси колонок для індикаторів
        indicator_columns = self._extract_indicator_columns(df_raw)

        print(f"  ✓ Знайдено індикаторів I: {len(indicator_columns)}")

        # Перевірка наявності всіх 37 індикаторів
        expected_indicators = set(self.INDICATORS_KI.keys())
        found_indicators = set(indicator_columns.keys())
        missing_indicators = expected_indicators - found_indicators

        if missing_indicators:
            print(f"  ⚠ Відсутні індикатори: {sorted(missing_indicators)}")
        else:
            print(f"  ✅ Знайдено ВСІ 37 індикаторів!")

        # Тепер завантажуємо реальні дані, пропускаючи перші 3 рядки заголовків
        df_data = pd.read_excel(self.excel_path, sheet_name='Довідники', skiprows=3, engine='openpyxl')

        print(f"  ✓ Завантажено {len(df_data)} ЗВО з даними")

        return df_data, indicator_columns

    def parse_results_sheet(self, directions=['Суспільний', 'Аграрно-ветеринарний']) -> pd.DataFrame:
        """
        Парсинг вкладки 'Результати' з підсумковими оцінками

        Args:
            directions: Список наукових напрямів для фільтрації

        Returns:
            DataFrame з результатами атестації для зазначених напрямів
        """
        print("\n📊 Парсинг вкладки 'Результати'...")

        if 'Результати' not in self.sheets:
            raise KeyError("Вкладка 'Результати' не знайдена")

        df = self.sheets['Результати'].copy()

        # Фільтруємо лише потрібні напрями
        if 'Напрям' in df.columns:
            df = df[df['Напрям'].isin(directions)]
            print(f"  ✓ Відфільтровано {len(df)} записів для напрямів: {', '.join(directions)}")
        else:
            print(f"  ⚠ Колонка 'Напрям' не знайдена, завантажено всі {len(df)} записів")

        return df

    def parse_detali_sheet(self, directions=['Суспільний', 'Аграрно-ветеринарний']) -> pd.DataFrame:
        """
        Парсинг вкладки 'Деталі 3.0' з деталізованими даними

        Args:
            directions: Список наукових напрямів для фільтрації

        Returns:
            DataFrame з деталями по індикаторах для зазначених напрямів
        """
        print("\n🔍 Парсинг вкладки 'Деталі 3.0'...")

        if 'Деталі 3.0' not in self.sheets:
            print("  ⚠ Вкладка 'Деталі 3.0' не знайдена")
            return None

        df = self.sheets['Деталі 3.0'].copy()

        # Фільтруємо лише потрібні напрями
        if 'Напрям' in df.columns:
            df = df[df['Напрям'].isin(directions)]
            print(f"  ✓ Відфільтровано {len(df)} деталізованих записів для напрямів: {', '.join(directions)}")
        else:
            print(f"  ⚠ Колонка 'Напрям' не знайдена, завантажено всі {len(df)} записів")

        return df

    def parse_dynamika_sheet(self, directions=['Суспільний', 'Аграрно-ветеринарний']) -> pd.DataFrame:
        """
        Парсинг вкладки 'Динаміка' з часовими рядами 2019-2023

        Args:
            directions: Список наукових напрямів для фільтрації

        Returns:
            DataFrame з динамікою показників для зазначених напрямів
        """
        print("\n📈 Парсинг вкладки 'Динаміка'...")

        if 'Динаміка' not in self.sheets:
            print("  ⚠ Вкладка 'Динаміка' не знайдена")
            return None

        df = self.sheets['Динаміка'].copy()

        # Фільтруємо лише потрібні напрями
        direction_col = 'Науковий напрям * Рівень 0'
        if direction_col in df.columns:
            df = df[df[direction_col].isin(directions)]
            print(f"  ✓ Відфільтровано {len(df)} записів динаміки для напрямів: {', '.join(directions)}")
        else:
            print(f"  ⚠ Колонка '{direction_col}' не знайдена, завантажено всі {len(df)} записів")

        return df

    def parse_medians_sheet(self, directions=['Суспільний', 'Аграрно-ветеринарний']) -> pd.DataFrame:
        """
        Парсинг вкладки 'Мадіани' з медіанами показників

        Args:
            directions: Список наукових напрямів для фільтрації

        Returns:
            DataFrame з медіанами для зазначених напрямів
        """
        print("\n📊 Парсинг вкладки 'Мадіани'...")

        if 'Мадіани' not in self.sheets:
            print("  ⚠ Вкладка 'Мадіани' не знайдена")
            return None

        df = self.sheets['Мадіани'].copy()

        # Фільтруємо лише потрібні напрями
        if 'Напрям' in df.columns:
            df = df[df['Напрям'].isin(directions)]
            print(f"  ✓ Відфільтровано {len(df)} медіан для напрямів: {', '.join(directions)}")
        else:
            print(f"  ⚠ Колонка 'Напрям' не знайдена, завантажено всі {len(df)} записів")

        return df

    def validate_methodology(self, indicator_columns: Dict[str, int], dovidnyky_df: pd.DataFrame, results_df: pd.DataFrame) -> Dict:
        """
        Валідація відповідності даних методиці атестації

        Args:
            indicator_columns: Словник з індексами колонок індикаторів
            dovidnyky_df: DataFrame з показниками
            results_df: DataFrame з результатами

        Returns:
            Словник з результатами валідації
        """
        print("\n✅ Валідація відповідності методиці атестації...")

        validation = {
            'total_institutions': len(results_df),
            'total_dovidnyky': len(dovidnyky_df),
            'indicators_found': [],
            'indicators_missing': [],
            'ki_sum_valid': False,
            'formula_valid': False,
            'errors': [],
            'warnings': []
        }

        # Перевірка наявності всіх 37 індикаторів
        found_indicators = set(indicator_columns.keys())
        expected_indicators = set(self.INDICATORS_KI.keys())

        validation['indicators_found'] = sorted(list(found_indicators))
        validation['indicators_missing'] = sorted(list(expected_indicators - found_indicators))

        # Перевірка суми вагових коефіцієнтів
        ki_sum = sum(self.INDICATORS_KI.values())
        if abs(ki_sum - self.TOTAL_KI) < 0.01:
            validation['ki_sum_valid'] = True
            print(f"  ✓ Сума вагових коефіцієнтів: {ki_sum:.1f} (очікувалось {self.TOTAL_KI})")
        else:
            validation['errors'].append(f"Сума Ki ({ki_sum:.1f}) не дорівнює {self.TOTAL_KI}")

        print(f"  ✓ Знайдено індикаторів: {len(validation['indicators_found'])}/37")

        if validation['indicators_missing']:
            print(f"  ⚠ Відсутні індикатори: {', '.join(validation['indicators_missing'])}")
        else:
            print(f"  ✅ ВСІ 37 індикаторів присутні в даних!")

        # Валідація формули атестаційної оцінки на випадкових зразках
        print("\n  🔍 Валідація формули атестації на зразках...")
        self._validate_formula_samples(dovidnyky_df, indicator_columns, validation)

        self.validation_results = validation
        return validation

    def _validate_formula_samples(self, dovidnyky_df: pd.DataFrame, indicator_columns: Dict[str, int], validation: Dict):
        """
        Валідація формули А = (К + Е) × РПі × КРІ на випадкових зразках

        Args:
            dovidnyky_df: DataFrame з даними
            indicator_columns: Словник індексів індикаторів
            validation: Словник валідації для додавання результатів
        """
        # Шукаємо колонки з результатами
        classification_col = None
        expert_col = None
        regional_col = None
        destruction_col = None
        final_col = None

        for col in dovidnyky_df.columns:
            col_str = str(col).lower()
            if 'класифікаційна' in col_str and 'оцінка' in col_str:
                classification_col = col
            elif 'експертна' in col_str and 'оцінка' in col_str:
                expert_col = col
            elif 'регіональний' in col_str and 'коєфіц' in col_str:
                regional_col = col
            elif 'руйнувань' in col_str or 'руйнування' in col_str:
                destruction_col = col
            elif 'атестаційна' in col_str and 'оцінка' in col_str:
                final_col = col

        if all([classification_col, expert_col, regional_col, destruction_col, final_col]):
            # Перевіряємо формулу на кількох зразках
            sample_size = min(5, len(dovidnyky_df))
            matches = 0

            for idx in range(sample_size):
                try:
                    K = pd.to_numeric(dovidnyky_df.iloc[idx][classification_col], errors='coerce')
                    E = pd.to_numeric(dovidnyky_df.iloc[idx][expert_col], errors='coerce')
                    RPI = pd.to_numeric(dovidnyky_df.iloc[idx][regional_col], errors='coerce')
                    KRI = pd.to_numeric(dovidnyky_df.iloc[idx][destruction_col], errors='coerce')
                    A_actual = pd.to_numeric(dovidnyky_df.iloc[idx][final_col], errors='coerce')

                    if pd.notna(K) and pd.notna(E) and pd.notna(RPI) and pd.notna(KRI) and pd.notna(A_actual):
                        A_calculated = (K + E) * RPI * KRI

                        # Допускаємо відхилення 0.1%
                        if abs(A_calculated - A_actual) / max(A_actual, 0.01) < 0.001:
                            matches += 1
                except (ValueError, TypeError):
                    continue

            if matches >= sample_size * 0.8:  # 80% співпадінь
                validation['formula_valid'] = True
                print(f"    ✅ Формула валідна: {matches}/{sample_size} зразків співпали")
            else:
                validation['warnings'].append(f"Формула не валідується: лише {matches}/{sample_size} зразків")
                print(f"    ⚠ Формула: {matches}/{sample_size} зразків співпали")
        else:
            validation['warnings'].append("Не знайдено всіх колонок для валідації формули")

    def consolidate_data(self, directions=['Суспільний', 'Аграрно-ветеринарний']) -> Dict:
        """
        Консолідація всіх даних у єдину структуру

        Args:
            directions: Список наукових напрямів для обробки

        Returns:
            Словник з консолідованими даними
        """
        print("\n🔄 Консолідація даних...")

        # Завантажуємо дані з різних аркушів
        results_df = self.parse_results_sheet(directions)
        detali_df = self.parse_detali_sheet(directions)
        medians_df = self.parse_medians_sheet(directions)
        dynamika_df = self.parse_dynamika_sheet(directions)

        # Формуємо консолідовану структуру
        self.consolidated_data = {
            'results': results_df,
            'detali': detali_df,
            'medians': medians_df,
            'dynamika': dynamika_df
        }

        print(f"  ✓ Консолідовано:")
        print(f"    - Результати: {len(results_df)} установ")
        if detali_df is not None:
            print(f"    - Деталі: {len(detali_df)} деталізованих записів")
        if medians_df is not None:
            print(f"    - Медіани: {len(medians_df)} значень медіан")
        if dynamika_df is not None:
            print(f"    - Динаміка: {len(dynamika_df)} часових записів")

        return self.consolidated_data

    def export_to_csv(self, output_dir: str):
        """
        Експорт консолідованих даних у CSV файли

        Args:
            output_dir: Директорія для збереження CSV файлів
        """
        if self.consolidated_data is None:
            raise ValueError("Спочатку виконайте консолідацію даних")

        print(f"\n💾 Експорт у CSV: {output_dir}")

        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Експортуємо кожен DataFrame окремо
        for name, df in self.consolidated_data.items():
            if df is not None and len(df) > 0:
                output_path = output_dir / f"{name}.csv"
                df.to_csv(output_path, index=False, encoding='utf-8-sig')
                print(f"  ✓ {name}.csv: {len(df)} записів")

    def export_to_json(self, output_dir: str):
        """
        Генерація JSON файлів для веб-візуалізатора

        Args:
            output_dir: Директорія для збереження JSON файлів
        """
        print(f"\n📦 Генерація JSON файлів у {output_dir}")

        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        if self.consolidated_data is None:
            raise ValueError("Спочатку виконайте консолідацію даних")

        # 1. Метадані методики
        methodology = {
            'total_ki': self.TOTAL_KI,
            'indicators': self.INDICATORS_KI,
            'blocks': self.INDICATOR_BLOCKS,
            'science_directions': self.SCIENCE_DIRECTIONS,
            'attestation_groups': self.ATTESTATION_GROUPS,
            'indicators_count': len(self.INDICATORS_KI),
            'blocks_count': len(self.INDICATOR_BLOCKS)
        }

        with open(output_dir / 'methodology.json', 'w', encoding='utf-8') as f:
            json.dump(methodology, f, ensure_ascii=False, indent=2)
        print("  ✓ methodology.json")

        # 2. Основні результати атестації (всі установи)
        results_df = self.consolidated_data['results']
        if results_df is not None and len(results_df) > 0:
            # Конвертуємо NaN у None для коректного JSON
            results_dict = results_df.replace({np.nan: None}).to_dict('records')

            with open(output_dir / 'all_results.json', 'w', encoding='utf-8') as f:
                json.dump(results_dict, f, ensure_ascii=False, indent=2)
            print(f"  ✓ all_results.json ({len(results_dict)} установ)")

        # 3. Деталізовані дані по індикаторах
        detali_df = self.consolidated_data['detali']
        if detali_df is not None and len(detali_df) > 0:
            detali_dict = detali_df.replace({np.nan: None}).to_dict('records')

            with open(output_dir / 'detali.json', 'w', encoding='utf-8') as f:
                json.dump(detali_dict, f, ensure_ascii=False, indent=2)
            print(f"  ✓ detali.json ({len(detali_dict)} деталізованих записів)")

        # 4. Медіани показників
        medians_df = self.consolidated_data['medians']
        if medians_df is not None and len(medians_df) > 0:
            medians_dict = medians_df.replace({np.nan: None}).to_dict('records')

            with open(output_dir / 'medians.json', 'w', encoding='utf-8') as f:
                json.dump(medians_dict, f, ensure_ascii=False, indent=2)
            print(f"  ✓ medians.json ({len(medians_dict)} значень медіан)")

        # 5. Динаміка показників (часові ряди)
        dynamika_df = self.consolidated_data['dynamika']
        if dynamika_df is not None and len(dynamika_df) > 0:
            dynamika_dict = dynamika_df.replace({np.nan: None}).to_dict('records')

            with open(output_dir / 'dynamika.json', 'w', encoding='utf-8') as f:
                json.dump(dynamika_dict, f, ensure_ascii=False, indent=2)
            print(f"  ✓ dynamika.json ({len(dynamika_dict)} часових записів)")

        # 6. Статистика по науковим напрямам
        if results_df is not None and len(results_df) > 0 and 'Напрям' in results_df.columns:
            stats_by_direction = {}
            for direction in results_df['Напрям'].unique():
                direction_data = results_df[results_df['Напрям'] == direction]

                # Підрахунок установ за групами
                groups_count = {}
                if 'Група' in direction_data.columns:
                    for group in direction_data['Група'].unique():
                        if pd.notna(group):
                            groups_count[group] = int(direction_data[direction_data['Група'] == group].shape[0])

                stats_by_direction[direction] = {
                    'total': int(len(direction_data)),
                    'groups': groups_count
                }

            with open(output_dir / 'stats_by_direction.json', 'w', encoding='utf-8') as f:
                json.dump(stats_by_direction, f, ensure_ascii=False, indent=2)
            print("  ✓ stats_by_direction.json")

        print(f"\n✅ Генерація JSON завершена: {output_dir}")

    def generate_summary_report(self) -> str:
        """
        Генерація підсумкового звіту

        Returns:
            Текст звіту
        """
        report = []
        report.append("=" * 80)
        report.append("ПІДСУМКОВИЙ ЗВІТ ПАРСИНГУ ДАНИХ АТЕСТАЦІЇ ЗВО")
        report.append("=" * 80)
        report.append("")

        report.append(f"📂 Вхідний файл: {self.excel_path.name}")
        report.append(f"📊 Вкладок оброблено: {len(self.sheets)}")
        report.append("")

        if self.consolidated_data:
            report.append("📈 КОНСОЛІДОВАНІ ДАНІ:")
            results_df = self.consolidated_data.get('results')
            if results_df is not None:
                report.append(f"  • Результати: {len(results_df)} установ")

                # Статистика по напрямах
                if 'Напрям' in results_df.columns:
                    report.append("\n  📊 За науковими напрямами:")
                    for direction in sorted(results_df['Напрям'].unique()):
                        count = len(results_df[results_df['Напрям'] == direction])
                        report.append(f"    - {direction}: {count} установ")

                        # Статистика по групах
                        if 'Група' in results_df.columns:
                            direction_data = results_df[results_df['Напрям'] == direction]
                            for group in sorted(direction_data['Група'].dropna().unique()):
                                group_count = len(direction_data[direction_data['Група'] == group])
                                report.append(f"      • Група {group}: {group_count} установ")

            detali_df = self.consolidated_data.get('detali')
            if detali_df is not None:
                report.append(f"\n  • Деталі: {len(detali_df)} деталізованих записів")

            medians_df = self.consolidated_data.get('medians')
            if medians_df is not None:
                report.append(f"  • Медіани: {len(medians_df)} значень")

            dynamika_df = self.consolidated_data.get('dynamika')
            if dynamika_df is not None:
                report.append(f"  • Динаміка: {len(dynamika_df)} часових записів")

        report.append("")
        report.append("=" * 80)

        return "\n".join(report)


def main():
    """Основна функція"""

    # Шляхи до файлів
    base_dir = Path(__file__).parent.parent
    excel_path = base_dir / "data" / "Оголошення результатів.xlsx"
    csv_output_dir = base_dir / "data" / "csv"
    json_output_dir = base_dir / "data" / "json"

    # Напрями для обробки (лише Суспільний та Аграрно-ветеринарний)
    directions = ['Суспільний', 'Аграрно-ветеринарний']

    print("🚀 ПОЧАТОК ПАРСИНГУ ДАНИХ АТЕСТАЦІЇ ЗВО")
    print("=" * 80)
    print(f"📌 Обробка напрямів: {', '.join(directions)}")
    print("=" * 80)

    try:
        # Створення парсера
        parser = AttestationDataParser(str(excel_path))

        # Завантаження всіх вкладок
        parser.load_all_sheets()

        # Консолідація даних для зазначених напрямів
        parser.consolidate_data(directions)

        # Експорт у CSV
        parser.export_to_csv(str(csv_output_dir))

        # Генерація JSON файлів
        parser.export_to_json(str(json_output_dir))

        # Підсумковий звіт
        print("\n" + parser.generate_summary_report())

        print("\n✅ ПАРСИНГ УСПІШНО ЗАВЕРШЕНО!")

    except Exception as e:
        print(f"\n❌ ПОМИЛКА: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    main()
