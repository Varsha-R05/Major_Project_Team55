
import os
import time
import json
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------
# CLOUDFLARE CONFIGURATION
# ---------------------------------

CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")

MODEL_NAME = "@cf/meta/llama-3.2-3b-instruct"

API_URL = (
    f"https://api.cloudflare.com/client/v4/accounts/"
    f"{CLOUDFLARE_ACCOUNT_ID}/ai/run/{MODEL_NAME}"
    if CLOUDFLARE_ACCOUNT_ID
    else None
)

if not CLOUDFLARE_ACCOUNT_ID:
    print("WARNING: CLOUDFLARE_ACCOUNT_ID is not configured")

if not CLOUDFLARE_API_TOKEN:
    print("WARNING: CLOUDFLARE_API_TOKEN is not configured")


# ---------------------------------
# LLAMA API FUNCTION
# ---------------------------------

def ask_llama(
    prompt: str,
    max_tokens: int = 1000,
    temperature: float = 0.5,
    response_format: Optional[str] = "json",
):

    try:
        if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
            print("CLOUDFLARE ERROR: Credentials are missing")
            return None

        start_time = time.perf_counter()

        # JSON response instruction
        if response_format == "json":
            prompt = (
                prompt
                + "\n\nReturn only valid JSON. "
                "Do not include Markdown code fences or explanations."
            )

        headers = {
            "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
            "Content-Type": "application/json",
        }

        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": 0.9,
        }

        # ---------------------------------
        # API REQUEST
        # ---------------------------------

        response = requests.post(
            API_URL,
            headers=headers,
            json=payload,
            timeout=120,
        )

        print("\nCloudflare status code:", response.status_code)

        response.raise_for_status()

        data = response.json()

        if not data.get("success", False):
            print("CLOUDFLARE API ERROR:", data.get("errors", data))
            return None

        result = data.get("result", {})
        content = result.get("response", "")

        # ---------------------------------
        # NORMALIZE RESPONSE
        # ---------------------------------

        if isinstance(content, (dict, list)):
            content = json.dumps(content, ensure_ascii=False)

        elif content is None:
            content = ""

        elif not isinstance(content, str):
            content = str(content)

        # ---------------------------------
        # TOKEN AND NEURON USAGE
        # ---------------------------------

        usage = result.get("usage") or data.get("usage") or {}

        input_tokens = usage.get("prompt_tokens")
        output_tokens = usage.get("completion_tokens")
        total_tokens = usage.get("total_tokens")
        neurons_used = usage.get("neurons")

        print("\n========== TOKEN USAGE ==========")

        print(
            "Input tokens:",
            input_tokens if input_tokens is not None else "Not provided"
        )

        print(
            "Output tokens:",
            output_tokens if output_tokens is not None else "Not provided"
        )

        print(
            "Total tokens:",
            total_tokens if total_tokens is not None
            else (
                input_tokens + output_tokens
                if input_tokens is not None and output_tokens is not None
                else "Not available"
            )
        )

        print("Maximum output tokens:", max_tokens)
        print(
            "Neurons used:",
            neurons_used if neurons_used is not None else "Not provided"
        )
        print("Temperature:", temperature)
        print("Top P:", 0.9)
        print("Full usage details:", usage)

        print("=================================\n")

        # ---------------------------------
        # REQUEST PERFORMANCE
        # ---------------------------------

        duration = time.perf_counter() - start_time

        print("Model:", MODEL_NAME)
        print("Request duration:", round(duration, 2), "seconds")
        print("Generated characters:", len(content))

        if not content.strip():
            print("CLOUDFLARE ERROR: Model returned empty content")
            return None

        # ---------------------------------
        # COMPLETE GENERATED RESPONSE
        # ---------------------------------

        print("\n========== GENERATED RESPONSE ==========")
        print(content)
        print("\n========== END OF RESPONSE =============")

        return content.strip()

    except requests.exceptions.HTTPError as error:

        print("CLOUDFLARE HTTP ERROR:", str(error))

        if error.response is not None:
            print("Error details:", error.response.text)

        return None

    except requests.exceptions.RequestException as error:

        print("CLOUDFLARE REQUEST ERROR:", repr(error))
        return None

    except Exception as error:

        print("CLOUDFLARE ERROR:", repr(error))
        return None
