from fastapi import APIRouter
from api.v1.endpoints import signup

router = APIRouter()

router.include_router(signup.app, prefix="/auth", tags=["Auth"])
