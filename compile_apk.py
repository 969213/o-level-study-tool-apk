import os
import sys
import shutil
import urllib.request
import zipfile
import subprocess
import traceback

BASE_DIR = r"C:\Users\mjite\.gemini\antigravity\scratch\o_level_study_tool"
TOOLS_DIR = os.path.join(BASE_DIR, "build_tools")
JDK_DIR = os.path.join(TOOLS_DIR, "jdk")
SDK_DIR = os.path.join(TOOLS_DIR, "sdk")
CORDOVA_DIR = os.path.join(TOOLS_DIR, "cordova_project")

JDK_URL = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse"
SDK_URL = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"

def log(msg):
    print(f"[APK_BUILDER] {msg}")
    sys.stdout.flush()

def download_file(url, filepath):
    log(f"Downloading {url} to {filepath} using curl...")
    # Use curl.exe directly for reliable downloads and redirects
    cmd = ["curl.exe", "-L", "-o", filepath, url]
    subprocess.run(cmd, check=True)
    log(f"Finished downloading {filepath}.")

def extract_zip(filepath, extract_to):
    log(f"Extracting {filepath} to {extract_to}...")
    os.makedirs(extract_to, exist_ok=True)
    with zipfile.ZipFile(filepath, 'r') as zip_ref:
        zip_ref.extractall(extract_to)
    log(f"Extraction completed.")

def setup_jdk():
    if os.path.exists(os.path.join(JDK_DIR, "bin", "java.exe")):
        log("JDK already exists, skipping download.")
        return
        
    jdk_zip = os.path.join(TOOLS_DIR, "jdk.zip")
    os.makedirs(TOOLS_DIR, exist_ok=True)
    download_file(JDK_URL, jdk_zip)
    
    # Extract to a temp dir and then move contents up to JDK_DIR
    temp_jdk = os.path.join(TOOLS_DIR, "temp_jdk")
    extract_zip(jdk_zip, temp_jdk)
    
    # Adoptium zip contains a single parent folder (e.g. jdk-17.0.10+7)
    subdirs = [d for d in os.listdir(temp_jdk) if os.path.isdir(os.path.join(temp_jdk, d))]
    if subdirs:
        src = os.path.join(temp_jdk, subdirs[0])
        log(f"Moving JDK contents from {src} to {JDK_DIR}...")
        shutil.move(src, JDK_DIR)
    
    # Clean up
    shutil.rmtree(temp_jdk)
    os.remove(jdk_zip)
    log("JDK setup successfully.")

def setup_sdk():
    if os.path.exists(os.path.join(SDK_DIR, "cmdline-tools", "latest", "bin", "sdkmanager.bat")):
        log("Android SDK cmdline-tools already exists, skipping download.")
        return
        
    sdk_zip = os.path.join(TOOLS_DIR, "sdk.zip")
    os.makedirs(TOOLS_DIR, exist_ok=True)
    download_file(SDK_URL, sdk_zip)
    
    # Extract to temp
    temp_sdk = os.path.join(TOOLS_DIR, "temp_sdk")
    extract_zip(sdk_zip, temp_sdk)
    
    # Structure needs to be: SDK_DIR/cmdline-tools/latest
    dest_cmdline = os.path.join(SDK_DIR, "cmdline-tools", "latest")
    os.makedirs(os.path.join(SDK_DIR, "cmdline-tools"), exist_ok=True)
    
    src = os.path.join(temp_sdk, "cmdline-tools")
    log(f"Moving SDK commandline tools from {src} to {dest_cmdline}...")
    shutil.move(src, dest_cmdline)
    
    # Clean up
    shutil.rmtree(temp_sdk)
    os.remove(sdk_zip)
    log("Android SDK Commandline Tools setup successfully.")

def configure_env():
    log("Configuring environment variables...")
    os.environ["JAVA_HOME"] = JDK_DIR
    os.environ["ANDROID_HOME"] = SDK_DIR
    os.environ["ANDROID_SDK_ROOT"] = SDK_DIR
    
    # Update PATH
    path_entries = [
        os.path.join(JDK_DIR, "bin"),
        os.path.join(SDK_DIR, "cmdline-tools", "latest", "bin"),
        os.path.join(SDK_DIR, "platform-tools")
    ]
    
    current_path = os.environ.get("PATH", "")
    for entry in path_entries:
        if entry not in current_path:
            current_path = entry + os.pathsep + current_path
            
    os.environ["PATH"] = current_path
    log(f"Environment configured. JAVA_HOME={JDK_DIR}, ANDROID_HOME={SDK_DIR}")

def accept_licenses():
    sdkmanager = os.path.join(SDK_DIR, "cmdline-tools", "latest", "bin", "sdkmanager.bat")
    log("Accepting Android SDK licenses...")
    
    # Run sdkmanager --licenses and automatically reply 'y'
    p = subprocess.Popen([sdkmanager, "--licenses"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        # Give it a stream of 'y\n'
        stdout, stderr = p.communicate(input="y\ny\ny\ny\ny\ny\ny\ny\ny\n", timeout=120)
        log("Licenses accepted successfully.")
    except subprocess.TimeoutExpired:
        p.kill()
        log("License acceptance timed out. Killing process.")
        raise Exception("Failed to accept Android SDK licenses.")

def install_sdk_packages():
    sdkmanager = os.path.join(SDK_DIR, "cmdline-tools", "latest", "bin", "sdkmanager.bat")
    log("Installing Android SDK platform and build tools...")
    
    # We install platforms;android-33, build-tools;33.0.2, and platform-tools
    cmd = [sdkmanager, "platform-tools", "build-tools;33.0.2", "platforms;android-33"]
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    if p.returncode != 0:
        log(f"Failed to install SDK packages. Error:\n{p.stderr}")
        raise Exception("SDK packages installation failed.")
    log("SDK packages installed successfully.")

def build_cordova_project():
    log("Setting up Cordova project...")
    os.makedirs(TOOLS_DIR, exist_ok=True)
    
    if os.path.exists(CORDOVA_DIR):
        log("Cordova project folder already exists, removing old folder...")
        shutil.rmtree(CORDOVA_DIR)
        
    # Create Cordova project
    log("Running cordova create...")
    subprocess.run(["npx", "cordova", "create", "cordova_project", "com.olevel.study", "OLevelApp"], cwd=TOOLS_DIR, shell=True, check=True)
    
    # Copy web assets to cordova_project/www/
    www_dir = os.path.join(CORDOVA_DIR, "www")
    if os.path.exists(www_dir):
        shutil.rmtree(www_dir)
    os.makedirs(www_dir)
    
    # Files to copy
    files_to_copy = ["index.html", "style.css", "app.js", "questions.json", "manifest.json", "sw.js", "icon-192.png", "icon-512.png"]
    for file in files_to_copy:
        src = os.path.join(BASE_DIR, file)
        dest = os.path.join(www_dir, file)
        if os.path.exists(src):
            shutil.copy(src, dest)
            log(f"Copied {file} to Cordova asset folder.")
        else:
            log(f"Warning: {file} not found, skipping copy.")
            
    # Add Android Platform
    log("Adding Android platform to Cordova project...")
    subprocess.run(["npx", "cordova", "platform", "add", "android@12.0.0"], cwd=CORDOVA_DIR, shell=True, check=True)
    
    # Build Android Platform (which triggers Gradle compilation)
    log("Compiling Cordova Android APK... (this might download Gradle and takes about 1-2 minutes)")
    subprocess.run(["npx", "cordova", "build", "android"], cwd=CORDOVA_DIR, shell=True, check=True)
    
    # Locate built APK
    apk_source = os.path.join(CORDOVA_DIR, "platforms", "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk")
    apk_dest = os.path.join(BASE_DIR, "o_level_study_app.apk")
    
    if os.path.exists(apk_source):
        shutil.copy(apk_source, apk_dest)
        log(f"APK created successfully! Saved to: {apk_dest}")
        # Clean build tools folder to free up space
        log("Cleaning up temp build directories to free space...")
        # We can keep JDK and SDK to avoid downloading again, but we can clean cordova workspace
        shutil.rmtree(CORDOVA_DIR)
        log("Clean up finished.")
    else:
        raise Exception(f"APK compilation succeeded but couldn't locate target APK at {apk_source}")

def main():
    try:
        log("Starting compilation process for O-Level Smart Study App APK...")
        setup_jdk()
        setup_sdk()
        configure_env()
        accept_licenses()
        install_sdk_packages()
        build_cordova_project()
        log("SUCCESS: APK is fully built and ready to install!")
    except Exception as e:
        log(f"ERROR during APK compilation: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
