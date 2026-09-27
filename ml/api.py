import base64
import os
import sys
import io
import json
import urllib.request
import torch
import numpy as np
from PIL import Image
import torchvision.transforms as transforms
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
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

def get_openai_api_key():
    if "OPENAI_API_KEY" in os.environ:
        return os.environ["OPENAI_API_KEY"]
    for env_path in [".env", "../.env", os.path.join("..", ".env")]:
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("OPENAI_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None

def generate_descriptions_for_boxes(boxes, before_bytes, current_bytes):
    descriptions = []
    api_key = get_openai_api_key()
    
    if api_key and len(boxes) > 0:
        try:
            b_b64 = base64.b64encode(before_bytes).decode('utf-8')
            c_b64 = base64.b64encode(current_bytes).decode('utf-8')
            
            prompt = (
                f"We detected {len(boxes)} regions of change between the BEFORE and CURRENT images.\n"
                f"The bounding boxes are (xmin, ymin, width, height) at 256x256 resolution:\n"
                f"{json.dumps(boxes)}\n"
                "Please describe what appears to have changed in each region in simple words (e.g. 'possible new structure', 'land/ground-cover change', 'building footprint expansion').\n"
                "Do not claim anything is confirmed illegal. Say 'possible' or 'detected change'.\n"
                "Return a JSON object with a key 'descriptions' containing an array of strings, one for each box."
            )

            payload = {
                "model": "gpt-4o",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b_b64}"}},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{c_b64}"}}
                        ]
                    }
                ],
                "response_format": {"type": "json_object"}
            }

            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode())
                    content = json.loads(data["choices"][0]["message"]["content"])
                    ai_descs = content.get("descriptions", [])
                    if len(ai_descs) == len(boxes):
                        return ai_descs
        except Exception as e:
            print("OpenAI description generation failed:", e)
            
    # Fallback to safe geometry-based descriptions
    for i, box in enumerate(boxes):
        w, h = box[2], box[3]
        descriptions.append(f"Change Region {i+1}: Detected footprint anomaly measuring approximately {w}x{h} pixels. Possible new structure or land-cover change.")
        
    return descriptions

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

        pred_mask_np = np.array(mask_pil)
        
        import scipy.ndimage as ndimage
        labeled, num_features = ndimage.label(pred_mask_np > 0)
        boxes = []
        if num_features > 0:
            objs = ndimage.find_objects(labeled)
            for obj in objs:
                y_slice, x_slice = obj
                ymin, ymax = y_slice.start, y_slice.stop
                xmin, xmax = x_slice.start, x_slice.stop
                w = xmax - xmin
                h = ymax - ymin
                if w >= 2 and h >= 2:
                    boxes.append([int(xmin), int(ymin), int(w), int(h)])
                    
        descriptions = generate_descriptions_for_boxes(boxes, before_bytes, current_bytes)
                    
        base64_encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return {
            "mask_base64": f"data:image/png;base64,{base64_encoded}",
            "boxes": boxes,
            "descriptions": descriptions
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inference error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
