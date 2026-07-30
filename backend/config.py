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

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "AQ.Ab8RN6L_uAdwFjnoO1wBn3q0eQ9PhfY0dmrxoBDgP8PfZwrxOA")

if not GOOGLE_API_KEY:
    raise RuntimeError(
        "GOOGLE_API_KEY environment variable is not set. "
        "Get a free key at https://aistudio.google.com/apikey and set it with:\n"
        '  export GOOGLE_API_KEY="your-key-here"'
    )

# Free-tier friendly default. Gemini 2.0 Flash has a generous free quota
# and is fast enough for all three reasoning stages plus extraction.
DEFAULT_MODEL = "gemini-3.5-flash-lite"
