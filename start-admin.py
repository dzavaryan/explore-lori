#!/usr/bin/env python3
"""
Explore Lori — Admin Server
Usage: python3 start-admin.py
Then:  http://localhost:3000/admin/
"""

import os, json, zipfile, io, threading, webbrowser
import urllib.request, urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 3000
ROOT = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(ROOT, 'admin', 'config.json')

SKIP_DIRS  = {'.git', '__MACOSX', '.claude', 'node_modules', '.Trash'}
SKIP_FILES = {'.DS_Store', '.gitignore', '.gitkeep'}

def load_config():
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f)
    except Exception:
        return {}

class Handler(SimpleHTTPRequestHandler):

    def do_OPTIONS(self):
        self._cors(200)
        self.end_headers()

    def do_GET(self):
        p = urllib.parse.urlparse(self.path).path
        if   p == '/api/deploy':         self._deploy()
        elif p == '/api/deploy-status':  self._deploy_status()
        elif p == '/api/images':         self._list_images()
        else:                            super().do_GET()

    # ── helpers ──────────────────────────────────────────────────────

    def _cors(self, code):
        self.send_response(code)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json(self, data, status=200):
        body = json.dumps(data).encode()
        self._cors(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # ── endpoints ─────────────────────────────────────────────────────

    def _list_images(self):
        d = os.path.join(ROOT, 'images')
        if not os.path.isdir(d):
            self._json([]); return
        exts = {'.jpg','.jpeg','.png','.gif','.webp','.svg'}
        files = sorted(f for f in os.listdir(d)
                       if os.path.splitext(f)[1].lower() in exts)
        self._json(files)

    def _deploy(self):
        cfg = load_config()
        token   = cfg.get('netlify_token', '')
        site_id = cfg.get('netlify_site_id', '')
        if not token or not site_id:
            self._json({'ok': False, 'error': 'Missing netlify_token or netlify_site_id in admin/config.json'}, 500)
            return

        buf = io.BytesIO()
        os.chdir(ROOT)
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            for r, dirs, files in os.walk('.'):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
                for fname in files:
                    if fname in SKIP_FILES: continue
                    path = os.path.join(r, fname)
                    arc  = path[2:]  # strip './'
                    try:
                        zf.write(path, arc)
                    except (PermissionError, OSError):
                        pass

        req = urllib.request.Request(
            f'https://api.netlify.com/api/v1/sites/{site_id}/deploys',
            data=buf.getvalue(),
            headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/zip'},
            method='POST'
        )
        try:
            with urllib.request.urlopen(req, timeout=90) as res:
                r = json.loads(res.read())
                self._json({'ok': True, 'id': r.get('id'), 'state': r.get('state'),
                            'url': r.get('deploy_ssl_url') or r.get('ssl_url')})
        except urllib.error.HTTPError as e:
            self._json({'ok': False, 'error': f'HTTP {e.code}: {e.read().decode()}'}, 500)
        except Exception as e:
            self._json({'ok': False, 'error': str(e)}, 500)

    def _deploy_status(self):
        cfg   = load_config()
        token = cfg.get('netlify_token', '')
        qs    = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        did   = qs.get('id', [''])[0]
        if not did or not token:
            self._json({'state': 'unknown'}); return
        req = urllib.request.Request(
            f'https://api.netlify.com/api/v1/deploys/{did}',
            headers={'Authorization': f'Bearer {token}'}
        )
        try:
            with urllib.request.urlopen(req) as res:
                r = json.loads(res.read())
                self._json({'state': r.get('state'), 'url': r.get('deploy_ssl_url')})
        except Exception as e:
            self._json({'state': 'unknown', 'error': str(e)})

    def log_message(self, fmt, *args):
        # suppress 2xx/3xx noise; show errors
        if args and len(args) >= 2:
            try:
                if int(str(args[1])[:3]) >= 400:
                    super().log_message(fmt, *args)
            except (ValueError, IndexError):
                pass


if __name__ == '__main__':
    os.chdir(ROOT)
    print('╔══════════════════════════════════════╗')
    print('║   Explore Lori  ·  Admin Server      ║')
    print(f'║   http://localhost:{PORT}/admin/       ║')
    print('║   Ctrl+C to stop                     ║')
    print('╚══════════════════════════════════════╝')
    threading.Timer(1.5, lambda: webbrowser.open(f'http://localhost:{PORT}/admin/')).start()
    try:
        with HTTPServer(('', PORT), Handler) as srv:
            srv.serve_forever()
    except KeyboardInterrupt:
        print('\n   Stopped.')
