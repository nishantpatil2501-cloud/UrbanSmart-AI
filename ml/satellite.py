import datetime
import requests
from fastapi import FastAPI, APIRouter, Query, HTTPException

STAC_SEARCH_URL = "https://stac.dataspace.copernicus.eu/v1/search"

router = APIRouter(prefix="/satellite", tags=["satellite"])

def extract_tile_id(scene_id: str, props: dict) -> str:
    """Extracts Sentinel-2 MGRS tile ID from scene ID (e.g., T43QCA) or metadata properties."""
    for part in scene_id.split("_"):
        if part.startswith("T") and len(part) == 6:
            return part
    return props.get("s2:mgrs_tile", props.get("grid:code", "UNKNOWN"))

def search_copernicus_stac(lat: float, lon: float, days: int = 60):
    """
    Queries Copernicus Data Space STAC API for Sentinel-2 L2A scenes around (lat, lon).
    Sorts newest first and prefers lower cloud cover.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    start_date = now - datetime.timedelta(days=days)

    start_str = start_date.strftime("%Y-%m-%dT%H:%M:%SZ")
    now_str = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    date_range = f"{start_str}/{now_str}"

    bbox = [lon - 0.05, lat - 0.05, lon + 0.05, lat + 0.05]

    payload = {
        "collections": ["sentinel-2-l2a"],
        "bbox": bbox,
        "datetime": date_range,
        "limit": 50
    }

    try:
        response = requests.post(STAC_SEARCH_URL, json=payload, timeout=15)
        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Copernicus STAC API HTTP {response.status_code}: {response.text[:200]}"
            )

        data = response.json()
        features = data.get("features", [])

        if not features:
            raise HTTPException(
                status_code=404,
                detail=f"No Sentinel-2 L2A scenes found within {days} days for lat={lat}, lon={lon}."
            )

        candidates = []
        for feat in features:
            props = feat.get("properties", {})
            scene_id = feat.get("id", "")
            tile_id = extract_tile_id(scene_id, props)
            cloud_cover = float(props.get("eo:cloud_cover", props.get("cloud_cover", 100.0)))
            dt_str = props.get("datetime", "")

            dt_obj = None
            if dt_str:
                try:
                    dt_obj = datetime.datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
                except ValueError:
                    dt_obj = datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)
            else:
                dt_obj = datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)

            candidates.append({
                "scene_id": scene_id,
                "tile_id": tile_id,
                "datetime": dt_str,
                "cloud_cover": cloud_cover,
                "bbox": feat.get("bbox"),
                "geometry": feat.get("geometry"),
                "_sort_dt": dt_obj
            })

        # Newest first, then lowest cloud cover
        candidates.sort(key=lambda c: (-c["_sort_dt"].timestamp(), c["cloud_cover"]))

        best_scene = candidates[0]
        del best_scene["_sort_dt"]

        return {
            "status": "success",
            "search_params": {
                "latitude": lat,
                "longitude": lon,
                "days": days,
                "collection": "sentinel-2-l2a"
            },
            "total_scenes_found": len(candidates),
            "scene": best_scene
        }

    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to communicate with Copernicus STAC API: {str(e)}"
        )

def find_satellite_pair(lat: float, lon: float):
    """
    Finds a bi-temporal BEFORE and CURRENT satellite scene pair for change detection.
    Rules:
    - Prefer cloud cover <= 20%.
    - If unavailable, allow <= 40%.
    - BEFORE and CURRENT must use the same Sentinel-2 tile when possible.
    - CURRENT must be newer than BEFORE.
    """
    bbox = [lon - 0.05, lat - 0.05, lon + 0.05, lat + 0.05]
    payload = {
        "collections": ["sentinel-2-l2a"],
        "bbox": bbox,
        "limit": 100
    }

    try:
        response = requests.post(STAC_SEARCH_URL, json=payload, timeout=20)
        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Copernicus STAC API HTTP {response.status_code}: {response.text[:200]}"
            )

        data = response.json()
        features = data.get("features", [])

        if not features:
            raise HTTPException(
                status_code=404,
                detail=f"No Sentinel-2 L2A scenes found for lat={lat}, lon={lon}."
            )

        parsed = []
        for feat in features:
            props = feat.get("properties", {})
            scene_id = feat.get("id", "")
            tile_id = extract_tile_id(scene_id, props)
            cloud_cover = float(props.get("eo:cloud_cover", props.get("cloud_cover", 100.0)))
            dt_str = props.get("datetime", "")

            dt_obj = None
            if dt_str:
                try:
                    dt_obj = datetime.datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
                except ValueError:
                    dt_obj = datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)
            else:
                dt_obj = datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)

            parsed.append({
                "scene_id": scene_id,
                "tile_id": tile_id,
                "datetime": dt_str,
                "cloud_cover": cloud_cover,
                "bbox": feat.get("bbox"),
                "geometry": feat.get("geometry"),
                "_dt_obj": dt_obj
            })

        # Group by tile_id to ensure matching Sentinel-2 tile
        tile_groups = {}
        for item in parsed:
            t_id = item["tile_id"]
            if t_id not in tile_groups:
                tile_groups[t_id] = []
            tile_groups[t_id].append(item)

        best_tile_id = max(tile_groups.keys(), key=lambda t: len(tile_groups[t]))
        tile_scenes = tile_groups[best_tile_id]

        # Apply Cloud Cover thresholds (<=20% preferred, then <=40%)
        tier_20 = [s for s in tile_scenes if s["cloud_cover"] <= 20.0]
        tier_40 = [s for s in tile_scenes if s["cloud_cover"] <= 40.0]

        if len(tier_20) >= 2:
            candidate_pool = tier_20
        elif len(tier_40) >= 2:
            candidate_pool = tier_40
        else:
            candidate_pool = sorted(tile_scenes, key=lambda s: s["cloud_cover"])

        # Sort candidate pool by datetime descending
        candidate_pool.sort(key=lambda s: s["_dt_obj"], reverse=True)

        if len(candidate_pool) < 2:
            raise HTTPException(
                status_code=404,
                detail=f"Insufficient suitable satellite passes found for lat={lat}, lon={lon} to form a pair."
            )

        current_scene = dict(candidate_pool[0])
        older_candidates = []
        for s in candidate_pool:
            if s["scene_id"] != current_scene["scene_id"] and s["_dt_obj"] < current_scene["_dt_obj"]:
                diff_days = (current_scene["_dt_obj"] - s["_dt_obj"]).days
                if diff_days >= 180:
                    older_candidates.append(s)

        if not older_candidates:
            raise HTTPException(
                status_code=404,
                detail=f"Could not find a distinct BEFORE scene older than CURRENT for lat={lat}, lon={lon}."
            )

        before_scene = dict(older_candidates[0])

        del current_scene["_dt_obj"]
        del before_scene["_dt_obj"]

        return {
            "status": "success",
            "search_params": {
                "latitude": lat,
                "longitude": lon,
                "collection": "sentinel-2-l2a",
                "tile_id": best_tile_id
            },
            "same_tile": current_scene["tile_id"] == before_scene["tile_id"],
            "current": current_scene,
            "before": before_scene
        }

    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to communicate with Copernicus STAC API: {str(e)}"
        )

@router.get("/search")
def search_satellite(
    lat: float = Query(..., description="Latitude of target area"),
    lon: float = Query(..., description="Longitude of target area"),
    days: int = Query(60, ge=1, le=365, description="Search window in days")
):
    return search_copernicus_stac(lat, lon, days)

@router.get("/pair")
def get_satellite_pair(
    lat: float = Query(..., description="Latitude of target area"),
    lon: float = Query(..., description="Longitude of target area")
):
    return find_satellite_pair(lat, lon)

# Standalone app instance if running ml/satellite.py directly
app = FastAPI(
    title="Copernicus Satellite Search & Pairing API",
    description="STAC search and bi-temporal pairing for Sentinel-2 L2A scenes",
    version="1.0.0"
)
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
