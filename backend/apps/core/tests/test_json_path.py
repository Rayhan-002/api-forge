import pytest

from apps.core.json_path import PathNotFound, extract_json_value


class TestExtractJsonValue:
    def test_top_level_key(self):
        assert extract_json_value({"token": "abc"}, "token") == "abc"

    def test_nested_key(self):
        assert extract_json_value({"data": {"access_token": "abc"}}, "data.access_token") == "abc"

    def test_array_index(self):
        assert extract_json_value({"items": [{"id": 1}, {"id": 2}]}, "items.1.id") == 2

    def test_missing_key_raises(self):
        with pytest.raises(PathNotFound):
            extract_json_value({"token": "abc"}, "missing")

    def test_index_out_of_range_raises(self):
        with pytest.raises(PathNotFound):
            extract_json_value({"items": []}, "items.0")

    def test_indexing_into_scalar_raises(self):
        with pytest.raises(PathNotFound):
            extract_json_value({"token": "abc"}, "token.nested")
