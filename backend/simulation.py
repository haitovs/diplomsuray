import random
import time
import math
import networkx as nx
import asyncio
from fastapi import FastAPI, WebSocket, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any

# Vehicle type definitions
VEHICLE_TYPES = {
    "passenger": {"max_speed": 120, "acceleration": 5, "color": "blue", "trust": 0.9, "icon": "car"},
    "truck": {"max_speed": 90, "acceleration": 3, "color": "green", "trust": 0.85, "icon": "truck"},
    "emergency": {"max_speed": 150, "acceleration": 8, "color": "red", "trust": 0.95, "icon": "emergency"},
    "bus": {"max_speed": 80, "acceleration": 2, "color": "orange", "trust": 0.88, "icon": "bus"},
}

class SimulationEngine:
    def __init__(self):
        self.is_running = False
        self.step_count = 0
        self.active_attack = None
        self.v2v_messages = []
        self.anomaly_detections = []
        
        # Map bounds (approx 2km x 2km)
        self.bounds = {
            "lat_min": 40.7000,
            "lat_max": 40.7200,
            "lon_min": -74.0200,
            "lon_max": -74.0000
        }
        
        # Initialize Road Network & Traffic Lights
        self.road_graph = self._create_advanced_road_network()
        self.traffic_lights = self._init_traffic_lights()
        self.vehicles = self._generate_initial_vehicles(count=30)
        
        # Simulation parameters
        self.params = {
            "global_speed_multiplier": 5.0,
            "message_frequency": 1.0,
            "detection_sensitivity": 0.7,
            "communication_range": 0.005
        }

    def _create_advanced_road_network(self):
        """Create a more complex city-like road network"""
        G = nx.DiGraph()
        
        # Create a grid with some randomness
        rows = 6
        cols = 6
        
        lat_step = (self.bounds["lat_max"] - self.bounds["lat_min"]) / (rows - 1)
        lon_step = (self.bounds["lon_max"] - self.bounds["lon_min"]) / (cols - 1)
        
        # Add nodes
        for r in range(rows):
            for c in range(cols):
                node_id = f"n_{r}_{c}"
                # Add slight jitter
                jitter_lat = random.uniform(-lat_step * 0.1, lat_step * 0.1)
                jitter_lon = random.uniform(-lon_step * 0.1, lon_step * 0.1)
                
                lat = self.bounds["lat_min"] + r * lat_step + jitter_lat
                lon = self.bounds["lon_min"] + c * lon_step + jitter_lon
                
                # Clamp
                lat = max(self.bounds["lat_min"], min(self.bounds["lat_max"], lat))
                lon = max(self.bounds["lon_min"], min(self.bounds["lon_max"], lon))
                
                G.add_node(node_id, pos=(lat, lon))
        
        # Add edges (Grid structure)
        for r in range(rows):
            for c in range(cols):
                curr = f"n_{r}_{c}"
                
                # Horizontal
                if c < cols - 1:
                    next_node = f"n_{r}_{c+1}"
                    if random.random() < 0.95: # More connectivity
                        G.add_edge(curr, next_node)
                        G.add_edge(next_node, curr)
                
                # Vertical
                if r < rows - 1:
                    next_node = f"n_{r+1}_{c}"
                    if random.random() < 0.95:
                        G.add_edge(curr, next_node)
                        G.add_edge(next_node, curr)
                        
        return G

    def _init_traffic_lights(self):
        """Initialize traffic lights at intersections"""
        lights = {}
        for node in self.road_graph.nodes():
            # Only put lights at nodes with >= 3 neighbors (intersections)
            if len(list(self.road_graph.neighbors(node))) >= 3:
                lights[node] = {
                    "state": random.choice(["red", "green"]),
                    "timer": random.randint(0, 100)
                }
        return lights

    def _generate_initial_vehicles(self, count=30):
        vehicles = []
        types = list(VEHICLE_TYPES.keys())
        nodes = list(self.road_graph.nodes())
        
        for i in range(count):
            vtype = random.choice(types)
            if random.random() < 0.4: vtype = "truck"
                
            config = VEHICLE_TYPES[vtype]
            start_node = random.choice(nodes)
            
            end_node = start_node
            path = []
            attempts = 0
            while (end_node == start_node or not path) and attempts < 10:
                end_node = random.choice(nodes)
                path = self._get_path(start_node, end_node)
                attempts += 1
            
            if not path: continue
            
            pos = self.road_graph.nodes[start_node]["pos"]
            
            vehicles.append({
                "id": f"v_{i}",
                "type": vtype,
                "lat": pos[0],
                "lon": pos[1],
                "speed": 0,
                "heading": 0,
                "trust_score": config["trust"],
                "is_attacker": False,
                "max_speed": config["max_speed"],
                "color": config["color"],
                "messages_sent": 0,
                "messages_received": 0,
                "anomalies_detected": 0,
                "current_node": start_node,
                "target_node": path[1] if len(path) > 1 else start_node,
                "destination": end_node,
                "path": path,
                "status": "moving",
                "progress": 0.0,
                "hack_progress": 0.0,
                "target_vehicle": None,
                "waiting_at_light": False
            })
        
        # Add Hackers
        attacker_count = 3
        for i in range(attacker_count):
            if i < len(vehicles):
                vehicles[i]["is_attacker"] = True
                vehicles[i]["trust_score"] = 0.3
                vehicles[i]["color"] = "red"
                vehicles[i]["type"] = "hacker"
            
        return vehicles

    def _get_path(self, start, end):
        try:
            return nx.shortest_path(self.road_graph, start, end)
        except:
            return []

    def start(self):
        self.is_running = True

    def stop(self):
        self.is_running = False

    def reset(self):
        self.is_running = False
        self.step_count = 0
        self.active_attack = None
        self.v2v_messages = []
        self.anomaly_detections = []
        self.road_graph = self._create_advanced_road_network()
        self.traffic_lights = self._init_traffic_lights()
        self.vehicles = self._generate_initial_vehicles(count=30)

    def set_attack(self, attack_type):
        self.active_attack = attack_type
        if not attack_type:
            # Clear attack state immediately
            for v in self.vehicles:
                v["target_vehicle"] = None
                v["hack_progress"] = 0
        else:
            print(f"[ATTACK] {attack_type} attack activated!")

    def update_params(self, params):
        self.params.update(params)

    def update_vehicle(self, vehicle_id, updates):
        for v in self.vehicles:
            if v["id"] == vehicle_id:
                v.update(updates)
                break

    def get_current_state(self):
        road_data = {
            "nodes": {n: self.road_graph.nodes[n]["pos"] for n in self.road_graph.nodes},
            "edges": list(self.road_graph.edges),
            "lights": self.traffic_lights
        }
        return {
            "step": self.step_count,
            "vehicles": self.vehicles,
            "messages": [],
            "v2v_communications": self.v2v_messages,
            "anomalies": self.anomaly_detections,
            "active_attack": self.active_attack,
            "params": self.params,
            "bounds": self.bounds,
            "roads": road_data
        }

    def step(self):
        self.step_count += 1
        messages = []
        self.v2v_messages = []
        new_anomalies = []
        
        # Update Traffic Lights (every 100 steps ~ 10 seconds)
        for node, light in self.traffic_lights.items():
            light["timer"] += 1
            if light["timer"] > 100:
                light["timer"] = 0
                light["state"] = "green" if light["state"] == "red" else "red"

        # Update vehicle positions
        for v in self.vehicles:
            if v["status"] == "stopped":
                continue
                
            # Hacker Logic
            if v["is_attacker"] and self.active_attack:
                # Find target
                if not v["target_vehicle"]:
                    nearby = []
                    for target in self.vehicles:
                        if not target["is_attacker"] and target["status"] == "moving":
                            dist = self._distance(v, target)
                            if dist < self.params["communication_range"]:
                                nearby.append(target)
                    if nearby:
                        v["target_vehicle"] = random.choice(nearby)["id"]
                        v["hack_progress"] = 0.0
                
                # Hack target
                if v["target_vehicle"]:
                    target = next((t for t in self.vehicles if t["id"] == v["target_vehicle"]), None)
                    if target and target["status"] == "moving":
                        dist = self._distance(v, target)
                        if dist < self.params["communication_range"] * 1.2:
                            v["hack_progress"] += 3.5 
                            if v["hack_progress"] >= 100:
                                target["status"] = "stopped"
                                target["speed"] = 0
                                v["target_vehicle"] = None
                                v["hack_progress"] = 0
                                new_anomalies.append({
                                    "id": f"a_{self.step_count}_{target['id']}",
                                    "timestamp": time.time(),
                                    "sender": v["id"],
                                    "type": self.active_attack,
                                    "reason": "Vehicle HACKED and STOPPED",
                                    "severity": "high"
                                })
                        else:
                            v["target_vehicle"] = None
                            v["hack_progress"] = 0
                    else:
                        v["target_vehicle"] = None
                        v["hack_progress"] = 0
            else:
                v["target_vehicle"] = None
                v["hack_progress"] = 0

            # Movement Logic
            if v["status"] == "moving":
                self._move_vehicle(v)

            # Generate V2X Message
            if self.step_count % int(10 / self.params["message_frequency"]) == 0:
                msg = {
                    "id": f"msg_{self.step_count}_{v['id']}",
                    "sender_id": v["id"],
                    "type": "BSM",
                    "timestamp": time.time(),
                    "lat": v["lat"],
                    "lon": v["lon"],
                    "speed": v["speed"],
                    "heading": v["heading"]
                }
                messages.append(msg)
                
                is_anomaly, reason = self._detect_anomaly(msg)
                if is_anomaly:
                    new_anomalies.append({
                        "id": f"a_{self.step_count}_{v['id']}",
                        "timestamp": time.time(),
                        "sender": v["id"],
                        "type": self.active_attack if v["is_attacker"] else "unknown",
                        "reason": reason,
                        "severity": "high" if v["is_attacker"] else "medium"
                    })

        # V2V Communication
        for i, v1 in enumerate(self.vehicles):
            for v2 in self.vehicles[i+1:]:
                dist = self._distance(v1, v2)
                if dist < self.params["communication_range"]:
                    self.v2v_messages.append({
                        "from": v1["id"],
                        "to": v2["id"],
                        "type": "BSM",
                        "distance": dist
                    })
                    v1["messages_received"] += 1
                    v2["messages_received"] += 1

        self.anomaly_detections = new_anomalies[-10:]

        road_data = {
            "nodes": {n: self.road_graph.nodes[n]["pos"] for n in self.road_graph.nodes},
            "edges": list(self.road_graph.edges),
            "lights": self.traffic_lights
        }

        return {
            "step": self.step_count,
            "vehicles": self.vehicles,
            "messages": messages,
            "v2v_communications": self.v2v_messages,
            "anomalies": self.anomaly_detections,
            "active_attack": self.active_attack,
            "params": self.params,
            "bounds": self.bounds,
            "roads": road_data
        }

    def _move_vehicle(self, v):
        # Check Traffic Light at current target node
        if v["progress"] > 0.8: # Approaching intersection
            if v["target_node"] in self.traffic_lights:
                light = self.traffic_lights[v["target_node"]]
                if light["state"] == "red":
                    v["waiting_at_light"] = True
                    return # Stop moving
        
        v["waiting_at_light"] = False

        # Get current edge coordinates
        start_pos = self.road_graph.nodes[v["current_node"]]["pos"]
        end_pos = self.road_graph.nodes[v["target_node"]]["pos"]
        
        edge_dist = math.sqrt((end_pos[0] - start_pos[0])**2 + (end_pos[1] - start_pos[1])**2)
        
        speed_kmh = v["max_speed"] * 0.6
        speed_deg_per_sec = (speed_kmh / 111) / 3600
        
        move_dist = speed_deg_per_sec * 0.1 * self.params["global_speed_multiplier"] * 10
        
        v["speed"] = speed_kmh
        
        if edge_dist > 0:
            step_progress = move_dist / edge_dist
            v["progress"] += step_progress
        else:
            v["progress"] = 1.0
        
        # Update position
        if v["progress"] >= 1.0:
            # Reached target node
            v["current_node"] = v["target_node"]
            v["lat"] = end_pos[0]
            v["lon"] = end_pos[1]
            v["progress"] = 0.0
            
            # Check if reached destination
            if v["current_node"] == v["destination"]:
                v["status"] = "arrived"
                nodes = list(self.road_graph.nodes())
                v["destination"] = random.choice(nodes)
                v["path"] = self._get_path(v["current_node"], v["destination"])
                if len(v["path"]) > 1:
                    v["target_node"] = v["path"][1]
                    v["status"] = "moving"
            else:
                try:
                    current_idx = v["path"].index(v["current_node"])
                    if current_idx + 1 < len(v["path"]):
                        v["target_node"] = v["path"][current_idx + 1]
                    else:
                        v["path"] = self._get_path(v["current_node"], v["destination"])
                        v["target_node"] = v["path"][1] if len(v["path"]) > 1 else v["current_node"]
                except ValueError:
                     v["path"] = self._get_path(v["current_node"], v["destination"])
                     v["target_node"] = v["path"][1] if len(v["path"]) > 1 else v["current_node"]
                     
            # Update heading
            new_end_pos = self.road_graph.nodes[v["target_node"]]["pos"]
            dy = new_end_pos[0] - v["lat"]
            dx = new_end_pos[1] - v["lon"]
            v["heading"] = math.degrees(math.atan2(dx, dy)) % 360
            
        else:
            v["lat"] = start_pos[0] + (end_pos[0] - start_pos[0]) * v["progress"]
            v["lon"] = start_pos[1] + (end_pos[1] - start_pos[1]) * v["progress"]
            
            dy = end_pos[0] - start_pos[0]
            dx = end_pos[1] - start_pos[1]
            v["heading"] = math.degrees(math.atan2(dx, dy)) % 360

    def _detect_anomaly(self, msg):
        is_anomaly = False
        reason = None
        
        if msg["speed"] > 200:
            is_anomaly = True
            reason = f"Impossible speed: {msg['speed']:.0f} km/h"
        
        if msg["timestamp"] < time.time() - 10:
            is_anomaly = True
            reason = "Replayed message (old timestamp)"
            
        return is_anomaly, reason

    def _distance(self, v1, v2):
        return math.sqrt((v1["lat"] - v2["lat"])**2 + (v1["lon"] - v2["lon"])**2)

    def _check_boundaries(self, vehicle):
        pass

# --- FastAPI App ---

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sim = SimulationEngine()

class AttackRequest(BaseModel):
    type: Optional[str] = None

class ParamsRequest(BaseModel):
    params: Dict[str, Any]

class VehicleUpdate(BaseModel):
    vehicle_id: str
    updates: Dict[str, Any]

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            if sim.is_running:
                state = sim.step()
                await websocket.send_json(state)
                await asyncio.sleep(0.1) # 10 FPS
            else:
                # Send current state even if paused
                state = sim.get_current_state()
                await websocket.send_json(state)
                await asyncio.sleep(0.5)
    except Exception as e:
        print(f"WebSocket error: {e}")

@app.post("/control/start")
def start_simulation():
    sim.start()
    return {"status": "started"}

@app.post("/control/stop")
def stop_simulation():
    sim.stop()
    return {"status": "stopped"}

@app.post("/control/reset")
def reset_simulation():
    sim.reset()
    return {"status": "reset"}

@app.post("/control/attack")
def trigger_attack(req: AttackRequest):
    sim.set_attack(req.type)
    return {"status": "attack_set", "type": req.type}

@app.post("/control/params")
def update_params(req: ParamsRequest):
    sim.update_params(req.params)
    return {"status": "params_updated"}

@app.post("/control/vehicle")
def update_vehicle(req: VehicleUpdate):
    sim.update_vehicle(req.vehicle_id, req.updates)
    return {"status": "vehicle_updated"}

@app.get("/presets")
def get_presets():
    return {"scenarios": [
        {"id": "city_center", "name": "City Center", "description": "Busy downtown traffic with many intersections"},
        {"id": "highway", "name": "Highway", "description": "High speed flow with fewer stops"},
        {"id": "suburbs", "name": "Suburbs", "description": "Low density residential area"}
    ]}

@app.post("/presets/{preset_id}")
def load_preset(preset_id: str):
    # For now, just reset. In future, could load specific maps.
    sim.reset()
    return {"status": "preset_loaded", "preset": preset_id}
