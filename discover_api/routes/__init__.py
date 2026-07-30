from fastapi import APIRouter
from .creators import router as creators_router
from .outliers import router as outliers_router
from .videos import router as videos_router
from .lists import router as lists_router
from .thumbnails import router as thumbnails_router
from .discover import router as discover_router

router = APIRouter()
router.include_router(creators_router)
router.include_router(outliers_router)
router.include_router(videos_router)
router.include_router(lists_router)
router.include_router(thumbnails_router)
router.include_router(discover_router)
