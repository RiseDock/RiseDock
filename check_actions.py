#!/usr/bin/env python3
import requests, re, subprocess
r = subprocess.run(['git','remote','get-url','origin'], capture_output=True, text=True, cwd=r'D:\AI_WorkDir\WorkBuddy\risedock')
m = re.search(r'(ghp_[A-Za-z0-9_]+)@', r.stdout.strip())
token = m.group(1)
resp = requests.get('https://api.github.com/repos/RiseDock/RiseDock/actions/runs?per_page=3',
    headers={'Authorization': f'token {token}', 'Accept': 'application/vnd.github+json'})
runs = resp.json().get('workflow_runs', [])
for run in runs:
    print(f"{run['id']} | {run['name']} | {run['status']} | {run.get('conclusion') or 'running'} | {run['event']} | {run['head_branch']} | {run['created_at']}")
