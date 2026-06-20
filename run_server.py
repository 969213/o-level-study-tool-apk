import http.server
import socketserver
import socket
import sys

PORT = 8000

def get_local_ip():
    """Try to obtain the local IP address of the machine on the network."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't need to be reachable, just triggers OS interface lookup
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

class MyHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching in local development so files reload instantly
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    local_ip = get_local_ip()
    url_local = f"http://localhost:{PORT}"
    url_network = f"http://{local_ip}:{PORT}"

    print("=========================================================")
    print("        O-LEVEL SMART STUDY TOOL - LOCAL WEB SERVER      ")
    print("=========================================================")
    print(f"Local Host Access:   {url_local}")
    print(f"Local Network Access: {url_network}")
    print("=========================================================")
    print("To test on your Android Phone:")
    print("1. Make sure your PC and Phone are on the same Wi-Fi network.")
    print("2. Open Chrome on your Android phone.")
    print("3. Enter the Local Network URL above: " + url_network)
    print("4. (Optional) In Chrome, open the menu (three dots) and tap")
    print("   'Add to Home screen' or 'Install app' to use it like a")
    print("   native app with offline caching support.")
    print("5. Double-click the battery icon on your phone to open the")
    print("   passcode interface and access the secret tools.")
    print("=========================================================")
    print("Press Ctrl+C to stop the server.")
    print("=========================================================\n")

    handler = MyHTTPHandler
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping web server... Goodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"\nError starting web server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
