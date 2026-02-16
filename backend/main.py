from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
try:
    from simulation import SimulationEngine
except ImportError:
    from backend.simulation import SimulationEngine

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

simulation = SimulationEngine()

# Request models
class AttackRequest(BaseModel):
    type: str = None
    sophistication: str = "medium"  # low, medium, high

class ParamsUpdate(BaseModel):
    params: dict

class VehicleUpdate(BaseModel):
    vehicle_id: str
    updates: dict

@app.get("/")
async def root():
    return {"message": "V2X Security Simulation API"}

@app.post("/control/start")
async def start_simulation():
    simulation.start()
    return {"status": "started"}

@app.post("/control/stop")
async def stop_simulation():
    simulation.stop()
    return {"status": "stopped"}

@app.post("/control/reset")
async def reset_simulation():
    simulation.reset()
    return {"status": "reset"}

@app.post("/control/attack")
async def set_attack(request: AttackRequest):
    simulation.set_attack(request.type, request.sophistication)
    return {"status": "attack_set", "type": request.type, "sophistication": request.sophistication}

@app.post("/control/params")
async def update_params(request: ParamsUpdate):
    simulation.update_params(request.params)
    return {"status": "updated", "params": simulation.params}

@app.post("/control/vehicle")
async def update_vehicle(request: VehicleUpdate):
    simulation.update_vehicle(request.vehicle_id, request.updates)
    return {"status": "updated"}

@app.get("/presets")
async def get_presets():
    return {
        "scenarios": [
            {
                "id": "normal",
                "name": "Normal Traffic",
                "description": "Regular traffic flow without attacks",
                "params": {"global_speed_multiplier": 1.0, "detection_sensitivity": 0.7}
            },
            {
                "id": "heavy",
                "name": "Heavy Traffic",
                "description": "Dense traffic with many V2V interactions",
                "params": {"global_speed_multiplier": 0.5, "communication_range": 0.008}
            },
            {
                "id": "highspeed",
                "name": "Highway Mode",
                "description": "High-speed traffic simulation",
                "params": {"global_speed_multiplier": 2.0, "detection_sensitivity": 0.5}
            },
            {
                "id": "attack_demo",
                "name": "Attack Demo",
                "description": "Pre-configured attack scenario",
                "params": {"detection_sensitivity": 0.9},
                "attack": "sybil"
            }
        ]
    }

@app.post("/presets/{preset_id}")
async def load_preset(preset_id: str):
    presets = {
        "normal": {"params": {"global_speed_multiplier": 1.0}, "attack": None},
        "heavy": {"params": {"global_speed_multiplier": 0.5, "communication_range": 0.008}, "attack": None},
        "highspeed": {"params": {"global_speed_multiplier": 2.0}, "attack": None},
        "attack_demo": {"params": {"detection_sensitivity": 0.9}, "attack": "sybil"}
    }
    
    if preset_id in presets:
        preset = presets[preset_id]
        simulation.update_params(preset["params"])
        simulation.set_attack(preset["attack"])
        return {"status": "loaded", "preset": preset_id}
    
    return {"status": "error", "message": "Preset not found"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            if simulation.is_running:
                data = simulation.step()
                await websocket.send_json(data)
                await asyncio.sleep(0.1)  # 10 FPS
            else:
                await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        print("Client disconnected")
