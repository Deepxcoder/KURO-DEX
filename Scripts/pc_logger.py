"""
Windows PC Activity Logger
Local AI Productivity Tracking System

Tracks active window titles, process names, and user activity state (Active/Idle).
Outputs daily JSON Lines (.jsonl) log files into the Obsidian Vault Inbox.
"""

import ctypes
import datetime
import json
import logging
import os
from pathlib import Path
import signal
import sys
import time
from typing import Dict, Any, Tuple

import psutil
import pygetwindow as gw
from pynput import keyboard, mouse

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

# Global input tracking state
last_input_time = time.time()
running = True


def on_input_activity(*args, **kwargs) -> None:
    """Callback to update last activity timestamp on mouse or keyboard interaction."""
    global last_input_time
    last_input_time = time.time()


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

    # Determine status based on idle threshold
    time_since_input = time.time() - last_input_time
    status = "Idle" if time_since_input >= IDLE_THRESHOLD_SECONDS else "Active"

    log_entry: Dict[str, Any] = {
        "timestamp": iso_timestamp,
        "window_title": window_title,
        "process_name": process_name,
        "status": status
    }

    log_file = get_log_file_path(inbox_dir)

    try:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
            f.flush()
        logger.info(f"Logged [{status}]: {process_name} | '{window_title[:40]}' -> {log_file.name}")
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
    logger.info(f"Starting PC Activity Logger. Inbox path: {inbox_dir}")
    logger.info(f"Log Interval: {LOG_INTERVAL_SECONDS}s | Idle Threshold: {IDLE_THRESHOLD_SECONDS}s")

    # Start pynput listeners in non-blocking background threads
    mouse_listener = mouse.Listener(
        on_move=on_input_activity,
        on_click=on_input_activity,
        on_scroll=on_input_activity
    )
    keyboard_listener = keyboard.Listener(
        on_press=on_input_activity
    )

    mouse_listener.start()
    keyboard_listener.start()

    logger.info("Activity listeners active. Logger running in background...")

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
        mouse_listener.stop()
        keyboard_listener.stop()
        logger.info("PC Logger stopped gracefully.")


if __name__ == "__main__":
    main()
