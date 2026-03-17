"""
Surrogate_2: Replace tracking JavaScript calls with LLM-generated (or fallback)
neutralizations so that the webpage continues to function without tracking.
"""

from .main import main, get_tracking_functions, request_response_dic
from .replace_function_call import replace_function_call, get_call_span, extract_call_snippet
from .llm_neutralize import neutralize_tracking_call, get_fallback_replacement

__all__ = [
    "main",
    "get_tracking_functions",
    "request_response_dic",
    "replace_function_call",
    "get_call_span",
    "extract_call_snippet",
    "neutralize_tracking_call",
    "get_fallback_replacement",
]
