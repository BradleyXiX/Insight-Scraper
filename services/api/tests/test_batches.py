def test_batch_creates_one_job_per_item_sharing_a_batch_id(
    authed_client, local_mode, no_auto_start
):
    items = [
        {"query": f"dentist {i}", "region": "US", "source": "gmaps", "limit": 5}
        for i in range(10)
    ]
    resp = authed_client.post("/api/batches", json={"items": items})
    assert resp.status_code == 202
    data = resp.json()
    assert "batch_id" in data
    assert len(data["jobs"]) == 10
    batch_id = data["batch_id"]
    assert all(job.get("batch_id") == batch_id for job in data["jobs"])
    assert len(no_auto_start) == 10


def test_batch_rejects_more_than_25_items(authed_client, local_mode):
    items = [
        {"query": f"dentist {i}", "region": "US", "source": "gmaps", "limit": 5}
        for i in range(26)
    ]
    resp = authed_client.post("/api/batches", json={"items": items})
    assert resp.status_code == 422


def test_batch_rejects_the_whole_request_on_one_invalid_item(
    authed_client, local_mode
):
    items = [
        {"query": "valid dentist", "region": "US", "source": "gmaps", "limit": 5},
        {"query": "", "region": "US", "source": "gmaps", "limit": 5},
    ]
    resp = authed_client.post("/api/batches", json={"items": items})
    assert resp.status_code == 422

    list_resp = authed_client.get("/api/jobs")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 0


def test_jobs_filter_by_batch_id(authed_client, local_mode, no_auto_start):
    resp1 = authed_client.post(
        "/api/batches",
        json={
            "items": [
                {"query": "plumber", "region": "GB", "source": "gmaps", "limit": 5}
            ]
        },
    )
    assert resp1.status_code == 202
    batch1_id = resp1.json()["batch_id"]

    resp2 = authed_client.post(
        "/api/batches",
        json={
            "items": [
                {"query": "electrician", "region": "US", "source": "gmaps", "limit": 5}
            ]
        },
    )
    assert resp2.status_code == 202
    batch2_id = resp2.json()["batch_id"]

    filtered = authed_client.get(f"/api/jobs?batch_id={batch1_id}")
    assert filtered.status_code == 200
    data = filtered.json()
    assert data["total"] == 1
    assert data["jobs"][0]["batch_id"] == batch1_id
    assert data["jobs"][0]["query"] == "plumber"
