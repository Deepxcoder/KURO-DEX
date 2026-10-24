import ctypes
from ctypes import wintypes
import sys
import threading
import time

user32 = ctypes.windll.user32

# Attach thread to interactive desktop
hdesk = user32.OpenDesktopW("Default", 0, False, 0x01FF)
if hdesk:
    user32.SetThreadDesktop(hdesk)

# Windows API prototypes
user32.GetForegroundWindow.restype = wintypes.HWND
user32.IsIconic.argtypes = [wintypes.HWND]
user32.IsIconic.restype = wintypes.BOOL
user32.IsWindow.argtypes = [wintypes.HWND]
user32.IsWindow.restype = wintypes.BOOL
user32.ShowWindow.argtypes = [wintypes.HWND, ctypes.c_int]
user32.ShowWindow.restype = wintypes.BOOL
user32.SetWindowPos.argtypes = [
    wintypes.HWND,
    wintypes.HWND,
    ctypes.c_int,
    ctypes.c_int,
    ctypes.c_int,
    ctypes.c_int,
    wintypes.UINT
]
user32.SetWindowPos.restype = wintypes.BOOL
user32.GetClassNameW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]

HWND_TOPMOST = -1
HWND_NOTOPMOST = -2
HWND_BOTTOM = 1
SWP_NOMOVE = 0x0002
SWP_NOSIZE = 0x0001
SWP_NOACTIVATE = 0x0010
SW_RESTORE = 9
SW_SHOWNOACTIVATE = 4

DESKTOP_CLASSES = {
    "Progman",
    "WorkerW",
    "Shell_TrayWnd",
    "Shell_SecondaryTrayWnd"
}

is_pinned = True
is_always_on_top = False
running = True

def is_desktop_or_shell(fg_hwnd, widget_hwnd):
    if not fg_hwnd or fg_hwnd == widget_hwnd:
        return True
    cls_buf = ctypes.create_unicode_buffer(256)
    user32.GetClassNameW(fg_hwnd, cls_buf, 256)
    c = cls_buf.value
    if not c or c in DESKTOP_CLASSES or c.startswith("XamlExplorerHost") or c == "ForegroundStaging":
        return True
    return False

def stdin_reader():
    global is_pinned, is_always_on_top, running
    try:
        while running:
            line = sys.stdin.readline()
            if not line:
                break
            line = line.strip().lower()
            if not line:
                continue
            if line == "quit" or line == "exit":
                running = False
                break
            elif line.startswith("pin "):
                parts = line.split()
                is_pinned = (parts[1] == "1" or parts[1] == "true")
            elif line.startswith("topmost "):
                parts = line.split()
                is_always_on_top = (parts[1] == "1" or parts[1] == "true")
    except Exception:
        pass

def run_daemon(hwnd_val):
    global running
    hwnd = wintypes.HWND(hwnd_val)
    if not user32.IsWindow(hwnd):
        print(f"Error: Invalid window handle {hwnd_val}", file=sys.stderr, flush=True)
        return

    # Start background stdin listener
    t = threading.Thread(target=stdin_reader, daemon=True)
    t.start()

    print(f"Desktop widget daemon started for HWND {hwnd_val}", flush=True)
    current_z_state = None  # "top" or "bottom"

    while running:
        if not user32.IsWindow(hwnd):
            print("Widget window closed. Exiting daemon.", flush=True)
            break

        if is_pinned:
            # 1. Protect against minimization during 3-finger swipe down or Win+D
            if user32.IsIconic(hwnd):
                user32.ShowWindow(hwnd, SW_RESTORE)
                user32.ShowWindow(hwnd, SW_SHOWNOACTIVATE)
                user32.SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE)
                current_z_state = "top"

            # 2. Check foreground window to position widget properly
            fg = user32.GetForegroundWindow()
            on_desktop = is_desktop_or_shell(fg, hwnd)

            if is_always_on_top or on_desktop:
                if current_z_state != "top":
                    user32.SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE)
                    current_z_state = "top"
            else:
                # User is active in an application (Chrome, VSCode, etc.)
                # Push widget behind regular application windows
                if current_z_state != "bottom":
                    user32.SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE)
                    user32.SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE)
                    current_z_state = "bottom"
        else:
            # Not pinned to desktop - normal window behavior
            if is_always_on_top:
                if current_z_state != "top":
                    user32.SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE)
                    current_z_state = "top"
            else:
                if current_z_state != "normal":
                    user32.SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE)
                    current_z_state = "normal"

        time.sleep(0.08)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        hwnd_arg = int(sys.argv[1])
        if len(sys.argv) > 2 and sys.argv[2].lower() == 'detach':
            is_pinned = False
        run_daemon(hwnd_arg)
