"""Lokal demo av sajten. Serverar filerna och tar emot formuläret på samma sätt som send.php gör på webbhotellet."""
import json
import sys
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs

ROOT = Path(__file__).resolve().parent
LEADS = ROOT / "leads" / "leads.php"
GUARD = "<?php exit; ?>\n"
TYPES = {"Hotell", "Fastighet/er", "Verksamhet", "Samarbetspartner"}
HIDDEN = ("/leads", "/dev_server.py", "/send.php")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path.startswith(HIDDEN):
            return self.send_error(404)
        super().do_GET()

    def do_HEAD(self):
        if self.path.startswith(HIDDEN):
            return self.send_error(404)
        super().do_HEAD()

    def do_POST(self):
        if self.path.split("?")[0] != "/send.php":
            return self.send_error(404)
        length = min(int(self.headers.get("Content-Length") or 0), 20000)
        form = {k: v[0] for k, v in parse_qs(self.rfile.read(length).decode("utf-8", "replace")).items()}
        get = lambda k, n=120: " ".join(form.get(k, "").split())[:n]

        if form.get("webbplats"):
            return self.respond(True)
        lead = {
            "tid": datetime.now().isoformat(timespec="seconds"),
            "typ": form.get("typ") if form.get("typ") in TYPES else "Övrigt",
            "pris_msek": int(form["pris"]) if form.get("pris", "").isdigit() else None,
            "namn": get("namn"),
            "foretag": get("foretag"),
            "telefon": get("telefon", 40),
            "epost": get("epost", 160),
            "ort": get("ort"),
            "meddelande": form.get("meddelande", "").strip()[:4000],
        }
        if not (lead["namn"] and lead["telefon"] and "@" in lead["epost"] and form.get("samtycke") == "ja"):
            return self.respond(False, 422)

        LEADS.parent.mkdir(exist_ok=True)
        if not LEADS.exists():
            LEADS.write_text(GUARD, encoding="utf-8")
        with LEADS.open("a", encoding="utf-8") as f:
            f.write(json.dumps(lead, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e") + "\n")
        print(f"\n  Ny förfrågan: {lead['typ']}, {lead['pris_msek']} MSEK, {lead['namn']} ({lead['epost']})\n", flush=True)
        self.respond(True)

    def respond(self, ok, status=200):
        if "application/json" in self.headers.get("Accept", ""):
            body = json.dumps({"ok": ok}).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(303)
            self.send_header("Location", "/?" + ("skickat=1" if ok else "fel=1") + "#formular")
            self.end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8085
    print(f"Agmenta demo: http://localhost:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
