"""
config.py

Central place for API keys / model config so switching providers
(Ollama -> Gemini, or Gemini -> something else later) only touches
one file instead of every engine.

Set your key as an environment variable before starting the server:

    export GOOGLE_API_KEY="your-gemini-api-key-here"      # macOS/Linux
    setx GOOGLE_API_KEY "your-gemini-api-key-here"         # Windows (new shell needed after)

Get a free Gemini API key at: https://aistudio.google.com/apikey
"""

import os

from dotenv import load_dotenv

# Load .env file
load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise RuntimeError(
        "GOOGLE_API_KEY environment variable is not set. "
        "Create a .env file containing:\n"
        "GOOGLE_API_KEY=your_gemini_api_key_here"
    )

# Default Gemini model
DEFAULT_MODEL = "gemini-3.5-flash-lite"