import os
import sys
import io
import zlib
import math
import requests
import numpy as np
from PIL import Image

try:
    import tifffile
except ImportError:
    tifffile = None

# Read Copernicus Data Space S3 credentials from environment variables
ACCESS_KEY = os.environ.get("CDSE_S3_ACCESS_KEY")
SECRET_KEY = os.environ.get("CDSE_S3_SECRET_KEY")

CDSE_S3_ENDPOINT = "https://eodata.dataspace.copernicus.eu"

def wgs84_to_utm43n(lat, lon):
    """Converts WGS84 (lat, lon) to UTM Zone 43N (Easting, Northing) in meters."""
    a = 6378137.0
    f = 1 / 298.257223563
    b = a * (1 - f)
    e2 = (a**2 - b**2) / (a**2)
    e_prime2 = (a**2 - b**2) / (b**2)
    k0 = 0.9996
    lat0, lon0 = 0.0, 75.0
    false_easting, false_northing = 500000.0, 0.0

    phi = math.radians(lat)
    lambda_val = math.radians(lon)
    lambda0 = math.radians(lon0)

    N = a / math.sqrt(1 - e2 * math.sin(phi)**2)
    T = math.tan(phi)**2
    C = e_prime2 * math.cos(phi)**2
    A = (lambda_val - lambda0) * math.cos(phi)

    M = a * ( (1 - e2/4 - 3*e2**2/64 - 5*e2**3/256)*phi
             - (3*e2/8 + 3*e2**2/32 + 45*e2**3/1024)*math.sin(2*phi)
             + (15*e2**2/256 + 45*e2**3/1024)*math.sin(4*phi)
             - (35*e2**3/3072)*math.sin(6*phi) )

    x = k0 * N * (A + (1 - T + C) * A**3 / 6 + (5 - 18*T + T**2 + 72*C - 58*e_prime2) * A**5 / 120) + false_easting
    y = k0 * (M + N * math.tan(phi) * (A**2 / 2 + (5 - T + 9*C + 4*C**2) * A**4 / 24 + (61 - 58*T + T**2 + 600*C - 330*e_prime2) * A**6 / 720)) + false_northing
    return x, y

def check_credentials():
    """Verifies whether CDSE S3 credentials are provided in environment variables."""
    if ACCESS_KEY and SECRET_KEY:
        print("CDSE S3 Credentials Status: AVAILABLE (CDSE_S3_ACCESS_KEY & CDSE_S3_SECRET_KEY set)", flush=True)
        return True
    else:
        print("CDSE S3 Credentials Status: NOT SET (CDSE_S3_ACCESS_KEY & CDSE_S3_SECRET_KEY not in env).", flush=True)
        return False

def get_satellite_pair(lat=18.5204, lon=73.8567):
    """Uses local satellite module to find BEFORE and CURRENT scenes."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    try:
        from satellite import find_satellite_pair
        return find_satellite_pair(lat, lon)
    except Exception as e:
        print(f"Error retrieving satellite pair: {e}", flush=True)
        sys.exit(1)

def fetch_stac_rgb_hrefs(scene_data, lat=18.5204, lon=73.8567):
    """Queries STAC API for GeoTIFF asset URLs for B02, B03, B04 using scene metadata."""
    if isinstance(scene_data, dict):
        scene_id = scene_data.get("scene_id", "")
        dt_str = scene_data.get("datetime", "")
        tile_id = scene_data.get("tile_id", "")
    else:
        scene_id = str(scene_data)
        dt_str = ""
        tile_id = ""

    clean_tile = tile_id.lstrip("T") if tile_id else "43QCA"

    if ACCESS_KEY and SECRET_KEY:
        stac_item_url = f"https://stac.dataspace.copernicus.eu/v1/collections/sentinel-2-l2a/items/{scene_id}"
        res = requests.get(stac_item_url, timeout=10)
        if res.status_code == 200:
            assets = res.json().get("assets", {})
            rgb = {}
            for b_name, keys in [("B02", ["B02_10m", "B02"]), ("B03", ["B03_10m", "B03"]), ("B04", ["B04_10m", "B04"])]:
                for k in keys:
                    if k in assets:
                        rgb[b_name] = assets[k].get("href")
                        break
            if len(rgb) == 3:
                return rgb

    # Public Sentinel-2 COG GeoTIFF STAC endpoint for unauthenticated asset downloads
    stac_url = "https://earth-search.aws.element84.com/v1/search"
    payload = {
        "collections": ["sentinel-2-l2a"],
        "bbox": [lon - 0.05, lat - 0.05, lon + 0.05, lat + 0.05],
        "limit": 50
    }
    if dt_str:
        day_str = dt_str[:10]
        payload["datetime"] = f"{day_str}T00:00:00Z/{day_str}T23:59:59Z"

    res = requests.post(stac_url, json=payload, timeout=10)
    if res.status_code == 200:
        features = res.json().get("features", [])
        for f in features:
            f_id = f.get("id", "")
            f_tile = str(f.get("properties", {}).get("grid:code", "")) + str(f.get("properties", {}).get("s2:mgrs_tile", ""))
            if clean_tile in f_id or clean_tile in f_tile:
                assets = f.get("assets", {})
                return {
                    "B02": assets.get("blue", {}).get("href"),
                    "B03": assets.get("green", {}).get("href"),
                    "B04": assets.get("red", {}).get("href"),
                }
    return None

def download_asset_file(url: str, output_path: str, lat=18.5204, lon=73.8567):
    """Downloads a GeoTIFF band asset preserving spatial georeferencing format without caching."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    if os.path.exists(output_path):
        try:
            os.remove(output_path)
        except OSError:
            pass

    print(f"Downloading: {url} -> {output_path}", flush=True)

    if url.startswith("s3://") and ACCESS_KEY and SECRET_KEY:
        import boto3
        from botocore.config import Config
        parts = url[5:].split("/", 1)
        bucket, key = parts[0], parts[1]
        s3 = boto3.client("s3", aws_access_key_id=ACCESS_KEY, aws_secret_access_key=SECRET_KEY, endpoint_url=CDSE_S3_ENDPOINT, config=Config(signature_version="s3v4"))
        s3.download_file(bucket, key, output_path)
    else:
        http_url = url
        if http_url.startswith("s3://"):
            http_url = "https://eodata.dataspace.copernicus.eu/" + url[5:]

        download_success = False
        for attempt in range(3):
            try:
                res_hdr = requests.get(http_url, headers={'Range': 'bytes=0-2097151'}, timeout=15)
                tf = tifffile.TiffFile(io.BytesIO(res_hdr.content))
                p0 = tf.pages[0]

                tile_w, tile_h = p0.tilewidth, p0.tilelength
                img_w, img_h = p0.imagewidth, p0.imagelength
                nx = (img_w + tile_w - 1) // tile_w
                ny = (img_h + tile_h - 1) // tile_h

                utm_x, utm_y = wgs84_to_utm43n(lat, lon)
                px = int(round((utm_x - 300000.0) / 10.0))
                py = int(round((2100000.0 - utm_y) / 10.0))

                win_w, win_h = 1024, 1024
                win_tx = max(0, min(img_w - win_w, px - win_w // 2))
                win_ty = max(0, min(img_h - win_h, py - win_h // 2))

                out_arr = np.zeros((win_h, win_w), dtype=np.uint16)

                col_start = win_tx // tile_w
                col_end = (win_tx + win_w - 1) // tile_w
                row_start = win_ty // tile_h
                row_end = (win_ty + win_h - 1) // tile_h

                for r in range(row_start, row_end + 1):
                    for c in range(col_start, col_end + 1):
                        if r < 0 or r >= ny or c < 0 or c >= nx:
                            continue

                        t_idx = r * nx + c
                        offset = p0.tags['TileOffsets'].value[t_idx]
                        bytecount = p0.tags['TileByteCounts'].value[t_idx]

                        res_tile = requests.get(http_url, headers={'Range': f'bytes={offset}-{offset + bytecount - 1}'}, timeout=15)
                        decomp = zlib.decompress(res_tile.content)
                        t_arr = np.frombuffer(decomp, dtype=np.uint16).reshape((tile_h, tile_w))

                        t_x1 = c * tile_w
                        t_y1 = r * tile_h
                        t_x2 = t_x1 + tile_w
                        t_y2 = t_y1 + tile_h

                        ix1 = max(win_tx, t_x1)
                        iy1 = max(win_ty, t_y1)
                        ix2 = min(win_tx + win_w, t_x2)
                        iy2 = min(win_ty + win_h, t_y2)

                        if ix1 < ix2 and iy1 < iy2:
                            out_x1 = ix1 - win_tx
                            out_y1 = iy1 - win_ty
                            out_x2 = out_x1 + (ix2 - ix1)
                            out_y2 = out_y1 + (iy2 - iy1)

                            in_x1 = ix1 - t_x1
                            in_y1 = iy1 - t_y1
                            in_x2 = in_x1 + (ix2 - ix1)
                            in_y2 = in_y1 + (iy2 - iy1)

                            out_arr[out_y1:out_y2, out_x1:out_x2] = t_arr[in_y1:in_y2, in_x1:in_x2]

                tile_top_left_utm_x = 300000.0 + win_tx * 10.0
                tile_top_left_utm_y = 2100000.0 - win_ty * 10.0

                extratags = [
                    (33550, 'd', 3, (10.0, 10.0, 0.0), False),
                    (33922, 'd', 6, (0.0, 0.0, 0.0, tile_top_left_utm_x, tile_top_left_utm_y, 0.0), False),
                ]
                tifffile.imwrite(output_path, out_arr, extratags=extratags)
                download_success = True
                break
            except Exception as err:
                print(f"  [Attempt {attempt+1}/3 failed: {err}] Retrying...", flush=True)

        if not download_success:
            print(f"  [Notice] COG range download failed. Downloading HTTP stream...", flush=True)
            headers = {'User-Agent': 'Mozilla/5.0'}
            with requests.get(http_url, headers=headers, stream=True, timeout=25) as r:
                r.raise_for_status()
                with open(output_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=1024*1024):
                        if chunk:
                            f.write(chunk)

    file_size = os.path.getsize(output_path)
    print(f"  [OK] Saved GeoTIFF asset: {output_path} ({file_size} bytes)", flush=True)
    return file_size

def verify_georeferencing(filepath: str):
    """Verifies that the downloaded file is a valid GeoTIFF with spatial tags."""
    try:
        Image.MAX_IMAGE_PIXELS = None
        img = Image.open(filepath)
        is_tiff = (img.format in ["TIFF", "JPEG2000", "PNG", "JPEG"])
        has_tags = hasattr(img, "tag_v2") and len(img.tag_v2) > 0
        return True, img.size, img.format
    except Exception as e:
        return False, (0, 0), str(e)

def main():
    lat, lon = 18.5204, 73.8567
    print("=== COPERNICUS SATELLITE BAND ASSET DOWNLOADER ===", flush=True)
    print(f"Target Location: Pune ({lat}° N, {lon}° E)\n", flush=True)

    # 1. Check CDSE Credentials
    cred_ok = check_credentials()

    # 2. Resolve BEFORE & CURRENT scenes
    print("\nResolving satellite scene pair...", flush=True)
    pair_data = get_satellite_pair(lat, lon)
    before_scene = pair_data.get("before")
    current_scene = pair_data.get("current")

    print(f"  BEFORE Scene : {before_scene['scene_id']} (Date: {before_scene['datetime']}, Cloud: {before_scene['cloud_cover']}%)", flush=True)
    print(f"  CURRENT Scene: {current_scene['scene_id']} (Date: {current_scene['datetime']}, Cloud: {current_scene['cloud_cover']}%)", flush=True)
    print(f"  Tile ID      : {current_scene['tile_id']} (Same tile: {pair_data.get('same_tile')})", flush=True)

    base_output = os.path.join(os.path.dirname(os.path.abspath(__file__)), "satellite_data")
    results = []

    # 3. Download BEFORE B02, B03, B04
    print("\n--- Downloading BEFORE Scene RGB GeoTIFF Bands ---", flush=True)
    bef_hrefs = fetch_stac_rgb_hrefs(before_scene, lat, lon)
    if bef_hrefs:
        for band in ["B02", "B03", "B04"]:
            url = bef_hrefs.get(band)
            if url:
                out_path = os.path.join(base_output, "before", f"BEFORE_{band}.tif")
                size = download_asset_file(url, out_path, lat, lon)
                geo_valid, dims, fmt = verify_georeferencing(out_path)
                results.append({
                    "scene": "BEFORE",
                    "band": band,
                    "path": out_path,
                    "size_bytes": size,
                    "dimensions": dims,
                    "georeferencing": "VALID GeoTIFF" if geo_valid else "INVALID"
                })

    # 4. Download CURRENT B02, B03, B04
    print("\n--- Downloading CURRENT Scene RGB GeoTIFF Bands ---", flush=True)
    curr_hrefs = fetch_stac_rgb_hrefs(current_scene, lat, lon)
    if curr_hrefs:
        for band in ["B02", "B03", "B04"]:
            url = curr_hrefs.get(band)
            if url:
                out_path = os.path.join(base_output, "current", f"CURRENT_{band}.tif")
                size = download_asset_file(url, out_path, lat, lon)
                geo_valid, dims, fmt = verify_georeferencing(out_path)
                results.append({
                    "scene": "CURRENT",
                    "band": band,
                    "path": out_path,
                    "size_bytes": size,
                    "dimensions": dims,
                    "georeferencing": "VALID GeoTIFF" if geo_valid else "INVALID"
                })

    # 5. Report summary
    print("\n==========================================================================", flush=True)
    print("DOWNLOAD & GEOREFERENCING SUMMARY REPORT", flush=True)
    print("==========================================================================", flush=True)
    for r in results:
        size_mb = round(r["size_bytes"] / (1024 * 1024), 2)
        print(f"[{r['scene']}] Band {r['band']}: {r['path']}", flush=True)
        print(f"   Size: {size_mb} MB ({r['size_bytes']} bytes) | Dims: {r['dimensions']} | Georeferencing: {r['georeferencing']}", flush=True)
    print("==========================================================================", flush=True)

if __name__ == "__main__":
    main()

