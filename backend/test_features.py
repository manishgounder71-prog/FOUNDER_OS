import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def run_test(name, path, method="GET", data=None):
    print(f"\n[TEST] {name} ({method} {path})")
    url = f"{BASE_URL}{path}"
    
    headers = {}
    req_data = None
    if data:
        req_data = json.dumps(data).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        start_time = time.time()
        with urllib.request.urlopen(req, timeout=10) as response:
            resp_data = response.read().decode("utf-8")
            elapsed = time.time() - start_time
            print(f"  Result: SUCCESS (HTTP {response.status}) in {elapsed:.3f}s")
            
            parsed = json.loads(resp_data)
            # Print a neat preview of the output
            preview = json.dumps(parsed, indent=2)
            if len(preview) > 500:
                print(f"  Payload (Truncated):\n{preview[:480]}...\n}}")
            else:
                print(f"  Payload:\n{preview}")
            return parsed
    except urllib.error.HTTPError as e:
        print(f"  Result: FAILED (HTTPError {e.code}: {e.reason})")
        try:
            print(f"  Response Body: {e.read().decode('utf-8')}")
        except Exception:
            pass
        return None
    except Exception as e:
        print(f"  Result: ERROR ({e})")
        return None

if __name__ == "__main__":
    print("==============================================")
    print("STARTING DEVELOPER INTEGRATION TESTS")
    print("==============================================")
    
    # 1. System Health Check
    run_test("Health Check", "/", method="GET")
    
    # 2. Omi Webhook Simulation Intake
    omi_payload = {
        "transcript": "Create a launch strategy for an AI study app.",
        "session_id": "test-session-dev-101",
        "speaker": "founder"
    }
    omi_res = run_test("Omi Webhook Simulation", "/api/voice/omi-webhook", method="POST", data=omi_payload)
    
    # 3. Direct Workflow Trigger
    wf_payload = {
        "prompt": "Research competitors for an AI note-taking app."
    }
    wf_res = run_test("Direct Workflow Trigger", "/api/workflow/execute", method="POST", data=wf_payload)
    
    if wf_res and "workflow_id" in wf_res:
        wf_id = wf_res["workflow_id"]
        # Wait a second for background execution to start
        time.sleep(1.5)
        # 4. Check Workflow Status
        run_test("Inspect Workflow State", f"/api/workflow/status/{wf_id}", method="GET")
        
    # 5. Qdrant Semantic Search
    run_test("Qdrant Semantic Search", "/api/memory/search?q=note-taking", method="GET")
    
    # 6. Chronological Memory Scroll
    run_test("Timeline Memory Retrieval", "/api/memory/timeline", method="GET")
    
    print("\n==============================================")
    print("DEVELOPER INTEGRATION TESTS COMPLETE")
    print("==============================================")
