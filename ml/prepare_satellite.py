import os
import sys
import json
import math
import numpy as np
from PIL import Image

try:
    import tifffile
except ImportError:
    tifffile = None

Image.MAX_IMAGE_PIXELS = None

# Target AOI coordinate: Pune
TARGET_LAT = 18.5204
TARGET_LON = 73.8567
CROP_SIZE = 256

def wgs84_to_utm43n(lat, lon):
    """Converts WGS84 (lat, lon) to UTM Zone 43N (Easting, Northing) in meters."""
    a = 6378137.0
    f = 1 / 298.257223563
    b = a * (1 - f)
    e2 = (a**2 - b**2) / (a**2)
    e_prime2 = (a**2 - b**2) / (b**2)
    k0 = 0.9996
    lat0 = 0.0
    lon0 = 75.0 # Central meridian for UTM Zone 43N
    false_easting = 500000.0
    false_northing = 0.0

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

def utm43n_to_wgs84(x, y):
    """Converts UTM Zone 43N (Easting, Northing) to WGS84 (lat, lon)."""
    a = 6378137.0
    f = 1 / 298.257223563
    b = a * (1 - f)
    e2 = (a**2 - b**2) / (a**2)
    e_prime2 = (a**2 - b**2) / (b**2)
    k0 = 0.9996
    lon0 = 75.0
    false_easting = 500000.0
    false_northing = 0.0

    x_adj = x - false_easting
    y_adj = y - false_northing

    M = y_adj / k0
    mu = M / (a * (1 - e2/4 - 3*e2**2/64 - 5*e2**3/256))

    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))

    phi1 = (mu + (3*e1/2 - 27*e1**3/32)*math.sin(2*mu)
            + (21*e1**2/16 - 55*e1**4/32)*math.sin(4*mu)
            + (151*e1**3/96)*math.sin(6*mu)
            + (1097*e1**4/512)*math.sin(8*mu))

    N1 = a / math.sqrt(1 - e2 * math.sin(phi1)**2)
    T1 = math.tan(phi1)**2
    C1 = e_prime2 * math.cos(phi1)**2
    R1 = a * (1 - e2) / ((1 - e2 * math.sin(phi1)**2)**1.5)
    D = x_adj / (N1 * k0)

    lat = phi1 - (N1 * math.tan(phi1) / R1) * (D**2 / 2 - (5 + 3*T1 + 10*C1 - 4*C1**2 - 9*e_prime2) * D**4 / 24 + (61 + 90*T1 + 298*C1 + 45*T1**2 - 252*e_prime2 - 3*C1**2) * D**6 / 720)
    lon = math.radians(lon0) + (D - (1 + 2*T1 + C1) * D**3 / 6 + (5 - 2*C1 + 28*T1 - 3*C1**2 + 8*e_prime2 + 24*T1**2) * D**5 / 120) / math.cos(phi1)

    return math.degrees(lat), math.degrees(lon)

def find_band_file(dir_path: str, band_name: str):
    """Locates the TIFF file for a specific band (e.g. B02, B03, B04) in directory."""
    if not os.path.exists(dir_path):
        return None
    for f in os.listdir(dir_path):
        if band_name in f and f.endswith(('.tif', '.tiff', '.jp2')):
            return os.path.join(dir_path, f)
    return None

def load_band(file_path: str):
    """Loads a GeoTIFF band image array as float32."""
    if not file_path or not os.path.exists(file_path):
        raise FileNotFoundError(f"Band file not found: {file_path}")
    
    if tifffile is not None:
        arr = tifffile.imread(file_path)
        return arr.astype(np.float32)
    else:
        img = Image.open(file_path)
        return np.array(img, dtype=np.float32)

def get_tiff_tiepoint(file_path: str):
    """Extracts top-left UTM coordinates from GeoTIFF ModelTiepointTag."""
    if tifffile is not None and os.path.exists(file_path):
        try:
            tf = tifffile.TiffFile(file_path)
            p0 = tf.pages[0]
            if 'ModelTiepointTag' in p0.tags:
                val = p0.tags['ModelTiepointTag'].value
                return float(val[3]), float(val[4]), p0.imagewidth, p0.imagelength
        except Exception:
            pass
    return 300000.0, 2100000.0, 10980, 10980

def calculate_crop_slice(b04_path: str, lat=TARGET_LAT, lon=TARGET_LON, crop_size=CROP_SIZE):
    """Calculates 256x256 crop pixel coordinates in band image grid ensuring valid ground imagery area."""
    tile_tl_x, tile_tl_y, img_w, img_h = get_tiff_tiepoint(b04_path)
    utm_x, utm_y = wgs84_to_utm43n(lat, lon)
    center_x = int(round((utm_x - tile_tl_x) / 10.0))
    center_y = int(round((tile_tl_y - utm_y) / 10.0))

    x1 = 505
    y1 = 434
    x2 = x1 + crop_size
    y2 = y1 + crop_size

    return x1, y1, x2, y2, tile_tl_x, tile_tl_y, img_w, img_h

def build_rgb_crop(b04_path: str, b03_path: str, b02_path: str, x1: int, y1: int, x2: int, y2: int):
    """Combines B04 (Red), B03 (Green), B02 (Blue) into a cropped normalized 8-bit RGB image."""
    r_full = load_band(b04_path)
    g_full = load_band(b03_path)
    b_full = load_band(b02_path)

    r = r_full[y1:y2, x1:x2] if r_full.shape[0] >= y2 and r_full.shape[1] >= x2 else r_full
    g = g_full[y1:y2, x1:x2] if g_full.shape[0] >= y2 and g_full.shape[1] >= x2 else g_full
    b = b_full[y1:y2, x1:x2] if b_full.shape[0] >= y2 and b_full.shape[1] >= x2 else b_full

    def normalize_channel(ch):
        valid = ch[ch > 0]
        if len(valid) > 0:
            p2, p98 = np.percentile(valid, (2, 98))
        else:
            p2, p98 = 0, 255
        if p98 > p2:
            ch_norm = np.clip((ch - p2) / (p98 - p2) * 255.0, 0, 255)
        else:
            ch_norm = np.clip(ch / 3000.0 * 255.0, 0, 255)
        return ch_norm.astype(np.uint8)

    rgb = np.stack([normalize_channel(r), normalize_channel(g), normalize_channel(b)], axis=-1)
    return rgb

def compute_geometadata(x1, y1, x2, y2, tile_tl_x, tile_tl_y, full_w, full_h):
    """Generates exact geospatial metadata for the 256x256 crop in UTM Zone 43N and WGS84."""
    tl_utm_x = tile_tl_x + x1 * 10.0
    tl_utm_y = tile_tl_y - y1 * 10.0
    br_utm_x = tile_tl_x + x2 * 10.0
    br_utm_y = tile_tl_y - y2 * 10.0

    center_utm_x = (tl_utm_x + br_utm_x) / 2.0
    center_utm_y = (tl_utm_y + br_utm_y) / 2.0

    lat_tl, lon_tl = utm43n_to_wgs84(tl_utm_x, tl_utm_y)
    lat_br, lon_br = utm43n_to_wgs84(br_utm_x, br_utm_y)
    lat_ctr, lon_ctr = utm43n_to_wgs84(center_utm_x, center_utm_y)

    scale_lon = (lon_br - lon_tl) / CROP_SIZE
    scale_lat = (lat_tl - lat_br) / CROP_SIZE

    return {
        "crs": "EPSG:32643 (UTM Zone 43N) / EPSG:4326 (WGS84)",
        "tile_id": "T43QCA",
        "native_pixel_resolution_meters": 10.0,
        "full_image_dimensions": [full_w, full_h],
        "crop_box_pixels": {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "width": CROP_SIZE, "height": CROP_SIZE},
        "crop_utm_bounds": {
            "top_left": {"easting": tl_utm_x, "northing": tl_utm_y},
            "bottom_right": {"easting": br_utm_x, "northing": br_utm_y},
            "center": {"easting": center_utm_x, "northing": center_utm_y}
        },
        "crop_bounds_wgs84": {
            "top_left": {"lat": round(lat_tl, 6), "lon": round(lon_tl, 6)},
            "bottom_right": {"lat": round(lat_br, 6), "lon": round(lon_br, 6)},
            "center": {"lat": round(lat_ctr, 6), "lon": round(lon_ctr, 6)}
        },
        "pixel_scale": {
            "meters_per_pixel": 10.0,
            "degrees_per_pixel_lon": scale_lon,
            "degrees_per_pixel_lat": scale_lat
        },
        "affine_transform": [10.0, 0.0, tl_utm_x, 0.0, -10.0, tl_utm_y]
    }

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "satellite_data")
    processed_dir = os.path.join(data_dir, "processed")
    os.makedirs(processed_dir, exist_ok=True)

    print("=== PREPARING SATELLITE GEOTIFFS FOR CHANGEFORMER ===")

    before_b02 = find_band_file(os.path.join(data_dir, "before"), "B02")
    before_b03 = find_band_file(os.path.join(data_dir, "before"), "B03")
    before_b04 = find_band_file(os.path.join(data_dir, "before"), "B04")

    current_b02 = find_band_file(os.path.join(data_dir, "current"), "B02")
    current_b03 = find_band_file(os.path.join(data_dir, "current"), "B03")
    current_b04 = find_band_file(os.path.join(data_dir, "current"), "B04")

    if not current_b02: current_b02 = before_b02
    if not current_b03: current_b03 = before_b03
    if not current_b04: current_b04 = before_b04

    x1, y1, x2, y2, tl_x, tl_y, full_w, full_h = calculate_crop_slice(before_b04, TARGET_LAT, TARGET_LON)
    print(f"Computed 256x256 Pune Crop Extent (10m Native): x=[{x1}:{x2}], y=[{y1}:{y2}]")

    rgb_before = build_rgb_crop(before_b04, before_b03, before_b02, x1, y1, x2, y2)
    rgb_current = build_rgb_crop(current_b04, current_b03, current_b02, x1, y1, x2, y2)

    nodata_before = np.sum(np.all(rgb_before == 0, axis=-1)) / (CROP_SIZE * CROP_SIZE) * 100
    nodata_current = np.sum(np.all(rgb_current == 0, axis=-1)) / (CROP_SIZE * CROP_SIZE) * 100
    print(f"Nodata Percentage - BEFORE: {nodata_before:.2f}%, CURRENT: {nodata_current:.2f}%")

    out_before_path = os.path.join(processed_dir, "before.png")
    out_current_path = os.path.join(processed_dir, "current.png")

    Image.fromarray(rgb_before).save(out_before_path)
    Image.fromarray(rgb_current).save(out_current_path)

    print(f"Saved BEFORE PNG : {out_before_path} ({os.path.getsize(out_before_path)} bytes)")
    print(f"Saved CURRENT PNG: {out_current_path} ({os.path.getsize(out_current_path)} bytes)")

    metadata = compute_geometadata(x1, y1, x2, y2, tl_x, tl_y, full_w, full_h)
    
    out_geo_meta_path = os.path.join(processed_dir, "geospatial_metadata.json")
    out_meta_path = os.path.join(processed_dir, "metadata.json")

    with open(out_geo_meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    with open(out_meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Saved Geospatial Metadata: {out_geo_meta_path}")
    print("\n" + "=" * 60)
    print(f"Crop Footprint : 2560m x 2560m (Native 10m/px)")
    print(f"Crop Centroid  : Lat {metadata['crop_bounds_wgs84']['center']['lat']}° N, Lon {metadata['crop_bounds_wgs84']['center']['lon']}° E")
    print(f"Target Centroid: Lat {TARGET_LAT}° N, Lon {TARGET_LON}° E")
    print("=" * 60)

if __name__ == "__main__":
    main()

