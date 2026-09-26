import os
import sys

try:
    from PIL import Image
    import matplotlib.pyplot as plt
except ImportError:
    print("Error: Pillow or matplotlib is not installed. Please install them to proceed.")
    sys.exit(1)

def main():
    base_dir = os.path.join("ml", "dataset", "LEVIR-CD256")
    dirs = {
        'A': os.path.join(base_dir, 'A'),
        'B': os.path.join(base_dir, 'B'),
        'label': os.path.join(base_dir, 'label')
    }

    print(f"Verifying dataset at: {base_dir}\n")

    # 1. Count images in A, B, and label
    files = {}
    for d_name, d_path in dirs.items():
        if os.path.exists(d_path):
            files[d_name] = set(f for f in os.listdir(d_path) if f.endswith('.png'))
            print(f"Found {len(files[d_name])} images in '{d_name}/'")
        else:
            print(f"Error: Directory {d_path} not found.")
            sys.exit(1)
            
    print()

    # 2. Check that matching filenames exist in all three
    common_files = files['A'].intersection(files['B']).intersection(files['label'])
    print(f"Matching filenames across A, B, and label: {len(common_files)}")
    
    if len(common_files) == len(files['A']) == len(files['B']) == len(files['label']):
        print("[OK] Perfect match: All filenames correspond exactly across the three directories.\n")
    else:
        print("[WARNING] Mismatch in filenames across directories.\n")

    # 3. Print image dimensions
    if not common_files:
        print("No common files found.")
        return

    sample_file = list(common_files)[0]
    
    path_a = os.path.join(dirs['A'], sample_file)
    path_b = os.path.join(dirs['B'], sample_file)
    path_label = os.path.join(dirs['label'], sample_file)
    
    img_a = Image.open(path_a)
    img_b = Image.open(path_b)
    img_label = Image.open(path_label)
    
    print(f"Sample file selected: {sample_file}")
    print(f"Dimensions - A (Before): {img_a.size}, Mode: {img_a.mode}")
    print(f"Dimensions - B (Current): {img_b.size}, Mode: {img_b.mode}")
    print(f"Dimensions - label (Change): {img_label.size}, Mode: {img_label.mode}\n")

    # 4. Display one sample
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    
    axes[0].imshow(img_a)
    axes[0].set_title("BEFORE (A)")
    axes[0].axis('off')
    
    axes[1].imshow(img_b)
    axes[1].set_title("CURRENT (B)")
    axes[1].axis('off')
    
    # Label is likely grayscale or binary
    axes[2].imshow(img_label, cmap='gray')
    axes[2].set_title("GROUND TRUTH CHANGE (label)")
    axes[2].axis('off')
    
    out_dir = os.path.join("ml", "outputs")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "dataset_sample.png")
    
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    print(f"[OK] Sample visualization saved to: {out_path}")

if __name__ == "__main__":
    main()
