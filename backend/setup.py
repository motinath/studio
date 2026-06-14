"""
Quick setup script — creates virtual environment and installs dependencies.
Run: python setup.py   (Windows)
     python3 setup.py  (macOS/Linux)
"""
import subprocess
import sys
import os


def run(cmd, check=True):
    print(f"\n>>> {cmd}")
    result = subprocess.run(cmd, shell=True)
    if check and result.returncode != 0:
        print(f"ERROR: command failed with code {result.returncode}")
        sys.exit(result.returncode)
    return result.returncode


# Use the current Python interpreter directly — this is always correct
# regardless of whether the `py` launcher or PATH is configured properly.
def find_python() -> str:
    return sys.executable


python = find_python()
print(f"Using Python: {python}")


# Create venv if not present
if not os.path.exists(".venv"):
    run(f'"{python}" -m venv .venv')
else:
    print(">>> .venv already exists, skipping creation")

# Detect venv paths
if sys.platform == "win32":
    venv_python = r".venv\Scripts\python.exe"
    venv_pip    = r".venv\Scripts\pip.exe"
else:
    venv_python = ".venv/bin/python"
    venv_pip    = ".venv/bin/pip"

# Install requirements (skip pip self-upgrade to avoid Windows lock issue)
run(f'"{venv_pip}" install -r requirements.txt')

print("\n[OK] Setup complete!")
print("\nTo start the backend:")
if sys.platform == "win32":
    print(f"  .venv\\Scripts\\python run.py")
else:
    print(f"  .venv/bin/python run.py")
print(f"\nAPI docs: http://localhost:5000/docs")
