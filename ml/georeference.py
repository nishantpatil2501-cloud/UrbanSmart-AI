import os
import sys
import json
import numpy as np
from PIL import Image
from scipy import ndimage

def load_mask_and_metadata(mask_path, meta_path):
    if not os.path.exists(mask_path):
        raise FileNotFoundError(f"Mask file not found at: {mask_path}")
    if not os.path.exists(meta_path):
        raise FileNotFoundError(f"Metadata file not found at: {meta_path}")

    img_mask = Image.open(mask_path).convert('L')
    mask_arr = np.array(img_mask) > 128  # boolean mask for change regions

    with open(meta_path, 'r') as f:
        meta = json.load(f)

    return mask_arr, meta

def trace_region_polygon(ys, xs):
    """
    Extracts outer boundary points for a connected pixel cluster and returns clockwise ordered (x, y) ring.
    """
    coords = set(zip(xs, ys))
    boundary = []
    
    for x, y in coords:
        # A pixel is on the perimeter if any of its 4 orthogonal neighbors is not in the region
        if ((x-1, y) not in coords or 
            (x+1, y) not in coords or 
            (x, y-1) not in coords or 
            (x, y+1) not in coords):
            boundary.append((x, y))

    if not boundary:
        min_x, max_x = np.min(xs), np.max(xs)
        min_y, max_y = np.min(ys), np.max(ys)
        boundary = [(min_x, min_y), (max_x, min_y), (max_x, max_y), (min_x, max_y)]

    # Sort boundary points angularly around centroid to form a clean polygon ring
    cx = float(np.mean(xs))
    cy = float(np.mean(ys))
    boundary.sort(key=lambda p: np.arctan2(p[1] - cy, p[0] - cx))

    # Ensure ring is closed
    if boundary[0] != boundary[-1]:
        boundary.append(boundary[0])

    return boundary

def convert_pixel_to_wgs84(px, py, top_left_lon, top_left_lat, scale_lon, scale_lat):
    """Transforms a pixel coordinate (px, py) to WGS84 [lon, lat] using the stored transform."""
    lon = top_left_lon + px * scale_lon
    lat = top_left_lat - py * scale_lat
    return [round(lon, 6), round(lat, 6)]

def georeference_detections():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, 'outputs')
    
    mask_path = os.path.join(output_dir, 'pune_predicted_mask.png')
    meta_path = os.path.join(output_dir, 'pune_predicted_mask_metadata.json')
    geojson_out_path = os.path.join(output_dir, 'pune_detections.geojson')

    print("=== SATELLITE CHANGE DETECTION GEOREFERENCING ===")
    print(f"Reading Mask    : {mask_path}")
    print(f"Reading Metadata: {meta_path}")

    mask_arr, meta = load_mask_and_metadata(mask_path, meta_path)

    # Extract transformation metadata from JSON
    crop_bounds = meta.get("crop_bounds_wgs84", {})
    top_left = crop_bounds.get("top_left", {})
    top_left_lon = top_left.get("lon", 73.1003)
    top_left_lat = top_left.get("lat", 18.9905)

    pixel_scale = meta.get("pixel_scale", {})
    scale_lon = pixel_scale.get("degrees_per_pixel_lon", 0.000095324)
    scale_lat = pixel_scale.get("degrees_per_pixel_lat", 0.000089789)
    crs_name = meta.get("crs", "EPSG:32643 (UTM Zone 43N) / EPSG:4326 (WGS84)")

    # Read dynamic model confidence from prediction metadata
    pred_res = meta.get("prediction_results", {})
    dynamic_conf = pred_res.get("dynamic_model_confidence", None)

    # Label connected components in predicted change mask
    labeled_mask, num_features = ndimage.label(mask_arr)
    print(f"\nConnected change regions detected: {num_features}")

    features = []
    # Sentinel-2 10m resolution ground pixel area = 10m * 10m = 100 sqm per pixel
    SQM_PER_PIXEL = 100.0

    for region_id in range(1, num_features + 1):
        ys, xs = np.where(labeled_mask == region_id)
        pixel_area = int(len(ys))
        
        if pixel_area < 3:
            continue  # Ignore small noise artifacts

        # Calculate centroid in pixel space
        cx_px = float(np.mean(xs))
        cy_px = float(np.mean(ys))

        # Convert centroid to WGS84 (lat, lon) using stored CRS transform
        centroid_geo = convert_pixel_to_wgs84(cx_px, cy_px, top_left_lon, top_left_lat, scale_lon, scale_lat)
        centroid_lon, centroid_lat = centroid_geo[0], centroid_geo[1]

        # Trace polygon ring in pixel space and convert to WGS84 coordinates [lon, lat]
        boundary_px = trace_region_polygon(ys, xs)
        polygon_coords = [
            convert_pixel_to_wgs84(px, py, top_left_lon, top_left_lat, scale_lon, scale_lat)
            for px, py in boundary_px
        ]

        # Calculate estimated ground area in square meters
        ground_area_sqm = round(pixel_area * SQM_PER_PIXEL, 2)

        # Build GeoJSON feature
        feature = {
            "type": "Feature",
            "id": region_id,
            "geometry": {
                "type": "Polygon",
                "coordinates": [polygon_coords]
            },
            "properties": {
                "region_id": region_id,
                "latitude": centroid_lat,
                "longitude": centroid_lon,
                "pixel_area": pixel_area,
                "estimated_ground_area_sqm": ground_area_sqm,
                "risk_level": "HIGH" if ground_area_sqm > 50000 else "MEDIUM",
                "detection_confidence": dynamic_conf
            }
        }
        features.append(feature)

    # Build GeoJSON FeatureCollection
    geojson_data = {
        "type": "FeatureCollection",
        "crs": {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        },
        "features": features
    }

    # Save to pune_detections.geojson
    with open(geojson_out_path, 'w') as f:
        json.dump(geojson_data, f, indent=2)

    print("\n" + "=" * 65)
    print("GEOJSON EXPORT SUCCESSFUL!")
    print(f"Total GeoJSON Features : {len(features)}")
    print(f"Output File Path       : {geojson_out_path}")
    print("=" * 65)

    if features:
        sample_feat = features[0]
        print("\nSample GeoJSON Feature Properties:")
        print(json.dumps(sample_feat["properties"], indent=2))

if __name__ == '__main__':
    georeference_detections()
