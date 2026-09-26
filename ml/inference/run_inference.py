import os
import sys
import torch
import numpy as np
from PIL import Image
import torchvision.transforms as transforms

# Set up paths so models.ChangeFormer can be imported correctly
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
    dataset_dir = os.path.join(ml_dir, 'dataset', 'LEVIR-CD256')
    ckpt_path = os.path.join(ml_dir, 'models', 'ChangeFormer_LEVIR', 'best_ckpt.pt')
    output_dir = os.path.join(ml_dir, 'outputs')
    os.makedirs(output_dir, exist_ok=True)

    # Pick a sample
    sample_name = 'train_85_9.png'
    path_a = os.path.join(dataset_dir, 'A', sample_name)
    path_b = os.path.join(dataset_dir, 'B', sample_name)

    if not os.path.exists(path_a) or not os.path.exists(path_b):
        a_dir = os.path.join(dataset_dir, 'A')
        if os.path.exists(a_dir):
            a_files = [f for f in os.listdir(a_dir) if f.endswith('.png')]
            if a_files:
                sample_name = a_files[0]
                path_a = os.path.join(dataset_dir, 'A', sample_name)
                path_b = os.path.join(dataset_dir, 'B', sample_name)

    print(f"Loading sample: {sample_name}")
    print(f"BEFORE image: {path_a}")
    print(f"CURRENT image: {path_b}")

    # Load images
    img_a = Image.open(path_a).convert('RGB')
    img_b = Image.open(path_b).convert('RGB')

    # Normalize [-1, 1] as expected by ChangeFormer
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
    ])

    tensor_a = transform(img_a).unsqueeze(0).to(device)
    tensor_b = transform(img_b).unsqueeze(0).to(device)

    # Initialize model
    print(f"Initializing ChangeFormerV6...")
    model = ChangeFormerV6(input_nc=3, output_nc=2, embed_dim=256).to(device)

    # Load pretrained checkpoint
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

    # Clean state dict keys (strip 'module.')
    clean_state_dict = {}
    for k, v in state_dict.items():
        new_key = k[7:] if k.startswith('module.') else k
        clean_state_dict[new_key] = v

    model.load_state_dict(clean_state_dict)
    model.eval()

    # Run inference
    print("Running ChangeFormer inference...")
    with torch.no_grad():
        outputs = model(tensor_a, tensor_b)
        if isinstance(outputs, (list, tuple)):
            output = outputs[-1]
        else:
            output = outputs

        # Get binary class prediction
        pred = torch.argmax(output, dim=1).squeeze(0).cpu().numpy()
        pred_mask = (pred * 255).astype(np.uint8)

    # Save output mask
    output_filename = f"predicted_mask_{sample_name}"
    output_path = os.path.join(output_dir, output_filename)
    Image.fromarray(pred_mask).save(output_path)

    print("\n" + "="*60)
    print("INFERENCE RESULT: SUCCESS")
    print(f"Sample: {sample_name}")
    print(f"Output Path: {output_path}")
    print(f"Output Mask Dimensions: {pred_mask.shape}")
    print("="*60)

if __name__ == '__main__':
    main()
