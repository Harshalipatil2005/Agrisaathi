from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, reports, admin, chat, eco_map, vision, biogas, crop_health, supply_chain, tracking, soil_lab, schemes, equipment, messages, bookings, market_trends

app = FastAPI(title="Hackathon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(eco_map.router)
app.include_router(vision.router)
app.include_router(biogas.router)
app.include_router(crop_health.router)
app.include_router(supply_chain.router)
app.include_router(tracking.router)
app.include_router(soil_lab.router)
app.include_router(schemes.router)
app.include_router(equipment.router)
app.include_router(messages.router)
app.include_router(bookings.router)
app.include_router(market_trends.router)

@app.get("/")
async def root():
    return {"message": "API is running!"}