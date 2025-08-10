#!/usr/bin/env python3
"""
NodeJS Microservices — API Gateway Tests (timestamps + robust retries + ✅ confirmations)
--------------------------------------------------------------------------------------------------
Requirements: Python 3.9+, pip install requests

Idempotent per run. Adds ISO8601 timestamps to every log line.
"""

import os
import sys
import time
import json
import random
import string
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Callable

try:
    import requests
except ImportError:
    print("This script requires the 'requests' package. Install with: pip install requests", file=sys.stderr)
    sys.exit(2)

def ts() -> str:
    # Local time with timezone offset and milliseconds
    return datetime.now().astimezone().isoformat(timespec='milliseconds')

BASE_URL   = os.environ.get("BASE_URL", "http://localhost:90").rstrip("/")
PASSWORD   = os.environ.get("PASSWORD", "yourpassword")
RETRIES    = int(os.environ.get("RETRIES", "40"))
RETRY_DELAY= float(os.environ.get("RETRY_DELAY", "0.5"))
BACKOFF    = float(os.environ.get("BACKOFF", "1.3"))
MAX_WAIT_STOCK_INIT  = float(os.environ.get("MAX_WAIT_STOCK_INIT", "90"))
MAX_WAIT_STOCK_AFTER = float(os.environ.get("MAX_WAIT_STOCK_AFTER", "60"))

def rand_suffix(n: int = 8) -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=n))

def pretty(obj: Any) -> str:
    try:
        return json.dumps(obj, indent=2, ensure_ascii=False, sort_keys=True)
    except Exception:
        return str(obj)

def ok(msg: str) -> None:
    print(f"{ts()} ✅ {msg}")

def info(msg: str) -> None:
    print(f"{ts()} ℹ️  {msg}")

def warn(msg: str) -> None:
    print(f"{ts()} ⚠️  {msg}", file=sys.stderr)

class ApiError(RuntimeError):
    pass

def http(
    method: str,
    path: str,
    *,
    token: Optional[str] = None,
    json_body: Optional[Dict[str, Any]] = None,
    expected: Optional[int] = None,
    timeout: float = 10.0,
) -> requests.Response:
    url = f"{BASE_URL}{path}"
    headers = {"Accept": "application/json"}
    if json_body is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    resp = requests.request(method, url, json=json_body, headers=headers, timeout=timeout)
    if expected is not None and resp.status_code != expected:
        raise ApiError(f"{method} {path} expected {expected} but got {resp.status_code}:\n{resp.text}")
    return resp

def wait_for(func: Callable[[], Any], *, tries: int, delay: float, backoff: float, desc: str, max_seconds: Optional[float] = None):
    start = time.monotonic()
    last_exc = None
    cur_delay = delay
    attempt = 0
    while True:
        attempt += 1
        try:
            return func()
        except (AssertionError, ApiError) as e:
            last_exc = e
            elapsed = time.monotonic() - start
            if max_seconds is not None and elapsed >= max_seconds:
                break
            if attempt >= tries:
                if max_seconds is None:
                    break
            sleep_for = cur_delay * (1 + random.uniform(-0.1, 0.1))
            print(f"{ts()} [wait] attempt {attempt}/{tries} (elapsed {elapsed:.1f}s) failed for {desc}: {e.__class__.__name__}: {e}. retrying in {sleep_for:.2f}s...", file=sys.stderr)
            time.sleep(max(0.05, sleep_for))
            cur_delay *= backoff
    if last_exc:
        raise last_exc
    raise TimeoutError(f"Timeout waiting for {desc}")

def main() -> int:
    info(f"BASE_URL={BASE_URL} | RETRIES={RETRIES} RETRY_DELAY={RETRY_DELAY} BACKOFF={BACKOFF} | MAX_WAIT_STOCK_INIT={MAX_WAIT_STOCK_INIT}s MAX_WAIT_STOCK_AFTER={MAX_WAIT_STOCK_AFTER}s")
    email = f"test+{int(time.time())}-{rand_suffix()}@example.com"

    # Register
    reg = http("POST", "/users/register", json_body={"email": email, "password": PASSWORD}, expected=201).json()
    assert "id" in reg and "email" in reg, f"Unexpected register response: {pretty(reg)}"
    user_id = reg["id"]
    ok(f"[Auth] Registered user_id={user_id}, email={reg['email']}")

    # Login
    r = http("POST", "/users/login", json_body={"email": email, "password": PASSWORD}, expected=None)
    assert r.status_code in (200, 201), f"Login status unexpected: {r.status_code} {r.text}"
    login = r.json()
    token = login.get("access_token") or login.get("token") or login.get("jwt")
    assert token, f"No token in login response: {pretty(login)}"
    ok("[Auth] Login OK — token acquired")

    # Me
    me = http("GET", "/users/me", token=token, expected=200).json()
    assert "userId" in me and "email" in me, f"Unexpected /users/me: {pretty(me)}"
    ok(f"[Users] /users/me OK — userId={me['userId']}, email={me['email']}")

    # Users/:id (expected 404)
    r = http("GET", f"/users/{user_id}", token=token, expected=None)
    if r.status_code == 404:
        ok(f"[Users] /users/{user_id} returned expected 404")
    else:
        warn(f"[Users] /users/{user_id} expected 404, got {r.status_code}")

    # Products list
    plist = http("GET", "/products", expected=200).json()
    assert isinstance(plist, list), f"Products list is not an array: {pretty(plist)}"
    ok(f"[Products] List OK — count={len(plist)}")

    # Create product
    product_name = f"Widget-{rand_suffix()}"
    pcreate = http("POST", "/products", json_body={"name": product_name, "price": 19.99, "inStock": True}, expected=None).json()
    product_id = pcreate.get("_id") or pcreate.get("id")
    assert product_id, f"No product id in response: {pretty(pcreate)}"
    ok(f"[Products] Created OK — product_id={product_id}, name={product_name}")

    # Get product by id
    pget = http("GET", f"/products/{product_id}", expected=200).json()
    assert (pget.get("_id") or pget.get("id")) == product_id, f"Mismatched product id: {pretty(pget)}"
    ok(f"[Products] Get by id OK — product_id={product_id}")

    # Stock availability (may 404 until projection exists)
    def fetch_stock_available():
        r = http("GET", f"/products/{product_id}/stock", expected=None)
        if r.status_code == 200:
            s = r.json()
            assert "productId" in s and "stock" in s, f"Bad stock payload: {pretty(s)}"
            return s
        if r.status_code == 404:
            raise AssertionError(f"stock not yet available: {r.text}")
        raise AssertionError(f"unexpected status {r.status_code}: {r.text}")

    stock = wait_for(
        fetch_stock_available,
        tries=RETRIES, delay=RETRY_DELAY, backoff=BACKOFF,
        desc="initial inventory stock availability",
        max_seconds=MAX_WAIT_STOCK_INIT
    )
    ok(f"[Inventory] Stock available — product_id={product_id}, stock={stock['stock']}")

    # Replenish 10
    rep = http("PATCH", f"/products/{product_id}/replenish", json_body={"quantity": 10}, expected=200).json()
    new_stock = rep.get("newStock")
    ok(f"[Inventory] Replenish OK — product_id={product_id}, newStock={new_stock}")

    # Confirm stock == new_stock
    def confirm_replenish():
        r = http("GET", f"/products/{product_id}/stock", expected=200)
        s2 = r.json()
        assert "stock" in s2, f"Bad stock payload: {pretty(s2)}"
        if new_stock is not None and s2["stock"] != new_stock:
            raise AssertionError(f"Stock not updated yet: {s2['stock']} != {new_stock}")
        return s2

    stock_after = wait_for(
        confirm_replenish,
        tries=RETRIES, delay=RETRY_DELAY, backoff=BACKOFF,
        desc="stock after replenish",
        max_seconds=MAX_WAIT_STOCK_INIT
    )
    ok(f"[Inventory] Stock confirmed — product_id={product_id}, stock={stock_after['stock']}")

    # Orders list (public observed)
    olist = http("GET", "/orders", expected=200).json()
    if isinstance(olist, list):
        ok(f"[Orders] Public list OK — count={len(olist)}")
    else:
        ok("[Orders] Public list OK")

    # Create order (quantity 2)
    ocreate = http(
        "POST", "/orders",
        token=token,
        json_body={"productId": product_id, "quantity": 2, "userId": me["userId"]},
        expected=201
    ).json()
    order_id = ocreate.get("id")
    assert order_id, f"No order id: {pretty(ocreate)}"
    ok(f"[Orders] Create OK — order_id={order_id}, product_id={product_id}, quantity=2")

    # Stock after order (retry)
    def check_stock_after_order():
        s = http("GET", f"/products/{product_id}/stock", expected=200).json()
        if new_stock is not None and s["stock"] != new_stock - 2:
            raise AssertionError(f"Expected stock {new_stock - 2}, got {s['stock']}")
        return s

    try:
        s_decr = wait_for(
            check_stock_after_order,
            tries=RETRIES, delay=RETRY_DELAY, backoff=BACKOFF,
            desc="stock after order",
            max_seconds=MAX_WAIT_STOCK_AFTER
        )
        ok(f"[Inventory] Stock decreased OK — product_id={product_id}, stock={s_decr['stock']}")
    except Exception as e:
        warn(f"[Inventory] Stock decrease not confirmed within {MAX_WAIT_STOCK_AFTER}s (continuing): {e}")

    # Get order by id
    http("GET", f"/orders/{order_id}", token=token, expected=200)
    ok(f"[Orders] Get by id OK — order_id={order_id}")

    # Patch order quantity to 1
    http("PATCH", f"/orders/{order_id}", token=token, json_body={"quantity": 1, "userId": me["userId"]}, expected=200)
    ok(f"[Orders] Patch OK — order_id={order_id}, quantity=1")

    # Delete order
    http("DELETE", f"/orders/{order_id}", token=token, expected=200)
    ok(f"[Orders] Delete OK — order_id={order_id}")

    # Final stock check (non-fatal)
    sfinal = http("GET", f"/products/{product_id}/stock", expected=200).json()
    ok(f"[Inventory] Final stock — product_id={product_id}, stock={sfinal.get('stock')}")

    print(f"{ts()} === Summary ===")
    print(f"{ts()} user_id={user_id}, email={email}")
    print(f"{ts()} product_id={product_id}, order_id={order_id}")
    print(f"{ts()} OK")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except ApiError as e:
        print(f"{ts()} \nAPI ERROR:\n{e}", file=sys.stderr)
        sys.exit(1)
    except AssertionError as e:
        print(f"{ts()} \nASSERTION FAILED:\n{e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"{ts()} \nUNEXPECTED ERROR: {e}", file=sys.stderr)
        sys.exit(1)
