import os
import sys
import io
import json
import torch
import numpy as np
from PIL import Image
import torchvision.transforms as transforms

# Ensure ChangeFormer models package is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
ml_dir = os.path.dirname(current_dir)
changeformer_dir = os.path.join(ml_dir, 'changeformer')

if changeformer_dir not in sys.path:
    sys.path.insert(0, changeformer_dir)

try:
    from models.ChangeFormer import ChangeFormerV6
except ImportError as e:
    print(f"Error importing ChangeFormerV6: {e}")
    sys.exit(1)

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    # Paths
    processed_dir = os.path.join(ml_dir, 'satellite_data', 'processed')
    before_path = os.path.join(processed_dir, 'before.png')
    current_path = os.path.join(processed_dir, 'current.png')
    input_meta_path = os.path.join(processed_dir, 'metadata.json')

    ckpt_path = os.path.join(ml_dir, 'models', 'ChangeFormer_LEVIR', 'best_ckpt.pt')
    output_dir = os.path.join(ml_dir, 'outputs')
    os.makedirs(output_dir, exist_ok=True)

    output_mask_path = os.path.join(output_dir, 'pune_predicted_mask.png')
    output_meta_path = os.path.join(output_dir, 'pune_predicted_mask_metadata.json')

    if not os.path.exists(before_path) or not os.path.exists(current_path):
        print(f"Error: Prepared images missing in {processed_dir}")
        sys.exit(1)

    print(f"Loading BEFORE image : {before_path}")
    print(f"Loading CURRENT image: {current_path}")

    img_a = Image.open(before_path).convert('RGB')
    img_b = Image.open(current_path).convert('RGB')

    # Standard ChangeFormer normalization
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
    ])

    tensor_a = transform(img_a).unsqueeze(0).to(device)
    tensor_b = transform(img_b).unsqueeze(0).to(device)

    # Initialize model
    print(f"Initializing ChangeFormerV6...")
    model = ChangeFormerV6(input_nc=3, output_nc=2, embed_dim=256).to(device)

    # Load weights
    print(f"Loading pretrained weights from: {ckpt_path}")
    if not os.path.exists(ckpt_path):
        print(f"Error: Checkpoint file not found at {ckpt_path}")
        sys.exit(1)

    checkpoint = torch.load(ckpt_path, map_location=device, weights_only=False)
    if isinstance(checkpoint, dict):
        if 'model_G_state_dict' in checkpoint:
            state_dict = checkpoint['model_G_state_dict']
        elif 'state_dict' in checkpoint:
            state_dict = checkpoint['state_dict']
        elif 'model' in checkpoint:
            state_dict = checkpoint['model']
        else:
            state_dict = checkpoint
    else:
        state_dict = checkpoint

    clean_state_dict = {}
    for k, v in state_dict.items():
        new_key = k[7:] if k.startswith('module.') else k
        clean_state_dict[new_key] = v

    model.load_state_dict(clean_state_dict)
    model.eval()

    # Run inference
    print("Running ChangeFormer inference on Pune satellite pair...")
    with torch.no_grad():
        outputs = model(tensor_a, tensor_b)
        output = outputs[-1] if isinstance(outputs, (list, tuple)) else outputs

        # Calculate softmax probabilities for both classes [0: no-change, 1: change]
        probs = torch.softmax(output, dim=1)
        pred = torch.argmax(output, dim=1).squeeze(0).cpu().numpy()
        pred_mask = (pred * 255).astype(np.uint8)

        change_probs = probs[0, 1].cpu().numpy()
        max_prob = float(np.max(change_probs))
        mean_prob = float(np.mean(change_probs))
        
        if np.sum(pred > 0) > 0:
            mean_confidence = float(np.mean(change_probs[pred > 0]))
        else:
            mean_confidence = 0.0
            
        print(f"Metrics: Changed Pixels={int(np.sum(pred > 0))}, Max Prob={max_prob:.4f}, Mean Prob={mean_prob:.4f}")

    # Save predicted change mask
    Image.fromarray(pred_mask).save(output_mask_path)
    print(f"Saved prediction mask to: {output_mask_path}")

    # Process and save geospatial pixel-to-coordinate metadata
    if os.path.exists(input_meta_path):
        with open(input_meta_path, 'r') as f:
            meta = json.load(f)

        # Count predicted changed pixels
        changed_pixel_count = int(np.sum(pred > 0))
        total_pixels = int(pred.size)
        change_percentage = round((changed_pixel_count / total_pixels) * 100, 2)

        # Find pixel coordinates of detected changes
        y_indices, x_indices = np.where(pred > 0)
        detected_coordinates = []

        top_left_lon = meta["crop_bounds_wgs84"]["top_left"]["lon"]
        top_left_lat = meta["crop_bounds_wgs84"]["top_left"]["lat"]
        scale_lon = meta["pixel_scale"]["degrees_per_pixel_lon"]
        scale_lat = meta["pixel_scale"]["degrees_per_pixel_lat"]

        for py, px in zip(y_indices, x_indices):
            lon = top_left_lon + px * scale_lon
            lat = top_left_lat - py * scale_lat
            detected_coordinates.append([round(lat, 6), round(lon, 6)])

        meta["prediction_results"] = {
            "mask_file": os.path.basename(output_mask_path),
            "changed_pixels": changed_pixel_count,
            "total_pixels": total_pixels,
            "change_percentage": change_percentage,
            "dynamic_model_confidence": round(mean_confidence, 4) if changed_pixel_count > 0 else None,
            "sample_changed_coordinates_count": len(detected_coordinates),
            "sample_changed_coordinates_lat_lon": detected_coordinates[:10]
        }

        with open(output_meta_path, 'w') as f:
            json.dump(meta, f, indent=2)

        print(f"Saved geospatial metadata to: {output_meta_path}")

    print("\n" + "=" * 60)
    print("INFERENCE STATUS: SUCCESS")
    print(f"Predicted Mask Output   : {output_mask_path}")
    print(f"Geospatial Metadata      : {output_meta_path}")
    print(f"Dynamic Model Confidence : {round(mean_confidence * 100, 2)}%" if changed_pixel_count > 0 else "Dynamic Model Confidence : N/A (No change detected)")
    print("=" * 60)

if __name__ == '__main__':
    main()
