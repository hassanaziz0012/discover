import os
import sys
import unittest
from unittest.mock import patch
import concurrent.futures

# Add discover_api directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from youtube.utils import get_api_key, _api_key_lock
import youtube.utils as utils_module


@patch("youtube.utils.load_dotenv")
class TestAPIKeyRotation(unittest.TestCase):

    def setUp(self):
        # Reset counter before each test
        with _api_key_lock:
            utils_module._api_key_request_count = 0

    def test_numbered_keys_rotation_custom_freq(self, mock_load):
        """Test cycling through YOUTUBE_API_KEY_1, YOUTUBE_API_KEY_2, YOUTUBE_API_KEY_3 every N calls."""
        fake_env = {
            "YOUTUBE_API_KEY_1": "KEY_AAA",
            "YOUTUBE_API_KEY_2": "KEY_BBB",
            "YOUTUBE_API_KEY_3": "KEY_CCC",
        }
        with patch.dict(os.environ, fake_env, clear=True):
            # Rotate every 3 calls
            results = [get_api_key(reqs_per_key=3) for _ in range(10)]
            expected = [
                "KEY_AAA", "KEY_AAA", "KEY_AAA",  # calls 0..2 -> idx 0
                "KEY_BBB", "KEY_BBB", "KEY_BBB",  # calls 3..5 -> idx 1
                "KEY_CCC", "KEY_CCC", "KEY_CCC",  # calls 6..8 -> idx 2
                "KEY_AAA"                         # call 9     -> idx 0
            ]
            self.assertEqual(results, expected)

    def test_default_500_reqs_per_key(self, mock_load):
        """Test exact threshold cycling at request #500."""
        fake_env = {
            "YOUTUBE_API_KEY_1": "KEY_1",
            "YOUTUBE_API_KEY_2": "KEY_2",
        }
        with patch.dict(os.environ, fake_env, clear=True):
            # Call 499 times -> KEY_1
            for _ in range(499):
                get_api_key()
            
            # Request #500 (499th 0-indexed) -> KEY_1
            self.assertEqual(get_api_key(), "KEY_1") # 500th call (count=499 -> 499 // 500 = 0 -> KEY_1)
            
            # Request #501 (count=500 -> 500 // 500 = 1 -> KEY_2)
            self.assertEqual(get_api_key(), "KEY_2")

    def test_single_key_fallback(self, mock_load):
        """Test falling back to YOUTUBE_API_KEY when no numbered keys are defined."""
        fake_env = {"YOUTUBE_API_KEY": "KEY_FALLBACK"}
        with patch.dict(os.environ, fake_env, clear=True):
            for _ in range(10):
                self.assertEqual(get_api_key(reqs_per_key=2), "KEY_FALLBACK")

    def test_no_keys_returns_none(self, mock_load):
        """Test returning None when no keys exist in env."""
        with patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(get_api_key())

    def test_thread_safety(self, mock_load):
        """Test thread-safe incrementing of request counter during concurrent calls."""
        fake_env = {
            "YOUTUBE_API_KEY_1": "KEY_1",
            "YOUTUBE_API_KEY_2": "KEY_2",
        }
        with patch.dict(os.environ, fake_env, clear=True):
            def worker():
                return get_api_key(reqs_per_key=10)

            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
                futures = [executor.submit(worker) for _ in range(100)]
                results = [f.result() for f in futures]
            
            # Total 100 calls were made
            self.assertEqual(utils_module._api_key_request_count, 100)


if __name__ == "__main__":
    unittest.main()
