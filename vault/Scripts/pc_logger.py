"""
Windows PC Activity Logger
Local AI Productivity Tracking System

Tracks active window titles, process names, and user activity state (Active/Idle).
Uses native Win32 GetLastInputInfo for zero-overhead, hook-free idle detection.
Outputs daily JSON Lines (.jsonl) log files into the Obsidian Vault Inbox.
"""

import ctypes
import datetime
import json
import logging
from pathlib import Path
import signal
import sys
import time
from typing import Dict, Any, Tuple

import psutil
import pygetwindow as gw

# Configure logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("PCLogger")

# Configuration Constants
IDLE_THRESHOLD_SECONDS = 180  # 3 minutes of no user input -> Idle
LOG_INTERVAL_SECONDS = 300     # 5 minutes logging frequency

running = True
last_input_time = time.time()


class LASTINPUTINFO(ctypes.Structure):
    _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]


def get_idle_seconds() -> float:
    """
    Returns number of seconds since last user keyboard or mouse interaction.
    Uses Win32 GetLastInputInfo (hook-free, 0% CPU overhead).
    """
    if sys.platform == "win32":
        try:
            lii = LASTINPUTINFO()
            lii.cbSize = ctypes.sizeof(LASTINPUTINFO)
            if ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii)):
                # GetTickCount returns milliseconds since system startup
                millis = ctypes.windll.kernel32.GetTickCount() - lii.dwTime
                return max(0.0, millis / 1000.0)
        except Exception as e:
            logger.debug(f"Win32 GetLastInputInfo error: {e}")

    return max(0.0, time.time() - last_input_time)


def get_active_window_details() -> Tuple[str, str]:
    """
    Retrieves the currently active foreground window title and executable process name.

    Returns:
        Tuple[str, str]: (window_title, process_name)
    """
    try:
        active_window = gw.getActiveWindow()
        if not active_window:
            return "No Active Window", "Unknown"

        title = active_window.title.strip() if active_window.title else "Untitled Window"
        hwnd = getattr(active_window, "_hWnd", None)

        process_name = "Unknown"
        if hwnd:
            pid = ctypes.c_ulong()
            ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            if pid.value:
                try:
                    proc = psutil.Process(pid.value)
                    process_name = proc.name()
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    process_name = "Unknown"

        return title, process_name

    except Exception as e:
        logger.debug(f"Error fetching active window details: {e}")
        return "Unknown", "Unknown"


def load_inbox_path() -> Path:
    """Loads the inbox directory path from config.json or fallback relative path."""
    script_dir = Path(__file__).parent.resolve()
    config_path = script_dir / "config.json"

    if config_path.exists():
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
                inbox_str = config.get("paths", {}).get("inbox")
                if inbox_str:
                    inbox_path = Path(inbox_str)
                    if inbox_path.exists() or inbox_path.parent.exists():
                        inbox_path.mkdir(parents=True, exist_ok=True)
                        return inbox_path
        except Exception as e:
            logger.warning(f"Could not parse config.json: {e}")

    # Fallback default: Vault_Root/00_Agent/_Inbox
    vault_root = script_dir.parent
    inbox_path = vault_root / "00_Agent" / "_Inbox"
    inbox_path.mkdir(parents=True, exist_ok=True)
    return inbox_path


def get_log_file_path(inbox_dir: Path) -> Path:
    """Generates current daily log file path: pc_log_YYYY-MM-DD.jsonl"""
    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    return inbox_dir / f"pc_log_{date_str}.jsonl"


def log_activity_entry(inbox_dir: Path) -> None:
    """Captures current system state and appends a JSON entry to the log file."""
    now = datetime.datetime.now().astimezone()
    iso_timestamp = now.isoformat()

    window_title, process_name = get_active_window_details()

    # Determine status based on idle duration
    idle_seconds = get_idle_seconds()
    status = "Idle" if idle_seconds >= IDLE_THRESHOLD_SECONDS else "Active"

    log_entry: Dict[str, Any] = {
        "timestamp": iso_timestamp,
        "window_title": window_title,
        "process_name": process_name,
        "status": status,
        "idle_seconds": round(idle_seconds, 1)
    }

    log_file = get_log_file_path(inbox_dir)

    try:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
            f.flush()
        logger.info(f"Logged [{status} - {round(idle_seconds)}s idle]: {process_name} | '{window_title[:40]}' -> {log_file.name}")
    except OSError as e:
        logger.error(f"Failed writing to log file {log_file}: {e}")


def signal_handler(signum, frame):
    """Graceful termination handler."""
    global running
    logger.info("Termination signal received. Shutting down PC Logger...")
    running = False


def main():
    global running

    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    inbox_dir = load_inbox_path()
    logger.info(f"Starting PC Activity Logger (Win32 Native Hook-Free Mode). Inbox: {inbox_dir}")
    logger.info(f"Log Interval: {LOG_INTERVAL_SECONDS}s | Idle Threshold: {IDLE_THRESHOLD_SECONDS}s")

    try:
        last_log_time = 0.0
        while running:
            current_time = time.time()
            if current_time - last_log_time >= LOG_INTERVAL_SECONDS:
                log_activity_entry(inbox_dir)
                last_log_time = current_time

            time.sleep(1)

    except Exception as e:
        logger.critical(f"Unexpected error in main loop: {e}", exc_info=True)

    finally:
        logger.info("PC Logger stopped gracefully.")


if __name__ == "__main__":
    main()
