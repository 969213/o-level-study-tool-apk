import zipfile
import os

def zip_files():
    zip_name = "o_level_study_tool.zip"
    files_to_zip = [
        "index.html", 
        "style.css", 
        "app.js", 
        "questions.json",
        "manifest.json",
        "sw.js",
        "icon-192.png",
        "icon-512.png",
        "run_server.py"
    ]
    
    print(f"Creating {zip_name}...")
    
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file in files_to_zip:
            if os.path.exists(file):
                zipf.write(file)
                print(f"Added {file}")
            else:
                print(f"Warning: {file} not found.")
                
    print("Zip archive created successfully.")

if __name__ == "__main__":
    zip_files()
