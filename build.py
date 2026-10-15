#!/usr/bin/env python3
"""Build the password-protected T-REX Trial Hub.

Run by GitHub Actions every hour:
  1. decrypts content.enc (instructions, team, sites, links) with SITE_PASSWORD
  2. reads the Patients table from Airtable with AIRTABLE_TOKEN (read-only)
  3. keeps only the fields the hub shows (no e-mail addresses)
  4. assembles one HTML page and encrypts it with SITE_PASSWORD (StatiCrypt)
  5. writes _site/index.html, which the workflow publishes to GitHub Pages

Nothing readable is ever stored in the repository.
"""
import base64, datetime, json, os, subprocess, sys, urllib.parse, urllib.request, shutil, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
BASE = "appUIdFlPDYSWeJ2A"
TABLE = "tblj8GiDWb5NkGzlQ"
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


def need(name):
    v = os.environ.get(name, "")
    if not v:
        sys.exit(f"Missing secret {name}. Add it under Settings > Secrets and variables > Actions.")
    return v


def decrypt_content(password):
    out = subprocess.run(
        ["openssl", "enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-salt",
         "-in", str(ROOT / "content.enc"), "-pass", "env:SITE_PASSWORD"],
        capture_output=True, env={**os.environ, "SITE_PASSWORD": password})
    if out.returncode != 0:
        sys.exit("Could not decrypt content.enc: SITE_PASSWORD does not match the password the content was encrypted with.")
    return out.stdout.decode("utf-8")


def fetch_airtable(token):
    local = os.environ.get("LOCAL_RECORDS")
    if local:  # for testing without a token
        return json.load(open(local))
    records, offset = [], None
    while True:
        q = [("returnFieldsByFieldId", "true"), ("pageSize", "100")] + [("fields[]", f) for f in FIELDS]
        if offset:
            q.append(("offset", offset))
        req = urllib.request.Request(
            f"https://api.airtable.com/v0/{BASE}/{TABLE}?" + urllib.parse.urlencode(q),
            headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                page = json.load(r)
        except urllib.error.HTTPError as e:
            sys.exit(f"Airtable refused the request ({e.code}). Check that AIRTABLE_TOKEN has data.records:read on the T-REX randomisation base.")
        for rec in page.get("records", []):
            fields = {k: v for k, v in rec.get("fields", {}).items() if k in FIELDS}
            records.append({"createdTime": rec.get("createdTime"), "fields": fields})
        offset = page.get("offset")
        if not offset:
            return records


def main():
    password = need("SITE_PASSWORD")
    content = decrypt_content(password)
    records = fetch_airtable(os.environ.get("AIRTABLE_TOKEN") or (None if os.environ.get("LOCAL_RECORDS") else need("AIRTABLE_TOKEN")))
    at = {"records": records, "fetchedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()}

    tpl = (ROOT / "src" / "template.html").read_text("utf-8")
    logo = base64.b64encode((ROOT / "src" / "logo.svg").read_bytes()).decode()
    page = (tpl.replace("__LOGO__", "data:image/svg+xml;base64," + logo)
               .replace("__CONTENT__", content)
               .replace("__AIRTABLE__", "window.TREX_AT = " + json.dumps(at, ensure_ascii=False).replace("</", "<\\/") + ";")
               .replace("__APP__", (ROOT / "src" / "app.js").read_text("utf-8")))

    work = ROOT / "_build"
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir()
    (work / "index.html").write_text(page, "utf-8")
    subprocess.run(
        ["npx", "-y", "staticrypt@3", "index.html", "-p", password, "--short", "-d", "out",
         "--remember", "30",
         "--template-title", "T-REX Trial Hub",
         "--template-instructions", "Enter the password you received from the T-REX coordinating team.",
         "--template-button", "Open", "--template-placeholder", "Password",
         "--template-error", "Wrong password", "--template-remember", "Remember me on this device",
         "--template-color-primary", "#0E5E5A", "--template-color-secondary", "#F3F6F5"],
        cwd=work, check=True, stdout=subprocess.DEVNULL)
    site = ROOT / "_site"
    shutil.rmtree(site, ignore_errors=True)
    site.mkdir()
    shutil.copy(work / "out" / "index.html", site / "index.html")
    (site / "robots.txt").write_text("User-agent: *\nDisallow: /\n")
    shutil.rmtree(work, ignore_errors=True)
    print(f"Built hub with {len(records)} participants.")


if __name__ == "__main__":
    main()
