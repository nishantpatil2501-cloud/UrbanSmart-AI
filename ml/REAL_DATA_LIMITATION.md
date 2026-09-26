# Change Detection Data Limitation Note

## Resolution Mismatch
*   **Model Training Data:** The ChangeFormerV6 pretrained checkpoint was trained and evaluated on LEVIR-style Very High Resolution (VHR) imagery.
*   **LEVIR Resolution:** 0.5 meters/pixel.
*   **Sentinel-2 Resolution:** The Sentinel-2 B02, B03, and B04 bands have a resolution of 10 meters/pixel.

## Inference Results
*   The current Pune Sentinel-2 inference test produced a maximum change probability of **0.0004** and **0 changed pixels**.
*   The massive scale disparity prevents the model from extracting the expected structural building features it learned during training.

## Conclusion & Requirements
*   Therefore, the current pretrained model must **NOT** be presented as a verified building-level Pune detector.
*   High-resolution imagery (comparable to 0.5m/pixel) and/or fine-tuning on matching imagery is required for functional building-level change detection.
