import os
import sys
import base64
import json
import requests

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def load_env_file():
    if "GEMINI_API_KEY" in os.environ:
        return
    for env_path in [".env", "../.env", os.path.join("..", ".env")]:
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY="):
                        key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        os.environ["GEMINI_API_KEY"] = key
                        return

def main():
    load_env_file()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print(json.dumps({"error": "GEMINI_API_KEY environment variable not set"}))
        sys.exit(1)

    before_path = os.path.join("ml", "satellite_data", "processed", "before.png")
    current_path = os.path.join("ml", "satellite_data", "processed", "current.png")

    if not os.path.exists(before_path) or not os.path.exists(current_path):
        before_path = os.path.join("satellite_data", "processed", "before.png")
        current_path = os.path.join("satellite_data", "processed", "current.png")

    if not os.path.exists(before_path) or not os.path.exists(current_path):
        print(json.dumps({"error": f"Image files not found at {before_path} or {current_path}"}))
        sys.exit(1)

    before_base64 = encode_image(before_path)
    current_base64 = encode_image(current_path)

    prompt = (
        "Compare the BEFORE image and CURRENT image of the same location.\n"
        "Identify visible structural changes between the two satellite/aerial images.\n"
        "Describe each detected change.\n"
        "Estimate its location within the image using normalized coordinates (0 to 1, where [ymin, xmin, ymax, xmax] represent box corners).\n"
        "Return valid JSON only, using the following schema:\n"
        "{\n"
        "  \"changes_detected\": boolean,\n"
        "  \"change_count\": number,\n"
        "  \"changes\": [\n"
        "    {\n"
        "      \"description\": \"string\",\n"
        "      \"bbox_normalized\": [ymin, xmin, ymax, xmax]\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "Do not invent coordinates if no structural changes exist. Do not claim or classify changes as confirmed illegal construction."
    )

    models_to_try = [
        "gemini-flash-latest",
        "gemini-3.8-flash",
        "gemini-3-flash-preview",
        "gemini-2.5-pro"
    ]

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/png",
                            "data": before_base64
                        }
                    },
                    {
                        "inline_data": {
                            "mime_type": "image/png",
                            "data": current_base64
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "response_mime_type": "application/json"
        }
    }

    last_error = None
    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        try:
            response = requests.post(url, json=payload, timeout=60)
            if response.status_code == 200:
                res_data = response.json()
                candidates = res_data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts:
                        text_content = ""
                        for part in parts:
                            if "text" in part:
                                text_content += part["text"]
                        if text_content:
                            parsed = json.loads(text_content)
                            print(json.dumps(parsed, indent=2))
                            return
            else:
                last_error = f"HTTP {response.status_code}: {response.text}"
        except Exception as e:
            last_error = str(e)

    print(json.dumps({"error": f"Failed to get response from Gemini API: {last_error}"}))

if __name__ == "__main__":
    main()
