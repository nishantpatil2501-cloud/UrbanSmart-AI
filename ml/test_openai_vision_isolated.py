import os
import sys
import base64
import json
import requests

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def load_env_file():
    if "OPENAI_API_KEY" in os.environ:
        return
    for env_path in [".env", "../.env", os.path.join("..", ".env")]:
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("OPENAI_API_KEY="):
                        key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        os.environ["OPENAI_API_KEY"] = key
                        return
                    if line.startswith("OPENAI=_API_KEY="):
                        # Fix the typo parse error
                        key = line.split("OPENAI=_API_KEY=")[1].strip().strip('"').strip("'")
                        os.environ["OPENAI_API_KEY"] = key
                        return

def main():
    load_env_file()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print(json.dumps({"error": "OPENAI_API_KEY environment variable not set"}))
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

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    prompt = (
        "Compare the BEFORE image and CURRENT image of the same location.\n"
        "Identify only visible differences between the two images.\n"
        "Do not invent changes.\n"
        "Do not call anything 'confirmed illegal construction'. Use 'possible' when uncertain.\n"
        "Return valid JSON only using this exact schema:\n"
        "{\n"
        "  \"changes_found\": true/false,\n"
        "  \"change_count\": number,\n"
        "  \"changes\": [\n"
        "    {\n"
        "      \"description\": \"...\",\n"
        "      \"location\": {\n"
        "        \"x_min\": 0.0 to 1.0,\n"
        "        \"y_min\": 0.0 to 1.0,\n"
        "        \"x_max\": 0.0 to 1.0,\n"
        "        \"y_max\": 0.0 to 1.0\n"
        "      },\n"
        "      \"type\": \"possible_new_structure | expansion | demolition | vegetation | road | other\"\n"
        "    }\n"
        "  ]\n"
        "}"
    )

    payload = {
        "model": "gpt-4o",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{before_base64}"
                        }
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{current_base64}"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 1000,
        "response_format": {"type": "json_object"}
    }

    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        response.raise_for_status()
        res_data = response.json()
        content = res_data["choices"][0]["message"]["content"]
        print(content)
    except Exception as e:
        if hasattr(e, "response") and e.response is not None:
            print(json.dumps({"error": str(e), "details": e.response.text}))
        else:
            print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
