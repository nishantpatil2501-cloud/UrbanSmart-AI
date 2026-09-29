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

from pydantic import BaseModel
from typing import Dict, Any, List

class GeminiViewportRequest(BaseModel):
    selected_place: str
    map_center: Dict[str, float]
    viewport_bounds: Dict[str, Dict[str, float]]
    zoom: float
    before_req_date: str
    current_req_date: str
    current_actual_date: str
    before_actual_date: str
    before_url: str = ""
    current_url: str = ""
    before_type: str = ""
    current_type: str = ""

def get_gemini_api_key():
    if "GEMINI_API_KEY" in os.environ:
        return os.environ["GEMINI_API_KEY"]
    for env_path in [".env", "../.env", os.path.join("..", ".env")]:
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


import math
from PIL import Image
import urllib.request
import io
import concurrent.futures

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)

def num2deg(xtile, ytile, zoom):
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return (lat_deg, lon_deg)

def fetch_tile(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return Image.open(io.BytesIO(resp.read())).convert('RGB')
    except:
        return Image.new('RGB', (256, 256), color=(0,0,0))

def fetch_wayback_image(url_template, sw_lat, sw_lon, ne_lat, ne_lon, zoom):
    zoom = int(zoom)
    x_min, y_max = deg2num(sw_lat, sw_lon, zoom)
    x_max, y_min = deg2num(ne_lat, ne_lon, zoom)
    
    if (x_max - x_min + 1) * (y_max - y_min + 1) > 25:
        return fetch_wayback_image(url_template, sw_lat, sw_lon, ne_lat, ne_lon, zoom - 1)
        
    width = (x_max - x_min + 1) * 256
    height = (y_max - y_min + 1) * 256
    img = Image.new('RGB', (width, height))
    
    futures = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        for x in range(x_min, x_max + 1):
            for y in range(y_min, y_max + 1):
                url = url_template.replace('{z}', str(zoom)).replace('{x}', str(x)).replace('{y}', str(y))
                futures[executor.submit(fetch_tile, url)] = (x, y)
        for future in concurrent.futures.as_completed(futures):
            x, y = futures[future]
            tile = future.result()
            img.paste(tile, ((x - x_min) * 256, (y - y_min) * 256))
            
    nw_lat, nw_lon = num2deg(x_min, y_min, zoom)
    se_lat, se_lon = num2deg(x_max + 1, y_max + 1, zoom)
    
    def lat_to_y(lat):
        return math.log(math.tan(math.pi/4 + math.radians(lat)/2))
        
    top_y = lat_to_y(nw_lat)
    bottom_y = lat_to_y(se_lat)
    target_top_y = lat_to_y(ne_lat)
    target_bottom_y = lat_to_y(sw_lat)
    
    total_y = top_y - bottom_y
    crop_top = max(0, int((top_y - target_top_y) / total_y * height))
    crop_bottom = min(height, int((top_y - target_bottom_y) / total_y * height))
    
    total_x = se_lon - nw_lon
    crop_left = max(0, int((sw_lon - nw_lon) / total_x * width))
    crop_right = min(width, int((ne_lon - nw_lon) / total_x * width))
    
    cropped = img.crop((crop_left, crop_top, crop_right, crop_bottom))
    return cropped.resize((512, 512))

def fetch_landsat_image(url_template, sw_lat, sw_lon, ne_lat, ne_lon):
    url = url_template.split('?')[0] + f"?bbox={sw_lon},{sw_lat},{ne_lon},{ne_lat}&bboxSR=4326&imageSR=4326&size=512,512&format=jpgpng&f=image"
    if 'time=' in url_template:
        time_part = [p for p in url_template.split('&') if p.startswith('time=')][0]
        url += '&' + time_part
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return Image.open(io.BytesIO(resp.read())).convert('RGB')

def image_to_base64(img):
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")

@app.post("/gemini-demo-anomalies")
async def generate_gemini_demo_anomalies(payload: GeminiViewportRequest):
    api_key = get_gemini_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured.")

    sw = payload.viewport_bounds.get('_southWest', {})
    ne = payload.viewport_bounds.get('_northEast', {})
    sw_lat, sw_lon = sw.get('lat'), sw.get('lng')
    ne_lat, ne_lon = ne.get('lat'), ne.get('lng')

    before_b64 = ""
    current_b64 = ""
    import base64

    try:
        if payload.before_type == 'wayback' and payload.before_url:
            img = fetch_wayback_image(payload.before_url, sw_lat, sw_lon, ne_lat, ne_lon, payload.zoom)
            before_b64 = image_to_base64(img)
        elif payload.before_type == 'landsat' and payload.before_url:
            img = fetch_landsat_image(payload.before_url, sw_lat, sw_lon, ne_lat, ne_lon)
            before_b64 = image_to_base64(img)
            
        if payload.current_type == 'wayback' and payload.current_url:
            img = fetch_wayback_image(payload.current_url, sw_lat, sw_lon, ne_lat, ne_lon, payload.zoom)
            current_b64 = image_to_base64(img)
        elif payload.current_type == 'landsat' and payload.current_url:
            img = fetch_landsat_image(payload.current_url, sw_lat, sw_lon, ne_lat, ne_lon)
            current_b64 = image_to_base64(img)
    except Exception as e:
        print("Image fetch error:", e)

    prompt = f"""
Compare the BEFORE image and CURRENT image of the same location.
Only mark a region when there is visible evidence of a difference between BEFORE and CURRENT. Prefer clear, visually meaningful changes over tiny image noise, shadows, vegetation fluctuations, or rendering differences.

Location: {payload.selected_place}
BEFORE Date: {payload.before_actual_date}
CURRENT Date: {payload.current_actual_date}

Generate MINIMUM 2, MAXIMUM 6 candidate anomalies. If you find fewer than 2 clear differences, you may generate highly plausible candidate areas to reach the minimum of 2.

Output strictly valid JSON exactly in this format:
{{
  "changes": [
    {{
      "type": "possible_new_structure",
      "description": "...",
      "confidence": 85.0,
      "risk": "Medium",
      "estimated_area_m2": 150,
      "bbox": {{
        "x_min": 0.1,
        "y_min": 0.1,
        "x_max": 0.2,
        "y_max": 0.2
      }}
    }}
  ]
}}
Note: 'bbox' coordinates must be normalized from 0.0 to 1.0 relative to the viewport. Do NOT invent arbitrary latitude/longitude.
"""
    import json
    import urllib.request
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={api_key}"
    
    parts = [{"text": prompt}]
    if before_b64:
        parts.append({"inline_data": {"mime_type": "image/png", "data": before_b64}})
    if current_b64:
        parts.append({"inline_data": {"mime_type": "image/png", "data": current_b64}})
        
    data = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseMimeType": "application/json"}
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status == 200:
                resp_data = json.loads(resp.read().decode())
                content = resp_data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(content)
            else:
                raise HTTPException(status_code=500, detail="Gemini API returned non-200 status.")
    except Exception as e:
        print("Gemini API Error:", e)
        raise HTTPException(status_code=503, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

