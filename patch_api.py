import sys
import re

with open('ml/api.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add base64 and cv2 if not present
if 'import base64' not in content:
    content = 'import base64\n' + content
if 'import cv2' not in content:
    content = 'import cv2\n' + content

# Replace return Response with JSON return
replacement = '''        pred_mask_np = np.array(mask_pil)
        contours, _ = cv2.findContours(pred_mask_np, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        boxes = []
        for c in contours:
            x, y, w, h = cv2.boundingRect(c)
            if w >= 2 and h >= 2:
                boxes.append([int(x), int(y), int(w), int(h)])
        
        base64_encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return {"mask_base64": f"data:image/png;base64,{base64_encoded}", "boxes": boxes}'''

content = re.sub(r'return Response\(content=buffer\.getvalue\(\), media_type="image/png"\)', replacement, content)

with open('ml/api.py', 'w', encoding='utf-8') as f:
    f.write(content)
