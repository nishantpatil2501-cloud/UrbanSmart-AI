import sys
import re

with open('ml/api.py', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''        pred_mask_np = np.array(mask_pil)
        
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
                    
        base64_encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return {"mask_base64": f"data:image/png;base64,{base64_encoded}", "boxes": boxes}'''

# Replace from pred_mask_np to return {...}
content = re.sub(r'        pred_mask_np = np\.array\(mask_pil\).*?return \{"mask_base64": f"data:image/png;base64,\{base64_encoded\}", "boxes": boxes\}', replacement, content, flags=re.DOTALL)

with open('ml/api.py', 'w', encoding='utf-8') as f:
    f.write(content)
