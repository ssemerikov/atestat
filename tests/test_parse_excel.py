#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Модульні тести для parse_excel.py

Автори: Гаманюк Віта Анатоліївна, С. О. Семеріков
Засіб розробки: Claude Code
"""

import pytest
import pandas as pd
import json
from pathlib import Path
import sys

# Додаємо шлях до scripts для імпорту
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from parse_excel import AttestationDataParser


class TestAttestationDataParser:
    """Тестування класу AttestationDataParser"""

    @pytest.fixture
    def excel_path(self):
        """Шлях до тестового Excel файлу"""
        return Path(__file__).parent.parent / "data" / "Оголошення результатів.xlsx"

    @pytest.fixture
    def parser(self, excel_path):
        """Створення екземпляра парсера"""
        return AttestationDataParser(str(excel_path))

    def test_init_valid_path(self, excel_path):
        """Тест ініціалізації з валідним шляхом"""
        parser = AttestationDataParser(str(excel_path))
        assert parser.excel_path.exists()
        assert parser.sheets == {}
        assert parser.consolidated_data is None

    def test_init_invalid_path(self):
        """Тест ініціалізації з неіснуючим файлом"""
        with pytest.raises(FileNotFoundError):
            AttestationDataParser("nonexistent_file.xlsx")

    def test_total_ki_constant(self):
        """Тест константи загальної суми вагових коефіцієнтів"""
        assert AttestationDataParser.TOTAL_KI == 54.0

    def test_indicators_ki_count(self):
        """Тест кількості індикаторів (має бути 37)"""
        assert len(AttestationDataParser.INDICATORS_KI) == 37

    def test_indicators_ki_sum(self):
        """Тест суми всіх вагових коефіцієнтів"""
        total = sum(AttestationDataParser.INDICATORS_KI.values())
        assert abs(total - 54.0) < 0.01

    def test_indicators_ki_values(self):
        """Тест діапазону вагових коефіцієнтів"""
        for indicator, ki in AttestationDataParser.INDICATORS_KI.items():
            assert 0.2 <= ki <= 4.0, f"Ki для {indicator} поза допустимим діапазоном"

    def test_indicator_blocks_count(self):
        """Тест кількості блоків індикаторів (має бути 5)"""
        assert len(AttestationDataParser.INDICATOR_BLOCKS) == 5

    def test_indicator_blocks_completeness(self):
        """Тест повноти розподілу індикаторів по блоках"""
        all_indicators_in_blocks = set()
        for indicators in AttestationDataParser.INDICATOR_BLOCKS.values():
            all_indicators_in_blocks.update(indicators)

        all_indicators = set(AttestationDataParser.INDICATORS_KI.keys())
        assert all_indicators_in_blocks == all_indicators

    def test_science_directions_count(self):
        """Тест кількості наукових напрямів (має бути 7)"""
        assert len(AttestationDataParser.SCIENCE_DIRECTIONS) == 7

    def test_attestation_groups_count(self):
        """Тест кількості груп атестації (має бути 4)"""
        assert len(AttestationDataParser.ATTESTATION_GROUPS) == 4

    def test_attestation_groups_boundaries(self):
        """Тест меж груп атестації"""
        groups = AttestationDataParser.ATTESTATION_GROUPS
        assert groups['А']['min'] == 75
        assert groups['Б']['min'] == 50
        assert groups['В']['min'] == 25
        assert groups['Г']['min'] == 0

    def test_load_all_sheets(self, parser):
        """Тест завантаження всіх вкладок"""
        sheets = parser.load_all_sheets()
        assert len(sheets) > 0
        assert 'Довідники' in sheets
        assert 'Результати' in sheets

    def test_load_all_sheets_returns_dataframes(self, parser):
        """Тест типів даних завантажених вкладок"""
        sheets = parser.load_all_sheets()
        for sheet_name, df in sheets.items():
            assert isinstance(df, pd.DataFrame)

    def test_extract_indicator_columns(self, parser):
        """Тест витягування індексів колонок індикаторів"""
        parser.load_all_sheets()
        df_raw = pd.read_excel(parser.excel_path, sheet_name='Довідники', nrows=5)
        indicator_columns = parser._extract_indicator_columns(df_raw)

        assert len(indicator_columns) > 0
        # Перевіряємо, що індикатори мають правильний формат
        for indicator in indicator_columns.keys():
            assert indicator.startswith('I')
            assert indicator[1:].isdigit()

    def test_parse_dovidnyky_sheet(self, parser):
        """Тест парсингу вкладки Довідники"""
        parser.load_all_sheets()
        df_data, indicator_columns = parser.parse_dovidnyky_sheet()

        assert isinstance(df_data, pd.DataFrame)
        assert len(df_data) > 0
        assert len(indicator_columns) == 37

    def test_parse_results_sheet(self, parser):
        """Тест парсингу вкладки Результати"""
        parser.load_all_sheets()
        df = parser.parse_results_sheet()

        assert isinstance(df, pd.DataFrame)
        assert len(df) > 0

    def test_consolidate_data(self, parser):
        """Тест консолідації даних"""
        parser.load_all_sheets()
        consolidated = parser.consolidate_data()

        assert isinstance(consolidated, pd.DataFrame)
        assert len(consolidated) > 0

    def test_validation_results(self, parser):
        """Тест результатів валідації"""
        parser.load_all_sheets()
        parser.consolidate_data()

        validation = parser.validation_results
        assert 'indicators_found' in validation
        assert 'indicators_missing' in validation
        assert 'ki_sum_valid' in validation
        assert len(validation['indicators_found']) == 37

    def test_export_to_csv(self, parser, tmp_path):
        """Тест експорту у CSV"""
        parser.load_all_sheets()
        parser.consolidate_data()

        output_path = tmp_path / "test_export.csv"
        parser.export_to_csv(str(output_path))

        assert output_path.exists()
        assert output_path.stat().st_size > 0

    def test_export_to_json(self, parser, tmp_path):
        """Тест експорту у JSON"""
        parser.load_all_sheets()
        parser.consolidate_data()

        output_dir = tmp_path / "json"
        parser.export_to_json(str(output_dir))

        assert output_dir.exists()
        assert (output_dir / "methodology.json").exists()
        assert (output_dir / "validation.json").exists()

    def test_methodology_json_structure(self, parser, tmp_path):
        """Тест структури methodology.json"""
        parser.load_all_sheets()
        parser.consolidate_data()

        output_dir = tmp_path / "json"
        parser.export_to_json(str(output_dir))

        with open(output_dir / "methodology.json", 'r', encoding='utf-8') as f:
            data = json.load(f)

        assert 'total_ki' in data
        assert 'indicators' in data
        assert 'blocks' in data
        assert 'science_directions' in data
        assert len(data['indicators']) == 37

    def test_generate_summary_report(self, parser):
        """Тест генерації підсумкового звіту"""
        parser.load_all_sheets()
        parser.consolidate_data()

        report = parser.generate_summary_report()

        assert isinstance(report, str)
        assert len(report) > 0
        assert 'ПІДСУМКОВИЙ ЗВІТ' in report


class TestIndicatorBlockWeights:
    """Тести вагових коефіцієнтів блоків індикаторів"""

    def test_block_1_kadrovyi_potentsial(self):
        """Тест суми блоку 1: Кадровий потенціал"""
        indicators = AttestationDataParser.INDICATOR_BLOCKS['Кадровий потенціал']
        total = sum(AttestationDataParser.INDICATORS_KI[i] for i in indicators)
        # І1=1.0, І2=1.0, І3=1.0, І4=1.0, І5=0.5, І6=1.0 = 5.5
        assert abs(total - 5.5) < 0.01

    def test_block_2_finansova_diyalnist(self):
        """Тест суми блоку 2: Фінансова діяльність"""
        indicators = AttestationDataParser.INDICATOR_BLOCKS['Фінансова діяльність']
        total = sum(AttestationDataParser.INDICATORS_KI[i] for i in indicators)
        # Має бути 13.5
        assert abs(total - 13.5) < 0.01

    def test_block_3_publikatsiina_aktyvnist(self):
        """Тест суми блоку 3: Публікаційна активність"""
        indicators = AttestationDataParser.INDICATOR_BLOCKS['Публікаційна активність']
        total = sum(AttestationDataParser.INDICATORS_KI[i] for i in indicators)
        # Має бути 7.8 (1.5+1.2+1.0+1.0+1.5+0.75+0.35+0.5+0.2)
        assert abs(total - 7.8) < 0.01

    def test_block_4_intelektualna_vlasnist(self):
        """Тест суми блоку 4: Інтелектуальна власність"""
        indicators = AttestationDataParser.INDICATOR_BLOCKS['Інтелектуальна власність']
        total = sum(AttestationDataParser.INDICATORS_KI[i] for i in indicators)
        # Має бути 13.7 (1.0+1.0+3.0+1.0+1.0+4.0+0.5+2.0)
        assert abs(total - 13.7) < 0.01

    def test_block_5_konkursne_finansuvannya(self):
        """Тест суми блоку 5: Конкурсне фінансування"""
        indicators = AttestationDataParser.INDICATOR_BLOCKS['Конкурсне фінансування']
        total = sum(AttestationDataParser.INDICATORS_KI[i] for i in indicators)
        # Має бути 13.5
        assert abs(total - 13.5) < 0.01


class TestTopIndicators:
    """Тести найважливіших індикаторів"""

    def test_top_3_indicators(self):
        """Тест ТОП-3 індикаторів (мають бути по 4.0)"""
        ki = AttestationDataParser.INDICATORS_KI
        top_3 = ['I29', 'I32', 'I37']

        for indicator in top_3:
            assert ki[indicator] == 4.0

    def test_indicators_sorted_by_weight(self):
        """Тест сортування індикаторів за вагою"""
        ki = AttestationDataParser.INDICATORS_KI
        sorted_indicators = sorted(ki.items(), key=lambda x: x[1], reverse=True)

        # Перші 3 мають бути І29, І32, І37 (в будь-якому порядку)
        top_3_names = {sorted_indicators[0][0], sorted_indicators[1][0], sorted_indicators[2][0]}
        assert top_3_names == {'I29', 'I32', 'I37'}


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
