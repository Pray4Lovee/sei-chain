import os
from pathlib import Path
from typing import Any

import yaml


BASE_PATH = Path(__file__).resolve().parent


def load_config(profile: str = "dev") -> dict[str, Any]:
    config_path = BASE_PATH / f"{profile}.yaml"
    with config_path.open("r", encoding="utf-8") as config_file:
        return yaml.safe_load(config_file)
