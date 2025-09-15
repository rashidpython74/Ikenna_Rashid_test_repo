from fastapi import FastAPI
from api.v1 import routes

app = FastAPI()

app.include_router(routes.router)
