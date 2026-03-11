import json
import os
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlparse

import requests
import streamlit as st
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

load_dotenv()

DEFAULT_BASE_URL = os.getenv("N8N_BASE_URL", "http://localhost:5678").rstrip("/")
DEFAULT_BASIC_USER = os.getenv("N8N_BASIC_AUTH_USER", "")
DEFAULT_BASIC_PASSWORD = os.getenv("N8N_BASIC_AUTH_PASSWORD", "")
DEFAULT_CONNECT_TIMEOUT = int(os.getenv("N8N_CONNECT_TIMEOUT", "5"))
DEFAULT_READ_TIMEOUT = int(os.getenv("N8N_READ_TIMEOUT", "90"))
MAX_ERROR_BODY_CHARS = 1200


@dataclass(frozen=True)
class RequestResult:
    data: Dict[str, Any]
    status_code: int
    elapsed_ms: float


def _auth_tuple(user: str, password: str) -> Optional[tuple[str, str]]:
    if user and password:
        return (user, password)
    return None


def _normalize_base_url(raw_url: str) -> str:
    value = raw_url.strip().rstrip("/")
    if not value:
        raise ValueError("Base URL is required")

    # Accept host-only input like "n8n-app.fly.dev" by defaulting to HTTPS.
    if "://" not in value:
        value = f"https://{value}"

    parsed = urlparse(value)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError("Base URL must be a valid http(s) URL")
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Base URL must start with http:// or https://")
    return value


@st.cache_resource(show_spinner=False)
def get_http_session() -> requests.Session:
    retry_policy = Retry(
        total=2,
        connect=2,
        read=2,
        status=2,
        backoff_factor=0.25,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET", "POST"}),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(
        max_retries=retry_policy,
        pool_connections=20,
        pool_maxsize=20,
    )
    session = requests.Session()
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.headers.update({"Accept": "application/json"})
    return session


def _request_json(
    method: str,
    url: str,
    *,
    user: str,
    password: str,
    connect_timeout: int,
    read_timeout: int,
    json_payload: Optional[Dict[str, Any]] = None,
    files_payload: Optional[Dict[str, Tuple[str, bytes, str]]] = None,
) -> RequestResult:
    session = get_http_session()
    start = time.perf_counter()
    response = session.request(
        method=method,
        url=url,
        json=json_payload,
        files=files_payload,
        auth=_auth_tuple(user, password),
        timeout=(connect_timeout, read_timeout),
    )
    elapsed_ms = (time.perf_counter() - start) * 1000

    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        error_body = (exc.response.text if exc.response is not None else str(exc))[:MAX_ERROR_BODY_CHARS]
        raise requests.HTTPError(
            f"HTTP request failed ({response.status_code}): {error_body}",
            response=exc.response,
        ) from exc

    try:
        body = response.json()
    except ValueError as exc:
        preview = response.text[:MAX_ERROR_BODY_CHARS]
        raise ValueError(f"Webhook did not return valid JSON: {preview}") from exc

    if not isinstance(body, dict):
        body = {"result": body}

    return RequestResult(
        data=body,
        status_code=response.status_code,
        elapsed_ms=elapsed_ms,
    )


def call_json_webhook(
    url: str,
    payload: Dict[str, Any],
    user: str,
    password: str,
    connect_timeout: int,
    read_timeout: int,
) -> RequestResult:
    return _request_json(
        "POST",
        url,
        user=user,
        password=password,
        connect_timeout=connect_timeout,
        read_timeout=read_timeout,
        json_payload=payload,
    )


def call_file_webhook(
    url: str,
    file_name: str,
    file_bytes: bytes,
    mime_type: str,
    user: str,
    password: str,
    connect_timeout: int,
    read_timeout: int,
) -> RequestResult:
    files = {
        "data": (file_name, file_bytes, mime_type or "application/octet-stream"),
    }
    return _request_json(
        "POST",
        url,
        user=user,
        password=password,
        connect_timeout=connect_timeout,
        read_timeout=read_timeout,
        files_payload=files,
    )


def _get_endpoint(base_url: str, route: str) -> str:
    return f"{base_url}/webhook/{route}"


def ping_n8n(
    base_url: str,
    user: str,
    password: str,
    connect_timeout: int,
    read_timeout: int,
) -> tuple[int, float]:
    session = get_http_session()
    start = time.perf_counter()
    response = session.get(
        f"{base_url}/healthz",
        auth=_auth_tuple(user, password),
        timeout=(connect_timeout, read_timeout),
    )
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.raise_for_status()
    return response.status_code, elapsed_ms


def _init_state() -> None:
    st.session_state.setdefault("cfg_base_url", DEFAULT_BASE_URL)
    st.session_state.setdefault("cfg_basic_user", DEFAULT_BASIC_USER)
    st.session_state.setdefault("cfg_basic_password", DEFAULT_BASIC_PASSWORD)
    st.session_state.setdefault("cfg_connect_timeout", DEFAULT_CONNECT_TIMEOUT)
    st.session_state.setdefault("cfg_read_timeout", DEFAULT_READ_TIMEOUT)

    st.session_state.setdefault("meal_result", None)
    st.session_state.setdefault("fitness_result", None)
    st.session_state.setdefault("voice_result", None)


def _render_result(title: str, result: Optional[RequestResult]) -> None:
    if result is None:
        return
    st.success(title)
    col_status, col_latency = st.columns(2)
    col_status.metric("HTTP Status", result.status_code)
    col_latency.metric("Latency", f"{result.elapsed_ms:.0f} ms")
    st.json(result.data)
    st.download_button(
        label="Download JSON",
        data=json.dumps(result.data, ensure_ascii=True, indent=2),
        file_name=f"{title.lower().replace(' ', '_')}.json",
        mime="application/json",
        use_container_width=True,
    )


st.set_page_config(page_title="NutriHealth n8n UI", page_icon="NH", layout="wide")
_init_state()

st.title("NutriHealth n8n UI")
st.caption("Optimized Streamlit frontend for meal planning, fitness advice, and voice transcription.")

with st.sidebar:
    st.header("Connection")
    with st.form("connection_form", clear_on_submit=False):
        base_url_input = st.text_input("n8n Base URL", value=st.session_state["cfg_base_url"])
        basic_user_input = st.text_input("Basic Auth User", value=st.session_state["cfg_basic_user"])
        basic_password_input = st.text_input(
            "Basic Auth Password",
            value=st.session_state["cfg_basic_password"],
            type="password",
        )
        connect_timeout_input = st.number_input(
            "Connect timeout (sec)",
            min_value=1,
            max_value=30,
            value=int(st.session_state["cfg_connect_timeout"]),
        )
        read_timeout_input = st.number_input(
            "Read timeout (sec)",
            min_value=5,
            max_value=300,
            value=int(st.session_state["cfg_read_timeout"]),
        )
        apply_conn = st.form_submit_button("Apply Connection", use_container_width=True)

    if apply_conn:
        try:
            st.session_state["cfg_base_url"] = _normalize_base_url(base_url_input)
            st.session_state["cfg_basic_user"] = basic_user_input.strip()
            st.session_state["cfg_basic_password"] = basic_password_input.strip()
            st.session_state["cfg_connect_timeout"] = int(connect_timeout_input)
            st.session_state["cfg_read_timeout"] = int(read_timeout_input)
            st.success("Connection settings updated.")
        except ValueError as exc:
            st.error(str(exc))

    base_url = st.session_state["cfg_base_url"]
    endpoint_preview = "\n".join(
        [
            _get_endpoint(base_url, "meal-planner"),
            _get_endpoint(base_url, "fitness-advice"),
            _get_endpoint(base_url, "voice-to-text"),
        ]
    )
    st.markdown("Webhook endpoints")
    st.code(endpoint_preview, language="text")

    if st.button("Ping n8n", use_container_width=True):
        try:
            status_code, elapsed_ms = ping_n8n(
                base_url=base_url,
                user=st.session_state["cfg_basic_user"],
                password=st.session_state["cfg_basic_password"],
                connect_timeout=st.session_state["cfg_connect_timeout"],
                read_timeout=st.session_state["cfg_read_timeout"],
            )
            st.success(f"n8n reachable ({status_code}) in {elapsed_ms:.0f} ms")
        except Exception as exc:  # noqa: BLE001
            st.error(f"Ping failed: {exc}")

tab_meal, tab_fitness, tab_voice = st.tabs(
    ["AI Meal Planner (OpenRouter)", "Fitness Advice (OpenRouter)", "Voice-to-Text (HF Whisper)"]
)

with tab_meal:
    st.subheader("Meal Planner")
    with st.form("meal_planner_form"):
        diet = st.selectbox(
            "Diet type",
            [
                "balanced",
                "high-protein",
                "keto",
                "vegetarian",
                "vegan",
                "mediterranean",
            ],
        )
        calories = st.number_input("Target calories", min_value=900, max_value=6000, value=2200)
        allergies = st.text_input("Allergies (comma-separated)", value="peanuts,shellfish")
        submit_meal = st.form_submit_button("Generate Meal Plan", use_container_width=True)

    if submit_meal:
        payload = {
            "diet": diet,
            "calories": calories,
            "allergies": [a.strip() for a in allergies.split(",") if a.strip()],
        }
        url = _get_endpoint(st.session_state["cfg_base_url"], "meal-planner")
        with st.spinner("Calling meal planner workflow..."):
            try:
                st.session_state["meal_result"] = call_json_webhook(
                    url=url,
                    payload=payload,
                    user=st.session_state["cfg_basic_user"],
                    password=st.session_state["cfg_basic_password"],
                    connect_timeout=st.session_state["cfg_connect_timeout"],
                    read_timeout=st.session_state["cfg_read_timeout"],
                )
            except Exception as exc:  # noqa: BLE001
                st.error(f"Request failed: {exc}")
    _render_result("Meal Plan Generated", st.session_state["meal_result"])

with tab_fitness:
    st.subheader("Fitness Advice")
    with st.form("fitness_advice_form"):
        query = st.text_area(
            "Ask a fitness question",
            value="How should I structure a 4-day beginner strength program?",
            height=140,
        )
        submit_fitness = st.form_submit_button("Get Advice", use_container_width=True)

    if submit_fitness:
        url = _get_endpoint(st.session_state["cfg_base_url"], "fitness-advice")
        with st.spinner("Calling fitness advice workflow..."):
            try:
                st.session_state["fitness_result"] = call_json_webhook(
                    url=url,
                    payload={"query": query.strip()},
                    user=st.session_state["cfg_basic_user"],
                    password=st.session_state["cfg_basic_password"],
                    connect_timeout=st.session_state["cfg_connect_timeout"],
                    read_timeout=st.session_state["cfg_read_timeout"],
                )
            except Exception as exc:  # noqa: BLE001
                st.error(f"Request failed: {exc}")
    _render_result("Advice Generated", st.session_state["fitness_result"])

with tab_voice:
    st.subheader("Voice to Text")
    with st.form("voice_to_text_form"):
        audio_file = st.file_uploader(
            "Upload audio",
            type=["wav", "mp3", "m4a", "ogg", "flac", "webm"],
            help="The webhook expects multipart/form-data with file field name 'data'.",
        )
        submit_voice = st.form_submit_button(
            "Transcribe Audio",
            type="primary",
            use_container_width=True,
            disabled=audio_file is None,
        )

    if submit_voice and audio_file is not None:
        file_bytes = audio_file.getvalue()
        if not file_bytes:
            st.error("Uploaded file is empty.")
        else:
            url = _get_endpoint(st.session_state["cfg_base_url"], "voice-to-text")
            with st.spinner("Calling Whisper workflow..."):
                try:
                    st.session_state["voice_result"] = call_file_webhook(
                        url=url,
                        file_name=audio_file.name,
                        file_bytes=file_bytes,
                        mime_type=audio_file.type or "application/octet-stream",
                        user=st.session_state["cfg_basic_user"],
                        password=st.session_state["cfg_basic_password"],
                        connect_timeout=st.session_state["cfg_connect_timeout"],
                        read_timeout=st.session_state["cfg_read_timeout"],
                    )
                except Exception as exc:  # noqa: BLE001
                    st.error(f"Request failed: {exc}")
    _render_result("Transcription Completed", st.session_state["voice_result"])
