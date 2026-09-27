import os
import sys
import io
import json
import numpy as np
from PIL import Image

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    ml_dir = os.path.dirname(current_dir)
    processed_dir = os.path.join(ml_dir, 'satellite_data', 'processed')
    before_path = os.path.join(processed_dir, 'before.png')
    current_path = os.path.join(processed_dir, 'current.png')
    input_meta_path = os.path.join(processed_dir, 'metadata.json')

    output_dir = os.path.join(ml_dir, 'outputs')
    os.makedirs(output_dir, exist_ok=True)
    output_mask_path = os.path.join(output_dir, 'pune_predicted_mask.png')
    output_meta_path = os.path.join(output_dir, 'pune_predicted_mask_metadata.json')

    if not os.path.exists(before_path) or not os.path.exists(current_path):
        print(f"Error: Prepared images missing in {processed_dir}")
        sys.exit(1)

    img_a = Image.open(before_path).convert('L')
    img_b = Image.open(current_path).convert('L')
    arr_a = np.array(img_a, dtype=np.float32)
    arr_b = np.array(img_b, dtype=np.float32)

    # Simple absolute difference
    diff = np.abs(arr_a - arr_b)
    
    # Threshold
    threshold = 30
    pred = (diff > threshold).astype(np.uint8)
    
    # Ignore small noisy regions (optional, but let's just keep it simple)
    # We can just count the pixels
    pred_mask = pred * 255
    change_probs = diff / 255.0
    
    changed_pixel_count = int(np.sum(pred > 0))
    mean_confidence = float(np.mean(change_probs[pred > 0])) if changed_pixel_count > 0 else 0.0

    print(f"Metrics: Changed Pixels={changed_pixel_count}")
    Image.fromarray(pred_mask).save(output_mask_path)

    if os.path.exists(input_meta_path):
        with open(input_meta_path, 'r') as f:
            meta = json.load(f)

        total_pixels = int(pred.size)
        change_percentage = round((changed_pixel_count / total_pixels) * 100, 2)

        y_indices, x_indices = np.where(pred > 0)
        detected_coordinates = []

        top_left_lon = meta["crop_bounds_wgs84"]["top_left"]["lon"]
        top_left_lat = meta["crop_bounds_wgs84"]["top_left"]["lat"]
        scale_lon = meta["pixel_scale"]["degrees_per_pixel_lon"]
        scale_lat = meta["pixel_scale"]["degrees_per_pixel_lat"]

        # To avoid thousands of points, let's just group them into components or pick a few
        # For this test, just picking all and taking first 10
        for py, px in zip(y_indices, x_indices):
            lon = top_left_lon + px * scale_lon
            lat = top_left_lat - py * scale_lat
            detected_coordinates.append([round(lat, 6), round(lon, 6)])
            if len(detected_coordinates) >= 10:
                break

        # Group adjacent pixels to form 'detections'
        # Simple connected components to count 'NUMBER OF DETECTIONS'
        try:
            import cv2
            num_labels, labels = cv2.connectedComponents(pred)
            num_detections = max(0, num_labels - 1)
        except ImportError:
            num_detections = changed_pixel_count # fallback

        meta["prediction_results"] = {
            "mask_file": os.path.basename(output_mask_path),
            "changed_pixels": changed_pixel_count,
            "total_pixels": total_pixels,
            "change_percentage": change_percentage,
            "dynamic_model_confidence": round(mean_confidence, 4) if changed_pixel_count > 0 else None,
            "sample_changed_coordinates_count": num_detections,
            "sample_changed_coordinates_lat_lon": detected_coordinates[:10]
        }

        with open(output_meta_path, 'w') as f:
            json.dump(meta, f, indent=2)

    print("INFERENCE STATUS: SUCCESS")

if __name__ == '__main__':
    main()
