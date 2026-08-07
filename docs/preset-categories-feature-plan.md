# Feature Specification & Implementation Plan: Eden-Style Curated Preset Categories

## Overview
This document specifies the design, requirements, and step-by-step implementation plan for adding **Eden-style Curated Preset Categories** to the Discover application. 

Preset categories allow creators to filter outlier videos based on strategic business criteria (channel subscriber tier, viral surge multiplier, recency, and performance bounds) with a single click.

---

## Visual Reference & Category Definitions

Below are the 5 core preset categories identified from Eden ([app.eden.so](https://app.eden.so/)), along with their exact UI tooltips and business logic definitions.

### 1. 🚀 Breakouts
![Breakouts](file:///home/hassan/Desktop/programming/discover/docs/images/breakouts.png)

> **Tooltip Text**: `Under-50K creators whose recent posts did 5x+ their usual numbers`

* **Target Audience**: Mid-tier rising stars and fast-growing channels.
* **Filter Rules**:
  * Creator subscriber count: `subscriber_count <= 50,000`
  * Outlier score multiplier: `score >= 5.0` ($5\times$ channel average)
  * Publication age: `age_in_days <= 180` (Optional recency window)

---

### 2. 💎 Hidden Gems
![Hidden gems](file:///home/hassan/Desktop/programming/discover/docs/images/hidden-gems.png)

> **Tooltip Text**: `Tiny accounts (under 20K) with posts that did 10x+ their usual reach`

* **Target Audience**: Uncovering raw viral ideas that succeeded purely on thumbnail/title concept quality rather than existing brand authority.
* **Filter Rules**:
  * Creator subscriber count: `subscriber_count <= 20,000`
  * Outlier score multiplier: `score >= 10.0` ($10\times$ channel average)
  * Publication age: No limit

---

### 3. ⚖️ Proven at Scale
![Proven at scale](file:///home/hassan/Desktop/programming/discover/docs/images/proven-at-scale.png)

> **Tooltip Text**: `100K–1M creators' overperformers — ideas validated on a big audience`

* **Target Audience**: Ideas validated on established, medium-to-large audiences.
* **Filter Rules**:
  * Creator subscriber count: `100,000 <= subscriber_count <= 1,000,000`
  * Outlier score multiplier: `score >= 2.0` ($2\times$ channel average)
  * Publication age: No limit

---

### 4. 🔥 Viral Now
![Viral now](file:///home/hassan/Desktop/programming/discover/docs/images/viral-now.png)

> **Tooltip Text**: `The biggest overperformers of the last 30 days — at least 500 likes (50K views where views count)`

* **Target Audience**: Real-time trending topics and viral formats to capitalize on right now.
* **Filter Rules**:
  * Publication age: `age_in_days <= 30`
  * Outlier score multiplier: `score >= 3.0`
  * Engagement threshold: `view_count >= 50,000` OR `like_count >= 500`

---

### 5. 👑 All-Time Greats
![All-time greats](file:///home/hassan/Desktop/programming/discover/docs/images/all-time-greats.png)

> **Tooltip Text**: `The best-performing reference posts ever indexed — no date limit`

* **Target Audience**: Evergreen masterclass videos for long-term inspiration.
* **Filter Rules**:
  * Time range: All time (`time_range = "all"`)
  * Ordering: Primary sort by `score` descending across the global database.

---

## System Architecture & Data Requirements

### 1. Subscriber Count Integration
Currently, channel metadata (including `subscriber_count`) is stored in [channels_metadata_cache.json](file:///home/hassan/Desktop/programming/discover/discover_api/youtube/cache/channels_metadata_cache.json).
When building the outlier dataset in `calculate_all_cached_outliers()`, each video object must be enriched with `subscriber_count` from the channel metadata.

### 2. Backend API Endpoint Changes
Target file: [outliers.py](file:///home/hassan/Desktop/programming/discover/discover_api/routes/outliers.py)

Add optional `preset` query parameter to `/api/youtube/all-outliers`:
```python
@router.get("/all-outliers")
def get_all_outliers(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    preset: Optional[str] = Query(None, description="Preset filter: breakouts, hidden_gems, proven_at_scale, viral_now, all_time_greats"),
    search: Optional[str] = Query(None),
    min_outlier: Optional[float] = Query(None),
    days: Optional[float] = Query(None),
    time_range: Optional[str] = Query(None),
    sort_by: str = Query("outlierScore"),
    exclude_shorts: bool = Query(False),
    list_id: Optional[str] = Query(None, alias="list")
):
```

### 3. Outlier Logic Implementation
Target file: [fetch_outliers.py](file:///home/hassan/Desktop/programming/discover/discover_api/youtube/fetch_outliers.py)

Modify `calculate_all_cached_outliers(...)`:
1. Load `channels_metadata_cache.json` into a lookup dictionary keyed by `channel_id`.
2. Attach `subscriber_count` to each video dictionary output.
3. Apply preset filtering logic before pagination:

```python
if preset:
    preset_lower = preset.lower()
    if preset_lower == "breakouts":
        all_outliers = [
            v for v in all_outliers 
            if (v.get("subscriber_count") or 0) <= 50000 and v["score"] >= 5.0
        ]
    elif preset_lower == "hidden_gems":
        all_outliers = [
            v for v in all_outliers 
            if (v.get("subscriber_count") or 0) <= 20000 and v["score"] >= 10.0
        ]
    elif preset_lower == "proven_at_scale":
        all_outliers = [
            v for v in all_outliers 
            if 100000 <= (v.get("subscriber_count") or 0) <= 1000000 and v["score"] >= 2.0
        ]
    elif preset_lower == "viral_now":
        all_outliers = [
            v for v in all_outliers 
            if v["age_in_days"] <= 30 and v["score"] >= 3.0 and (v.get("view_count", 0) >= 50000 or v.get("like_count", 0) >= 500)
        ]
    elif preset_lower == "all_time_greats":
        all_outliers.sort(key=lambda x: x["score"], reverse=True)
```

---

## Frontend UI Components

### 1. PresetPills Component
Target file: `discover/app/components/PresetPills.tsx` (New Component)

* Render interactive pill buttons for each preset with icons (`🚀 Breakouts`, `💎 Hidden gems`, `⚖️ Proven at scale`, `🔥 Viral now`, `👑 All-time greats`).
* Include custom hover tooltips explaining each preset's exact criteria.
* Support active/inactive states connected to `activePreset` state in `page.tsx`.

### 2. Main Discover Page Integration
Target file: [page.tsx](file:///home/hassan/Desktop/programming/discover/discover/app/page.tsx)

* Add state `const [activePreset, setActivePreset] = useState<string | null>(null);`
* Pass `activePreset` parameter to the `/api/youtube/all-outliers` fetch query.
* Reset active preset when user performs custom manual searches or clear operations.

---

## Verification & Testing Plan

1. **API Endpoint Verification**:
   ```bash
   # Test Breakouts preset
   curl "http://localhost:8000/api/youtube/all-outliers?preset=breakouts"
   
   # Test Hidden Gems preset
   curl "http://localhost:8000/api/youtube/all-outliers?preset=hidden_gems"
   
   # Test Viral Now preset
   curl "http://localhost:8000/api/youtube/all-outliers?preset=viral_now"
   ```

2. **Frontend UI Verification**:
   * Verify pill button click updates active state.
   * Verify tooltip popover appears on hover.
   * Verify video grid re-renders with filtered videos matching the preset criteria.
