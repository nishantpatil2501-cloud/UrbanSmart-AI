import os
import sys
import io
import torch
import numpy as np
from PIL import Image
import torchvision.transforms as transforms
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response
from contextlib import asynccontextmanager

# Set up paths so models.ChangeFormer can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
changeformer_dir = os.path.join(current_dir, 'changeformer')
if changeformer_dir not in sys.path:
    sys.path.insert(0, changeformer_dir)

try:
    from models.ChangeFormer import ChangeFormerV6
except ImportError as e:
    print(f"Error importing ChangeFormerV6: {e}")
    sys.exit(1)

# Global model state
model = None
device = None
transform = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, device, transform
    print("=== Initializing ChangeFormer ML API ===")
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Running on device: {device}")

    ckpt_path = os.path.join(current_dir, 'models', 'ChangeFormer_LEVIR', 'best_ckpt.pt')
    if not os.path.exists(ckpt_path):
        raise FileNotFoundError(f"Pretrained checkpoint not found at: {ckpt_path}")

    print(f"Loading ChangeFormerV6 model from: {ckpt_path}")
    model = ChangeFormerV6(input_nc=3, output_nc=2, embed_dim=256).to(device)

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

    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
    ])

    print("=== ChangeFormer model successfully loaded & ready for predictions ===")
    yield
    print("=== Shutting down ChangeFormer ML API ===")

from satellite import router as satellite_router

app = FastAPI(
    title="UrbanWatch AI — ChangeFormer & Copernicus STAC API",
    description="Reusable API for satellite bi-temporal change detection and Copernicus scene search",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(satellite_router)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "model": "ChangeFormerV6",
        "device": str(device),
        "message": "Send POST request to /predict with 'before' and 'current' image files."
    }

@app.post("/predict")
async def predict(before: UploadFile = File(...), current: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=500, detail="Model is not loaded.")

    try:
        before_bytes = await before.read()
        current_bytes = await current.read()

        if not before_bytes or not current_bytes:
            raise ValueError("Empty image file received.")

        img_a = Image.open(io.BytesIO(before_bytes)).convert('RGB')
        img_b = Image.open(io.BytesIO(current_bytes)).convert('RGB')

        # Automatically resize to 256x256 if necessary
        if img_a.size != (256, 256):
            img_a = img_a.resize((256, 256))
        if img_b.size != (256, 256):
            img_b = img_b.resize((256, 256))

        tensor_a = transform(img_a).unsqueeze(0).to(device)
        tensor_b = transform(img_b).unsqueeze(0).to(device)

        with torch.no_grad():
            outputs = model(tensor_a, tensor_b)
            output = outputs[-1] if isinstance(outputs, (list, tuple)) else outputs
            pred = torch.argmax(output, dim=1).squeeze(0).cpu().numpy()
            pred_mask = (pred * 255).astype(np.uint8)

        mask_pil = Image.fromarray(pred_mask)
        buffer = io.BytesIO()
        mask_pil.save(buffer, format="PNG")
        buffer.seek(0)

        return Response(content=buffer.getvalue(), media_type="image/png")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inference error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
