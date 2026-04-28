#!/usr/bin/env python3
"""Update GitHub Secret with new Tauri signing private key."""
from nacl import public
import base64, requests, re, os, json

# Read the new private key
with open('.tauri-updater-key2', 'r') as f:
    secret_value = f.read().strip()

print(f"Private key length: {len(secret_value)}")
print(f"Private key starts with: {secret_value[:50]}...")

# Get token from git config (more reliable than os.popen on PowerShell)
import subprocess
result = subprocess.run(['git', 'remote', 'get-url', 'origin'], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
remote_out = result.stdout.strip()
print(f"Remote URL (masked): {re.sub(r'ghp_[A-Za-z0-9_]+', 'ghp_***', remote_out)}")
print(f"stderr: {result.stderr.strip() if result.stderr else 'none'}")

m = re.search(r'(ghp_[A-Za-z0-9_]+)@', remote_out)
if not m:
    print("ERROR: No token found in remote URL")
    exit(1)
token = m.group(1)
print(f"Token found: ghp_***{token[-4:]}")

owner, repo = 'RiseDock', 'RiseDock'

# Get repo public key
headers = {
    'Authorization': f'token {token}',
    'Accept': 'application/vnd.github+json'
}

r = requests.get(f'https://api.github.com/repos/{owner}/{repo}/actions/secrets/public-key', headers=headers)
print(f"Public key API status: {r.status_code}")

if r.status_code != 200:
    print(f"Error: {r.text}")
    exit(1)

pk_data = r.json()
print(f"Key ID: {pk_data.get('key_id', 'N/A')}")

# Encrypt the secret
pub_key = public.PublicKey(base64.b64decode(pk_data['key']))
seal = public.SealedBox(pub_key)
encrypted = seal.encrypt(secret_value.encode())

# Update the secret
api = f'https://api.github.com/repos/{owner}/{repo}/actions/secrets/TAURI_SIGNING_PRIVATE_KEY'
r2 = requests.put(api, headers=headers, json={
    'encrypted_value': base64.b64encode(encrypted).decode(),
    'key_id': pk_data['key_id']
})
print(f"Update secret status: {r2.status_code}")
if r2.text:
    print(r2.text)
else:
    print("Secret updated successfully!")

# Also update the password secret to empty string
r3 = requests.put(
    f'https://api.github.com/repos/{owner}/{repo}/actions/secrets/TAURI_SIGNING_PRIVATE_KEY_PASSWORD',
    headers=headers,
    json={
        'encrypted_value': base64.b64encode(seal.encrypt(b'')).decode(),
        'key_id': pk_data['key_id']
    }
)
print(f"Update password secret status: {r3.status_code}")
if r3.text:
    print(r3.text)
else:
    print("Password secret updated successfully!")
