import subprocess
import sys
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

def run_script(script_name):
    script_path = os.path.join(CURRENT_DIR, script_name)
    print(f"Executing {script_path} from directory {CURRENT_DIR}")
    try:
        result = subprocess.run(
            [sys.executable, script_path],
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            cwd=CURRENT_DIR
        )
        print(result.stdout)
        if result.stderr:
            print(f"Error output from {script_path}:\n{result.stderr}")
    except subprocess.CalledProcessError as e:
        print(f"Error executing {script_path}:")
        print(f"Command: {e.cmd}")
        print(f"Return Code: {e.returncode}")
        print(f"Stdout:\n{e.stdout}")
        print(f"Stderr:\n{e.stderr}")
        sys.exit(1)
    except FileNotFoundError:
        print(f"Error: Python interpreter not found or script {script_path} does not exist.")
        sys.exit(1)

if __name__ == "__main__":
    scripts = [
        "extract.py",
        "combine_member_tables.py",
        "combine_discography_tables.py",
    ]

    for script in scripts:
        print(f"\n--- Running {script} ---")
        run_script(script)

    print("\n--- All Python scripts executed successfully. ---")