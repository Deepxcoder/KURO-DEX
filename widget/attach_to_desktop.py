import sys
import ctypes

def set_desktop_owner(hwnd_val):
    try:
        user32 = ctypes.windll.user32
        desktop = user32.GetDesktopWindow()
        GWLP_HWNDPARENT = -8
        # Set owner of hwnd to Desktop Window so Windows Show Desktop (Win+D / swipe) treats it as part of desktop
        user32.SetWindowLongPtrW(hwnd_val, GWLP_HWNDPARENT, desktop)
        print(f"Attached HWND {hwnd_val} to Desktop {desktop}")
    except Exception as e:
        print(f"Error attaching: {e}", file=sys.stderr)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        set_desktop_owner(int(sys.argv[1]))
