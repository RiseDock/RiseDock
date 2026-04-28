#!/usr/bin/env python3
import requests, re, subprocess
r = subprocess.run(['git','remote','get-url','origin'], capture_output=True, text=True, cwd=r'D:\AI_WorkDir\WorkBuddy\risedock')
m = re.search(r'(ghp_[A-Za-z0-9_]+)@', r.stdout.strip())
token = m.group(1)

# Get the job logs
run_id = 25046692966
resp = requests.get(f'https://api.github.com/repos/RiseDock/RiseDock/actions/runs/{run_id}/jobs',
    headers={'Authorization': f'token {token}', 'Accept': 'application/vnd.github+json'})
jobs = resp.json().get('jobs', [])
job_id = jobs[0]['id']

# Get logs
resp2 = requests.get(f'https://api.github.com/repos/RiseDock/RiseDock/actions/jobs/{job_id}/logs',
    headers={'Authorization': f'token {token}', 'Accept': 'application/vnd.github+json'})

logs = resp2.text
# Search for signing related lines
for line in logs.split('\n'):
    lower = line.lower()
    if any(kw in lower for kw in ['sign', 'sig', 'updater', 'latest.json', 'artifact', 'found', 'bundle', 'tauri']):
        print(line)
