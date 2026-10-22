#!/usr/bin/env python3
"""Build the password-protected T-REX Trial Hub.

Run by GitHub Actions every hour:
  1. decrypts content.enc (instructions, team, sites, links, country passwords) with SITE_PASSWORD
  2. reads the Patients and Documents tables from Airtable with AIRTABLE_TOKEN (read-only)
  3. makes one encrypted data package per password:
       SITE_PASSWORD      -> all countries (coordinating team)
       each country name  -> that country's participants and documents only
  4. downloads every document file and stores it encrypted
  5. writes _site/ (login page + encrypted packages), which the workflow publishes to GitHub Pages

Nothing readable is ever stored in the repository or on the public site.
"""
import base64, datetime, hashlib, json, os, secrets, subprocess, sys, unicodedata
import urllib.parse, urllib.request, urllib.error, shutil, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src" if (ROOT / "src" / "template.html").exists() else ROOT
BASE = "appUIdFlPDYSWeJ2A"
TABLE = "tblj8GiDWb5NkGzlQ"
DOCS_TABLE = "tblwxPH7Jba2zIf5f"
TEAM_TABLE = "tblwFjHPu3Fn76OAD"
T = {"name": "fldMT2hR7QUg5dPNi", "role": "fldaCC7eqtVzg8Iwp", "site": "fld1dF1O0h8T9oI0L", "email": "fldo6CYAzVtynrVd6", "phone": "fld3xAdwhII04k3ls", "hide": "fldZWYPZMs5oAtmEG"}
ITER = 250000
FIELDS = [
    # PID, country, site, arm (lookup), allocation, randomisation date, FUP status, closest FUP
    "fld5OnRlgnKUqfwN1", "fldwVIZA2itGyhKg4", "fldTUz1LqLHkNsD6q", "fldzcs7s9CLfqGvB4",
    "fldlPS6TtS0ajk6DD", "fldnSvyeUHJyqfMAu", "fldLwysBskRTGZiT8", "fldwhNE4xhS5oZlcK",
    # estimated and actual follow-up dates, M3 ... M60
    "fld7BZbJ5OVKEGQjb", "fldrvOxFcGCNdfpp6", "fldfXSOb0YILTwJ2A", "fldjmclqiO1QERBTF",
    "fldiQJy00rf5fDn2b", "fldps6xjVry3NehvM", "fldpstbeRS7ujkfcB", "fld4i4ZBTwAmKNZOW",
    "fldPrcIvYom4gzhyL", "fld9royPModHXDcxR", "fldUz9aXk9J2PMuGe", "fldjpu8YlVwbnbqvL",
    "fldilexThndsBbYCF", "fldAj8IikikvjrJ56", "fldn9phksCI7lh9BG", "fldQXVwxEKiIWyC6f",
    "fldM8sIQsJ9BtIUly", "fld8Xl1v1uqej1Ety", "fldaVRQNmQ1jgMkFM", "fldFHftFF5YEYQuHB",
    "fldVYIYMuXohYTv6H", "fld7GFrGf91yrbCIe", "fldRykAIviRgn5Q34", "fldOyaZnvbRUnsiVI",
    "fldylYOI20uY2vTDS", "fldFXoSylz8Qpipk4", "fldzWZ7kqAmhGQY6c", "fldM7mFmtuNFD0mA3",
]
F_SITE, F_COUNTRY, F_ARM, F_ALLOC = "fldTUz1LqLHkNsD6q", "fldwVIZA2itGyhKg4", "fldzcs7s9CLfqGvB4", "fldlPS6TtS0ajk6DD"
D = {"title": "fldZVOt2noQr6X0Of", "country": "fldyCkt8bJ3921BVu", "type": "fldr92jOkXRmZ894p",
     "lang": "fld881QOdrh2QOjaW", "version": "fld1jBlO6V2Osm9X9", "date": "fldg8IyVftoYQna6I",
     "file": "fldlKhtJiT5XbGrQd", "by": "fld0VdlSaCwiecH8P", "notes": "fldQYqrI2IktdPvLY", "old": "fldS0jMU6xeUMo4Po"}
ALL = "All countries (English master)"
FIX = {"swizerland": "Switzerland"}


def need(name):
    v = os.environ.get(name, "")
    if not v:
        sys.exit(f"Missing secret {name}. Add it under Settings > Secrets and variables > Actions.")
    return v


def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower().strip()


def text(v):
    if v is None:
        return ""
    if isinstance(v, (str, int, float)):
        return str(v)
    if isinstance(v, list):
        return ", ".join(filter(None, (text(x) for x in v)))
    if isinstance(v, dict):
        return text(v.get("name", v.get("value", "")))
    return ""


def decrypt_content(password):
    out = subprocess.run(
        ["openssl", "enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-salt",
         "-in", str(ROOT / "content.enc"), "-pass", "env:SITE_PASSWORD"],
        capture_output=True, env={**os.environ, "SITE_PASSWORD": password})
    if out.returncode != 0:
        sys.exit("Could not decrypt content.enc: SITE_PASSWORD does not match the password the content was encrypted with.")
    s = out.stdout.decode("utf-8")
    return json.loads(s.split("=", 1)[1].strip().rstrip(";"))


def fetch_table(token, table, fields):
    records, offset = [], None
    while True:
        q = [("returnFieldsByFieldId", "true"), ("pageSize", "100")] + [("fields[]", f) for f in fields]
        if offset:
            q.append(("offset", offset))
        req = urllib.request.Request(
            f"https://api.airtable.com/v0/{BASE}/{table}?" + urllib.parse.urlencode(q),
            headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                page = json.load(r)
        except urllib.error.HTTPError as e:
            if table in (DOCS_TABLE, TEAM_TABLE):
                print(f"Table {table} not readable ({e.code}); building without it.")
                return []
            sys.exit(f"Airtable refused the request ({e.code}). Check that AIRTABLE_TOKEN has data.records:read on the T-REX randomisation base.")
        for rec in page.get("records", []):
            f = {k: v for k, v in rec.get("fields", {}).items() if k in fields}
            records.append({"id": rec.get("id"), "createdTime": rec.get("createdTime"), "fields": f})
        offset = page.get("offset")
        if not offset:
            return records


def download(url):
    if url.startswith("file://"):  # local tests
        return pathlib.Path(url[7:]).read_bytes()
    with urllib.request.urlopen(urllib.request.Request(url), timeout=120) as r:
        return r.read()


def derive(password, salt):
    dk = hashlib.pbkdf2_hmac("sha256", norm(password).encode("utf-8"), salt, ITER, dklen=64)
    return dk[:32], dk[32:48].hex()


def main():
    master = need("SITE_PASSWORD")
    content = decrypt_content(master)
    local = os.environ.get("LOCAL_RECORDS")
    if local:  # for testing without a token
        records = json.load(open(local))
        docs = json.load(open(os.environ["LOCAL_DOCS"])) if os.environ.get("LOCAL_DOCS") else []
        team = json.load(open(os.environ["LOCAL_TEAM"])) if os.environ.get("LOCAL_TEAM") else []
    else:
        token = need("AIRTABLE_TOKEN")
        records = fetch_table(token, TABLE, FIELDS)
        docs = fetch_table(token, DOCS_TABLE, list(D.values()))
        team = fetch_table(token, TEAM_TABLE, list(T.values()))
    added = []
    for t in team:
        f = t.get("fields", {})
        if f.get(T["hide"]) or not text(f.get(T["name"])).strip():
            continue
        added.append({"name": text(f.get(T["name"])).strip(), "role": text(f.get(T["role"])), "site": text(f.get(T["site"])),
                      "email": text(f.get(T["email"])).strip(), "phone": text(f.get(T["phone"])).strip()})
    content["teamAdded"] = added
    fetched = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # country of every participant: from the site list, else the Airtable country field
    site_country = {norm(s["name"]): s.get("country", "") for s in content.get("sites", [])}
    def rec_country(r):
        f = r.get("fields", {})
        c = site_country.get(norm(text(f.get(F_SITE))))
        if not c:
            raw = text(f.get(F_COUNTRY))
            c = FIX.get(norm(raw), raw)
        return c or "Unknown"
    for r in records:
        r["country"] = rec_country(r)

    # trial-wide counts per site (numbers only, shown to every country)
    totals = {}
    for r in records:
        f = r["fields"]
        k = norm(text(f.get(F_SITE))) or "unknown"
        t = (text(f.get(F_ALLOC)) or text(f.get(F_ARM))).lower()
        b = totals.setdefault(k, {"n": 0, "as": 0, "crt": 0})
        b["n"] += 1
        if "chemo" in t: b["crt"] += 1
        elif "surveil" in t: b["as"] += 1

    work = ROOT / "_build"
    shutil.rmtree(work, ignore_errors=True)
    (work / "plain").mkdir(parents=True)
    site = ROOT / "_site"
    shutil.rmtree(site, ignore_errors=True)
    (site / "p").mkdir(parents=True)
    (site / "f").mkdir()
    jobs = []

    # documents: every file encrypted with its own random key
    doc_list = []
    for d in docs:
        f = d.get("fields", {})
        files = f.get(D["file"]) or []
        country = text(f.get(D["country"])) or ALL
        for i, att in enumerate(files):
            try:
                data = download(att["url"])
            except Exception as e:
                print(f"Could not download a document file ({e}); skipped.")
                continue
            name = secrets.token_hex(12)
            key = secrets.token_bytes(32)
            src = work / "plain" / name
            src.write_bytes(data)
            jobs.append({"in": str(src), "out": str(site / "f" / (name + ".bin")), "key": key.hex()})
            doc_list.append({
                "title": text(f.get(D["title"])) or att.get("filename", "Document"),
                "country": country, "type": text(f.get(D["type"])) or "Other",
                "lang": text(f.get(D["lang"])), "version": text(f.get(D["version"])),
                "date": text(f.get(D["date"])), "by": text(f.get(D["by"])), "notes": text(f.get(D["notes"])),
                "old": bool(f.get(D["old"])), "filename": att.get("filename", "document"),
                "mime": att.get("type", "application/octet-stream"), "size": len(data),
                "part": i + 1, "parts": len(files),
                "src": "f/" + name + ".bin", "key": base64.b64encode(key).decode()})

    # one package per password
    countries = sorted({s.get("country") for s in content.get("sites", []) if s.get("country")} |
                       {r["country"] for r in records if r["country"] != "Unknown"})
    pw_override = content.pop("passwords", {}) or {}
    audiences = [("all", master)] + [(c, pw_override.get(c) or c) for c in countries]
    seen = {}
    for who, pw in audiences:
        if norm(pw) in seen:
            sys.exit(f"Two audiences share the same password ({seen[norm(pw)]} and {who}).")
        seen[norm(pw)] = who
    salt = secrets.token_bytes(16)
    for who, pw in audiences:
        mine = records if who == "all" else [r for r in records if r["country"] == who]
        pkg = {"who": who, "content": content,
               "at": {"records": [{"createdTime": r["createdTime"], "fields": r["fields"], "country": r["country"]} for r in mine],
                      "fetchedAt": fetched, "totals": totals},
               "docs": [d for d in doc_list if who == "all" or d["country"] in (who, ALL)],
               "countries": countries}
        key, ident = derive(pw, salt)
        src = work / "plain" / ("pkg-" + ident)
        src.write_text(json.dumps(pkg, ensure_ascii=False), "utf-8")
        jobs.append({"in": str(src), "out": str(site / "p" / (ident + ".bin")), "key": key.hex()})

    (work / "jobs.json").write_text(json.dumps(jobs))
    subprocess.run(["node", str(SRC / "seal.js"), str(work / "jobs.json")], check=True)

    tpl = (SRC / "template.html").read_text("utf-8")
    logo = base64.b64encode((SRC / "logo.svg").read_bytes()).decode()
    boot = "window.TREX_BOOT = " + json.dumps({"salt": base64.b64encode(salt).decode(), "iter": ITER}) + ";"
    page = (tpl.replace("__LOGO__", "data:image/svg+xml;base64," + logo)
               .replace("__BOOT__", boot)
               .replace("__APP__", (SRC / "app.js").read_text("utf-8")))
    (site / "index.html").write_text(page, "utf-8")
    (site / "robots.txt").write_text("User-agent: *\nDisallow: /\n")
    shutil.rmtree(work, ignore_errors=True)
    print(f"Built hub: {len(records)} participants, {len(doc_list)} document files, {len(audiences)} passwords ({', '.join(c for c, _ in audiences[1:])}).")


if __name__ == "__main__":
    main()
