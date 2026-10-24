"""
Obsidian Vault Initializer & Config Generator
Local AI Productivity Tracking System
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Union

# Configure logging for system diagnostics
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# System Constants
DEFAULT_OLLAMA_ENDPOINT = "http://localhost:11434"
DEFAULT_MODEL = "llama3"

# Vault Folder Hierarchy
VAULT_DIRECTORIES = [
    "00_Agent/_Inbox",
    "00_Agent/_Processing",
    "00_Agent/_Gym_Logs",
    "01_Daily",
    "Scripts",
]


def setup_obsidian_vault(
    vault_path: Union[str, Path],
    ollama_endpoint: str = DEFAULT_OLLAMA_ENDPOINT,
    default_model: str = DEFAULT_MODEL,
) -> Path:
    """
    Initializes the required directory structure inside an Obsidian Vault
    for local AI productivity tracking and generates a `config.json` file.

    Args:
        vault_path: Path to the root directory of the target Obsidian Vault.
        ollama_endpoint: API endpoint URL for Ollama service.
        default_model: Default LLM model identifier.

    Returns:
        Path object pointing to the created config.json file.
    """
    vault_root = Path(vault_path).expanduser().resolve()

    # Ensure vault root directory exists
    if not vault_root.exists():
        logger.warning(f"Vault root directory does not exist. Creating: {vault_root}")
        vault_root.mkdir(parents=True, exist_ok=True)

    logger.info(f"Initializing Obsidian Vault structure at: {vault_root}")

    # Create subdirectories idempotently
    for subfolder in VAULT_DIRECTORIES:
        dir_path = vault_root / subfolder
        dir_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Verified directory: {dir_path}")

    scripts_dir = vault_root / "Scripts"
    config_file_path = scripts_dir / "config.json"

    # Construct schema configuration
    config_data: Dict[str, Any] = {
        "vault_path": str(vault_root),
        "ollama_endpoint": ollama_endpoint,
        "default_model": default_model,
        "paths": {
            "inbox": str(vault_root / "00_Agent" / "_Inbox"),
            "processing": str(vault_root / "00_Agent" / "_Processing"),
            "gym_logs": str(vault_root / "00_Agent" / "_Gym_Logs"),
            "daily_notes": str(vault_root / "01_Daily"),
            "scripts": str(scripts_dir),
        },
    }

    # Write formatted config.json file
    with open(config_file_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=4)

    logger.info(f"Successfully generated configuration at: {config_file_path}")
    return config_file_path


if __name__ == "__main__":
    import sys
    # Use CLI argument if provided; default to the vault root directory (parent of Scripts)
    if len(sys.argv) > 1:
        target_vault_path = sys.argv[1]
    else:
        # If script is inside Scripts/, parent is vault root
        target_vault_path = Path(__file__).parent.parent.resolve()

    config_path = setup_obsidian_vault(target_vault_path)
    print(f"\n[+] Vault initialization complete. Config generated at: {config_path}")
