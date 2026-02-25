#!/usr/bin/env python3
import os, sys, subprocess, json, time, shutil, hashlib, csv
from datetime import datetime
from dateutil import parser as dateparser

BASE = os.path.abspath(os.path.dirname(__file__))
EXPORTS = os.path.join(BASE, "exports")
os.makedirs(EXPORTS, exist_ok=True)

RECENT_MEDIA_LIMIT = 50
MEDIA_DIRS = ["/sdcard/DCIM/Camera", "/sdcard/DCIM"]
APP_EXAMPLE_PACKAGES = ["com.whatsapp", "com.instagram.android", "com.android.chrome"]

def run(cmd, timeout=120):
    """Run command with proper encoding handling for Windows"""
    try:
        # Run with binary output first, then decode safely
        p = subprocess.run(cmd, capture_output=True, timeout=timeout)
        
        # Safely decode stdout and stderr
        stdout = ""
        stderr = ""
        
        if p.stdout:
            try:
                stdout = p.stdout.decode('utf-8', errors='replace')
            except UnicodeDecodeError:
                try:
                    stdout = p.stdout.decode('cp1252', errors='replace')
                except UnicodeDecodeError:
                    stdout = p.stdout.decode('latin-1', errors='replace')
        
        if p.stderr:
            try:
                stderr = p.stderr.decode('utf-8', errors='replace')
            except UnicodeDecodeError:
                try:
                    stderr = p.stderr.decode('cp1252', errors='replace')
                except UnicodeDecodeError:
                    stderr = p.stderr.decode('latin-1', errors='replace')
        
        return p.returncode, stdout, stderr
        
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"
    except Exception as e:
        return -1, "", f"Command failed: {str(e)}"

def require_adb():
    rc, out, err = run(["adb","devices"])
    if rc != 0:
        print("adb not working:", (err or "Unknown error").strip())
        sys.exit(1)
    
    if not out:
        print("No adb output received")
        sys.exit(1)
        
    lines = out.splitlines()
    if len(lines) < 2 or all(l.strip()=="" for l in lines[1:]):
        print("No adb devices found. Run `adb devices` and authorize phone.")
        sys.exit(1)
    for l in lines[1:]:
        if l.strip().endswith("\tdevice"):
            print("Device connected:", l.strip())
            return
    print("No authorized device. Accept RSA on phone and re-run `adb devices`.")
    sys.exit(1)

def check_adb_connection():
    """Check ADB connection without exiting - for use in API"""
    try:
        rc, out, err = run(["adb","devices"])
        if rc != 0:
            return False, f"adb not working: {(err or 'Unknown error').strip()}"
        
        if not out:
            return False, "No adb output received"
            
        lines = out.splitlines()
        if len(lines) < 2 or all(l.strip()=="" for l in lines[1:]):
            return False, "No adb devices found. Run `adb devices` and authorize phone."
            
        for l in lines[1:]:
            if l.strip().endswith("\tdevice"):
                return True, f"Device connected: {l.strip()}"
                
        return False, "No authorized device. Accept RSA on phone and re-run `adb devices`."
    except Exception as e:
        return False, f"ADB check failed: {str(e)}"

def make_export_dir(label="case"):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    d = os.path.join(EXPORTS, f"{ts}_{label}")
    os.makedirs(d, exist_ok=True)
    return d

def save_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)

def sha256(path):
    h = hashlib.sha256()
    with open(path,"rb") as f:
        for chunk in iter(lambda: f.read(1024*1024), b""):
            h.update(chunk)
    return h.hexdigest()

def collect_getprop(outdir):
    rc, out, err = run(["adb","shell","getprop"])
    save_json(os.path.join(outdir,"getprop_raw.txt"), {"stdout": out or "", "stderr": err or ""})
    d = {}
    if out:
        for line in out.splitlines():
            if "]:" in line:
                try:
                    left,right = line.split("]:",1)
                    key = left.lstrip("[").strip()
                    val = right.strip().lstrip("[").rstrip("]").strip()
                    d[key]=val
                except:
                    continue
    save_json(os.path.join(outdir,"device_info.json"), d)
    return d

def collect_packages(outdir):
    rc,out,err = run(["adb","shell","pm","list","packages","-f"])
    save_json(os.path.join(outdir,"packages_raw.txt"), {"stdout": out or ""})
    pkgs = []
    if out:
        for line in out.splitlines():
            if line.startswith("package:"):
                try:
                    left = line[len("package:"):].strip()
                    path, pkg = left.rsplit("=",1)
                    pkgs.append({"package":pkg, "apk_path":path})
                except:
                    pkgs.append({"raw":line})
    save_json(os.path.join(outdir,"packages.json"), pkgs)
    return pkgs

def collect_bugreport(outdir):
    path = os.path.join(outdir,"bugreport.zip")
    print("Collecting bugreport (may take 30s-2min)...")
    rc,out,err = run(["adb","bugreport", path], timeout=300)
    if rc == 0 and os.path.exists(path):
        print("bugreport saved:", path)
        return path
    else:
        rc,out,err = run(["adb","bugreport"], timeout=300)
        fallback = os.path.join(outdir,"bugreport_raw.txt")
        with open(fallback,"w",encoding="utf-8") as f:
            f.write(out or "")
            f.write("\n\nERR:\n"+(err or ""))
        return fallback

def collect_logcat(outdir):
    rc,out,err = run(["adb","logcat","-d"])
    p = os.path.join(outdir,"logcat.txt")
    with open(p,"w",encoding="utf-8") as f:
        f.write(out or "")
        if err:
            f.write("\n\nERR:\n"+err)
    return p

def try_content_query(uri, outdir, name):
    rc,out,err = run(["adb","shell","content","query","--uri",uri])
    p = os.path.join(outdir, f"{name}_raw.txt")
    with open(p,"w",encoding="utf-8") as f:
        if out:
            f.write(out)
        if err:
            f.write("\n\nERR:\n"+err)
    rows = []
    if out:
        for line in out.splitlines():
            if line.strip().startswith("Row:"):
                data = {}
                try:
                    after = line.split(" ",2)[2]
                except:
                    after = line
                import re
                for m in re.finditer(r"(\w+)=([^\s].*?)(?=\s\w+=|$)", after):
                    k,v = m.group(1), m.group(2)
                    # Remove trailing comma if present
                    if v.endswith(','):
                        v = v[:-1]
                    data[k]=v
                rows.append(data)
    if rows:
        save_json(os.path.join(outdir, f"{name}.json"), rows)
    return p, rows

def list_and_pull_recent_media(outdir, limit=RECENT_MEDIA_LIMIT):
    pulled = []
    listfile = os.path.join(outdir,"media_list.txt")
    with open(listfile,"w",encoding="utf-8") as lf:
        for d in MEDIA_DIRS:
            rc,out,err = run(["adb","shell","ls","-t", d], timeout=30)
            if rc==0 and out and out.strip():
                lf.write(f"=== {d} ===\n")
                lines = [l for l in out.splitlines() if l.strip()]
                for i,fn in enumerate(lines[:limit]):
                    lf.write(fn+"\n")
                    # Use forward slashes for Android paths
                    remote = f"{d}/{fn}"
                    local_dir = os.path.join(outdir, "media")
                    os.makedirs(local_dir, exist_ok=True)
                    local_path = os.path.join(local_dir, fn)
                    rc2,o2,e2 = run(["adb","pull", remote, local_path], timeout=60)
                    if rc2==0 and os.path.exists(local_path):
                        pulled.append(local_path)
                if lines:
                    break
            else:
                lf.write(f"ls failed for {d}: rc={rc} err={err}\n")
    return pulled, listfile

def pull_app_external(pkg, outdir):
    remote = f"/sdcard/Android/data/{pkg}"
    outsub = os.path.join(outdir, "appdata", pkg.replace(".","_"))
    os.makedirs(outsub, exist_ok=True)
    rc,out,err = run(["adb","shell","ls", remote], timeout=20)
    if rc != 0:
        return {"ok": False, "reason": err or out}
    rc2,o2,e2 = run(["adb","pull", remote, outsub], timeout=300)
    if rc2==0:
        stats = walk_manifest(outsub)
        return {"ok": True, "dir": outsub, "stats": stats}
    return {"ok": False, "reason": e2 or o2}

def walk_manifest(root):
    total_files=0
    total_bytes=0
    for dirpath,_,files in os.walk(root):
        for f in files:
            p = os.path.join(dirpath,f)
            try:
                total_files+=1
                total_bytes+=os.path.getsize(p)
            except:
                pass
    return {"files": total_files, "bytes": total_bytes}

def make_index_html(outdir, summary):
    idx = os.path.join(outdir,"index.html")
    with open(idx,"w",encoding="utf-8") as f:
        f.write("<!doctype html><html><head><meta charset='utf-8'><title>Forensic Export</title>")
        f.write("<link href='https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css' rel='stylesheet'>")
        f.write("</head><body class='p-3'><div class='container'>")
        f.write("<h2>Forensic Export</h2>")
        f.write(f"<p>Export created: {summary['created']}</p>")
        f.write("<h4>Device Info</h4><pre>"+json.dumps(summary.get("device_info",{}), indent=2)+"</pre>")
        f.write("<h4>Artifacts</h4><ul>")
        for k,v in summary.get("artifacts",[]):
            f.write(f"<li>{k}: {v}</li>")
        f.write("</ul>")
        f.write("<h4>Downloads</h4><ul>")
        for fpath in summary.get("files",[]):
            rel = os.path.relpath(fpath, outdir)
            f.write(f"<li><a href='./{rel}' download>{rel}</a></li>")
        f.write("</ul></div></body></html>")
    return idx

def zip_and_hash(dirpath):
    base = os.path.abspath(dirpath)
    zipname = shutil.make_archive(base, 'zip', base)
    h = sha256(zipname)
    return zipname, h

def main():
    print("Quick ADB Forensic Collector")
    require_adb()
    outdir = make_export_dir("case")
    created = datetime.now().isoformat()
    summary = {"created": created, "artifacts": [], "files": []}

    device_info = collect_getprop(outdir)
    summary["device_info"] = device_info
    summary["artifacts"].append(("device_info.json","device metadata"))

    pkgs = collect_packages(outdir)
    summary["artifacts"].append(("packages.json", f"{len(pkgs)} packages"))

    br = collect_bugreport(outdir)
    summary["artifacts"].append((os.path.basename(br), "bugreport"))

    lc = collect_logcat(outdir)
    summary["artifacts"].append(("logcat.txt","logcat (d)"))

    for uri,name in [("content://sms", "sms"), ("content://call_log/calls","call_log"), ("content://contacts/phones","contacts")]:
        print("Querying", uri)
        p, rows = try_content_query(uri, outdir, name)
        if rows:
            summary["artifacts"].append((f"{name}.json", f"{len(rows)} rows from {name}"))
        else:
            summary["artifacts"].append((os.path.basename(p), f"raw output (may contain permission error)"))

    pulled, listfile = list_and_pull_recent_media(outdir, limit=RECENT_MEDIA_LIMIT)
    summary["artifacts"].append((os.path.relpath(listfile, outdir), f"{len(pulled)} media pulled"))
    summary["files"].extend(pulled)

    app_results = {}
    for pkg in APP_EXAMPLE_PACKAGES:
        print("Trying app external data for", pkg)
        res = pull_app_external(pkg, outdir)
        app_results[pkg]=res
        if res.get("ok"):
            summary["artifacts"].append((os.path.relpath(res["dir"], outdir), f"app external data {pkg}"))
        else:
            summary["artifacts"].append((pkg, f"no external data or pull failed: {res.get('reason')}"))

    manifest = []
    for dirpath,_,files in os.walk(outdir):
        for fname in files:
            p = os.path.join(dirpath,fname)
            manifest.append({"path": os.path.relpath(p,outdir), "size": os.path.getsize(p)})
            summary["files"].append(p)
    save_json(os.path.join(outdir,"manifest.json"), manifest)

    idx = make_index_html(outdir, summary)
    summary["artifacts"].append((os.path.basename(idx),"summary html"))
    summary["files"].append(idx)

    zipf, h = zip_and_hash(outdir)
    print("Exported:", outdir)
    print("ZIP:", zipf)
    print("SHA256:", h)
    print("Open the index file to review:", idx)

if __name__=="__main__":
    main()
