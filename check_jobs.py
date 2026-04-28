#!/usr/bin/env python3
import requests, re, subprocess
r = subprocess.run(['git','remote','get-url','origin'], capture_output=True, text=True, cwd=r'D:\AI_WorkDir\WorkBuddy\risedock')
m = re.search(r'(ghp_[A-Za-z0-9_]+)@', r.stdout.strip())
token = m.group(1)

# Get the specific run's jobs
run_id = 25046692966
resp = requests.get(f'https://api.github.com/repos/RiseDock/RiseDock/actions/runs/{run_id}/jobs',
    headers={'Authorization': f'token {token}', 'Accept': 'application/vnd.github+json'})
jobs = resp.json().get('jobs', [])
for job in jobs:
    print(f"Job: {job['name']} - {job['conclusion']}")
    for step in job.get('steps', []):
        print(f"  Step: {step['name']} - {step['conclusion']}")
