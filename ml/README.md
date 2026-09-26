# ML — Satellite Change Detection Module

This directory is the backend / ML workspace for the **UrbanWatch AI** illegal-construction detection system.
It is intentionally separate from the React frontend and will be developed independently.

---

## ✅ Dataset: LEVIR-CD-256 — Downloaded & Verified

| Property | Value |
|---|---|
| **Local path** | `ml/dataset/LEVIR-CD256/` |
| **Source** | [ChangeFormer repo — Dropbox](https://www.dropbox.com/s/18fb5jo0npu5evm/LEVIR-CD256.zip?dl=1) |
| **Zip size** | 2,367.5 MB (2,482,547,714 bytes) |
| **Image resolution** | 256 × 256 px (RGB) |
| **Bands** | `A/` = pre-change image · `B/` = post-change image · `label/` = binary change mask |

### File Counts per Split

| Split | A (pre) | B (post) | label (mask) |
|---|---|---|---|
| **train** | 7,120 | 7,120 | 7,120 |
| **val** | 1,024 | 1,024 | 1,024 |
| **test** | 2,048 | 2,048 | 2,048 |
| **Total** | **10,192** | **10,192** | **10,192** |

> Total image pairs (A + B): **20,384** files across all splits.

### Folder Structure

```
ml/dataset/LEVIR-CD256/
├── A/                        ← Pre-change satellite images (256×256 RGB PNG)
│   ├── train_1_1.png
│   ├── val_1_1.png
│   └── test_1_1.png  ...
├── B/                        ← Post-change satellite images (256×256 RGB PNG)
│   └── (same naming as A/)
├── label/                    ← Binary change masks (white=changed, black=unchanged)
│   └── (same naming as A/)
└── list/                     ← Split manifests (text files)
    ├── train.txt             (7,120 lines)
    ├── val.txt               (1,024 lines)
    ├── test.txt              (2,048 lines)
    ├── trainval.txt          (8,144 lines)
    ├── train(org).txt        (7,120 lines)
    ├── 5_train_supervised.txt   (356 lines)
    ├── 10_train_supervised.txt  (712 lines)
    ├── 20_train_supervised.txt  (1,424 lines)
    ├── 50_train_supervised.txt  (3,560 lines)
    ├── 100_train_supervised.txt (7,120 lines)
    └── ... (semi-supervised split variants)
```

---

## Planned Contents

| Folder | Purpose |
|---|---|
| `dataset/LEVIR-CD256/` | ✅ **Done** — Official ChangeFormer LEVIR-CD-256 dataset |
| `models/` | ChangeFormer model weights, config files, and training checkpoints |
| `preprocessing/` | Scripts for satellite image tiling, band normalization, and georeferencing |
| `inference/` | Inference pipeline — takes a pair of images, returns predicted change mask |
| `outputs/` | Georeferenced change polygons (GeoJSON) and coordinates ready for the frontend |

---

## Roadmap

1. ✅ **Dataset** — LEVIR-CD-256 downloaded and verified (10,192 image pairs).
2. **Preprocessing** — Normalize bands, clip to Pune ward boundaries, export image pairs.
3. **Model** — Integrate the [ChangeFormer](https://github.com/wgcban/ChangeFormer) transformer-based change-detection architecture.
4. **Inference** — Run the model on new imagery pairs; export binary change masks.
5. **Post-processing** — Convert raster masks to georeferenced GeoJSON polygons.
6. **Frontend handoff** — Serve polygon coordinates via a lightweight API so the React frontend can render detected change zones on the Leaflet map.

---

## Notes

- No ML packages have been installed yet (PyTorch, rasterio, etc. — coming next).
- No model training has started yet.
- This module will use **Python** (PyTorch, rasterio, shapely, GDAL).
- A `requirements.txt` will be added when the environment is set up.
