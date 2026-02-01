import random
import time
import math
import networkx as nx
import asyncio
from fastapi import FastAPI, WebSocket, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from enum import Enum
from dataclasses import dataclass, asdict
import uuid

# Vehicle type definitions
VEHICLE_TYPES = {
    "passenger": {"max_speed": 120, "acceleration": 5, "color": "blue", "trust": 0.9, "icon": "car"},
    "truck": {"max_speed": 90, "acceleration": 3, "color": "green", "trust": 0.85, "icon": "truck"},
    "emergency": {"max_speed": 150, "acceleration": 8, "color": "red", "trust": 0.95, "icon": "emergency"},
    "bus": {"max_speed": 80, "acceleration": 2, "color": "orange", "trust": 0.88, "icon": "bus"},
}

# ===== REALISTIC V2X ATTACK TYPES =====
ATTACK_TYPES = {
    "position_falsification": {
        "name": "Position Falsification Attack",
        "category": "message_manipulation",
        "description": "Attacker reports false GPS coordinates in BSM messages, appearing to be in a different location than actual position.",
        "severity": "high",
        "real_world_example": "An attacker could appear to be blocking a lane, causing other vehicles to unnecessarily brake or change lanes.",
        "target_layer": ["application"],
        "educational_notes": "This is one of the most common V2X attacks. Position data is critical for collision avoidance and traffic management.",
        "icon": "📍",
        "sophistication_levels": {
            "low": {"description": "Random positions, easily detected", "bypass_chance": 0.1},
            "medium": {"description": "Nearby positions with realistic movement patterns", "bypass_chance": 0.4},
            "high": {"description": "Gradual position drift, difficult to detect", "bypass_chance": 0.7}
        }
    },
    "gps_spoofing": {
        "name": "GPS Spoofing Attack",
        "category": "sensor_manipulation",
        "description": "Systematic manipulation of GPS signals to make vehicles believe they are in incorrect locations.",
        "severity": "critical",
        "real_world_example": "In 2013, researchers spoofed GPS on a yacht, causing navigation errors. Similar attacks could target V2X systems.",
        "target_layer": ["physical", "application"],
        "educational_notes": "GPS spoofing affects the entire positioning system. Unlike position falsification, this attacks the sensor itself.",
        "icon": "🛰️",
        "sophistication_levels": {
            "low": {"description": "Single-vehicle GPS drift", "bypass_chance": 0.2},
            "medium": {"description": "Coordinated spoofing affecting multiple vehicles", "bypass_chance": 0.5},
            "high": {"description": "Gradual GPS drift mimicking natural errors", "bypass_chance": 0.8}
        }
    },
    "sybil": {
        "name": "Sybil Attack",
        "category": "identity",
        "description": "Attacker creates multiple fake vehicle identities to manipulate traffic information or voting mechanisms.",
        "severity": "high",
        "real_world_example": "Could create fake traffic congestion by simulating many vehicles, affecting routing decisions.",
        "target_layer": ["network", "application"],
        "educational_notes": "Named after a psychiatric case study. In V2X, Sybil attacks can overwhelm consensus mechanisms and create false traffic scenarios.",
        "icon": "👥",
        "sophistication_levels": {
            "low": {"description": "2-3 fake identities at same location", "bypass_chance": 0.15},
            "medium": {"description": "Distributed fake vehicles with basic movement", "bypass_chance": 0.45},
            "high": {"description": "Realistic fake vehicles with coordinated behavior", "bypass_chance": 0.75}
        }
    },
    "message_replay": {
        "name": "Message Replay Attack",
        "category": "message_manipulation",
        "description": "Attacker captures legitimate V2X messages and retransmits them at a later time to create false vehicle presence.",
        "severity": "medium",
        "real_world_example": "Recording a vehicle's BSM near an intersection and replaying it to make the vehicle appear present when it's not.",
        "target_layer": ["application"],
        "educational_notes": "Replay attacks exploit the lack of message freshness verification. Timestamps and nonces are critical defenses.",
        "icon": "🔁",
        "sophistication_levels": {
            "low": {"description": "Old messages with obvious timestamps", "bypass_chance": 0.1},
            "medium": {"description": "Messages from a few seconds ago", "bypass_chance": 0.3},
            "high": {"description": "Timestamp modification with recent messages", "bypass_chance": 0.6}
        }
    },
    "dos_flooding": {
        "name": "Denial of Service (Message Flooding)",
        "category": "network",
        "description": "Attacker floods the V2X network with excessive messages, preventing legitimate communications.",
        "severity": "critical",
        "real_world_example": "In congested areas, message flooding could prevent emergency vehicle warnings from being received.",
        "target_layer": ["network"],
        "educational_notes": "DoS attacks can cause communication delays exceeding safety-critical thresholds (100ms for collision warnings).",
        "icon": "💥",
        "sophistication_levels": {
            "low": {"description": "Simple message spam", "bypass_chance": 0.2},
            "medium": {"description": "Targeted flooding of specific message types", "bypass_chance": 0.5},
            "high": {"description": "Adaptive flooding that evades rate limiting", "bypass_chance": 0.8}
        }
    },
    "velocity_spoofing": {
        "name": "Velocity/Acceleration Spoofing",
        "category": "message_manipulation",
        "description": "Attacker reports false speed and acceleration values to mislead surrounding vehicles.",
        "severity": "high",
        "real_world_example": "Reporting sudden braking when not actually braking could cause rear-end collisions.",
        "target_layer": ["application"],
        "educational_notes": "Speed and acceleration are key for time-to-collision calculations. False data can trigger unnecessary emergency braking.",
        "icon": "⚡",
        "sophistication_levels": {
            "low": {"description": "Impossible speeds (e.g., 500 km/h)", "bypass_chance": 0.05},
            "medium": {"description": "Exaggerated but plausible speeds", "bypass_chance": 0.35},
            "high": {"description": "Subtle speed variations that accumulate", "bypass_chance": 0.65}
        }
    },
    "certificate_replay": {
        "name": "Certificate Replay Attack",
        "category": "cryptographic",
        "description": "Attacker uses expired or revoked certificates to sign V2X messages, attempting to bypass authentication.",
        "severity": "high",
        "real_world_example": "Using a certificate from a decommissioned vehicle to impersonate a legitimate participant.",
        "target_layer": ["application", "cryptographic"],
        "educational_notes": "IEEE 1609.2 requires certificate verification. CRL (Certificate Revocation Lists) must be regularly updated.",
        "icon": "🔐",
        "sophistication_levels": {
            "low": {"description": "Obviously expired certificate", "bypass_chance": 0.1},
            "medium": {"description": "Recently revoked certificate", "bypass_chance": 0.4},
            "high": {"description": "Valid-looking certificate with subtle flaws", "bypass_chance": 0.7}
        }
    },
    "false_emergency": {
        "name": "False Emergency Vehicle Alert",
        "category": "message_manipulation",
        "description": "Attacker broadcasts fake emergency vehicle warnings to clear traffic or cause disruption.",
        "severity": "high",
        "real_world_example": "Fake ambulance alerts could cause unnecessary lane changes, creating dangerous situations.",
        "target_layer": ["application"],
        "educational_notes": "Emergency vehicle preemption is a critical V2X feature. False alerts undermine trust and can cause accidents.",
        "icon": "🚨",
        "sophistication_levels": {
            "low": {"description": "Single fake emergency broadcast", "bypass_chance": 0.25},
            "medium": {"description": "Coordinated fake emergency scenario", "bypass_chance": 0.55},
            "high": {"description": "Gradual emergency vehicle approach simulation", "bypass_chance": 0.75}
        }
    },
    "message_suppression": {
        "name": "Message Suppression (Jamming)",
        "category": "network",
        "description": "Attacker interferes with V2X radio communications to prevent messages from being received.",
        "severity": "critical",
        "real_world_example": "Jamming safety warnings at intersections to cause collisions.",
        "target_layer": ["physical", "network"],
        "educational_notes": "Radio jamming is difficult to defend against purely in software. Requires physical layer security and frequency hopping.",
        "icon": "📡",
        "sophistication_levels": {
            "low": {"description": "Continuous broadband noise", "bypass_chance": 0.3},
            "medium": {"description": "Selective jamming of specific channels", "bypass_chance": 0.6},
            "high": {"description": "Reactive jamming triggered by specific messages", "bypass_chance": 0.85}
        }
    },
    "illusion": {
        "name": "Illusion Attack (Coordinated False Scenario)",
        "category": "message_manipulation",
        "description": "Multiple attackers coordinate to create a completely false traffic scenario (e.g., fake traffic jam).",
        "severity": "critical",
        "real_world_example": "Creating a fake traffic jam on a highway to divert traffic through a specific area.",
        "target_layer": ["application", "network"],
        "educational_notes": "Most dangerous when combining Sybil attacks with coordinated false data. Difficult to detect without external verification.",
        "icon": "🎭",
        "sophistication_levels": {
            "low": {"description": "Uncoordinated false reports", "bypass_chance": 0.2},
            "medium": {"description": "Coordinated false scenario with gaps", "bypass_chance": 0.5},
            "high": {"description": "Perfect illusion with all details consistent", "bypass_chance": 0.9}
        }
    }
}

# ===== DEFENSE MECHANISMS =====
DEFENSE_TYPES = {
    "cryptographic_verification": {
        "name": "Cryptographic Signature Verification",
        "type": "cryptographic",
        "description": "Verifies digital signatures on V2X messages using IEEE 1609.2 certificates and PKI infrastructure.",
        "effectiveness": {"low": 90, "medium": 70, "high": 40},
        "detection_time": 0.05,  # 50ms
        "false_positive_rate": 0.01,
        "educational_notes": "First line of defense. All V2X messages must be signed. Invalid signatures are immediately rejected.",
        "icon": "🔒",
        "applicable_to": ["certificate_replay", "message_replay", "sybil"]
    },
    "plausibility_check": {
        "name": "Plausibility Validation",
        "type": "behavioral",
        "description": "Validates message content against physical laws (speed limits, acceleration ranges, position consistency).",
        "effectiveness": {"low": 95, "medium": 75, "high": 50},
        "detection_time": 0.1,  # 100ms
        "false_positive_rate": 0.05,
        "educational_notes": "Checks if reported data is physically possible. Speed > 200 km/h on city roads or instant teleportation are flagged.",
        "icon": "⚗️",
        "applicable_to": ["position_falsification", "velocity_spoofing", "gps_spoofing", "false_emergency"]
    },
    "trust_management": {
        "name": "Trust & Reputation System",
        "type": "behavioral",
        "description": "Maintains trust scores for each vehicle based on historical behavior. Repeated anomalies reduce trust.",
        "effectiveness": {"low": 60, "medium": 80, "high": 85},
        "detection_time": 2.0,  # 2 seconds
        "false_positive_rate": 0.10,
        "educational_notes": "Long-term defense that builds profiles. Sophisticated attackers maintain high trust initially, then attack.",
        "icon": "⭐",
        "applicable_to": ["position_falsification", "velocity_spoofing", "gps_spoofing", "illusion"]
    },
    "misbehavior_detection": {
        "name": "Intrusion Detection System (IDS)",
        "type": "behavioral",
        "description": "Machine learning-based anomaly detection identifying unusual patterns in V2X communications.",
        "effectiveness": {"low": 85, "medium": 70, "high": 55},
        "detection_time": 0.5,  # 500ms
        "false_positive_rate": 0.15,
        "educational_notes": "Uses statistical models to detect deviations from normal traffic patterns. Can catch novel attacks.",
        "icon": "🛡️",
        "applicable_to": ["dos_flooding", "illusion", "message_suppression", "sybil"]
    },
    "collaborative_verification": {
        "name": "Collaborative Verification (V2V)",
        "type": "collaborative",
        "description": "Cross-validates information with neighboring vehicles to detect inconsistencies.",
        "effectiveness": {"low": 70, "medium": 85, "high": 75},
        "detection_time": 1.0,  # 1 second
        "false_positive_rate": 0.08,
        "educational_notes": "If most vehicles agree on a position but one disagrees, the outlier is suspicious. Requires nearby honest vehicles.",
        "icon": "🤝",
        "applicable_to": ["position_falsification", "gps_spoofing", "sybil", "illusion"]
    },
    "rate_limiting": {
        "name": "Rate Limiting & Throttling",
        "type": "network",
        "description": "Limits message rates per vehicle to prevent flooding attacks.",
        "effectiveness": {"low": 90, "medium": 70, "high": 45},
        "detection_time": 0.2,  # 200ms
        "false_positive_rate": 0.05,
        "educational_notes": "IEEE 1609.4 specifies maximum message rates. Exceeding thresholds indicates DoS attack.",
        "icon": "⏱️",
        "applicable_to": ["dos_flooding", "sybil"]
    },
    "timestamp_validation": {
        "name": "Timestamp Freshness Check",
        "type": "cryptographic",
        "description": "Validates message timestamps to detect replay attacks and old messages.",
        "effectiveness": {"low": 95, "medium": 65, "high": 40},
        "detection_time": 0.05,  # 50ms
        "false_positive_rate": 0.03,
        "educational_notes": "Messages older than a threshold (typically 1-2 seconds) are rejected. Synchronized clocks are critical.",
        "icon": "⏰",
        "applicable_to": ["message_replay"]
    }
}

# ===== DATA STRUCTURES FOR LOGGING =====
@dataclass
class AttackLog:
    """Represents a single attack event for educational logging"""
    id: str
    timestamp: float
    attack_type: str  # Key from ATTACK_TYPES
    attacker_id: str
    target_ids: List[str]
    sophistication: str  # 'low', 'medium', 'high'
    status: str  # 'initiated', 'detected', 'blocked', 'succeeded', 'failed'
    description: str
    severity: str
    icon: str
    attack_data: Dict[str, Any]  # Attack-specific data
    educational_context: str
    
    def to_dict(self):
        return asdict(self)

@dataclass
class DefenseLog:
    """Represents a defense mechanism activation"""
    id: str
    timestamp: float
    defense_type: str  # Key from DEFENSE_TYPES
    attack_id: str  # Related attack
    attacker_id: str
    action_taken: str
    success: bool
    detection_time: float
    confidence: float  # 0-1
    explanation: str
    icon: str
    
    def to_dict(self):
        return asdict(self)

@dataclass
class AttackOutcome:
    """Represents the final outcome of an attack vs defense interaction"""
    id: str
    timestamp: float
    attack_id: str
    defense_ids: List[str]
    result: str  # 'blocked', 'partial_success', 'full_success'
    impact_description: str
    learning_points: str
    attack_succeeded: bool
    defenses_triggered: int
    
    def to_dict(self):
        return asdict(self)

class SimulationEngine:
    def __init__(self):
        self.is_running = False
        self.step_count = 0
        self.active_attack = None
        self.v2v_messages = []
        self.anomaly_detections = []
        
        # NEW: Attack/Defense Logging System
        self.attack_logs: List[AttackLog] = []
        self.defense_logs: List[DefenseLog] = []
        self.outcome_logs: List[AttackOutcome] = []
        self.active_attacks: Dict[str, Dict[str, Any]] = {}  # attack_id -> attack_state
        self.attack_sophistication = "medium"  # Default attack difficulty
        
        # NEW: Defense System Configuration
        self.defense_config = {
            "cryptographic_verification": {"enabled": True, "strength": 80},
            "plausibility_check": {"enabled": True, "strength": 75},
            "trust_management": {"enabled": True, "strength": 70},
            "misbehavior_detection": {"enabled": True, "strength": 65},
            "collaborative_verification": {"enabled": True, "strength": 60},
            "rate_limiting": {"enabled": True, "strength": 70},
            "timestamp_validation": {"enabled": True, "strength": 85}
        }
        
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
        # Reset attack/defense logs
        self.attack_logs = []
        self.defense_logs = []
        self.outcome_logs = []
        self.active_attacks = {}
        self.road_graph = self._create_advanced_road_network()
        self.traffic_lights = self._init_traffic_lights()
        self.vehicles = self._generate_initial_vehicles(count=30)


    def set_attack(self, attack_type, sophistication="medium"):
        """Updated attack method using new logging infrastructure"""
        self.active_attack = attack_type
        self.attack_sophistication = sophistication
        
        if not attack_type:
            # Clear attack state immediately
            for v in self.vehicles:
                v["target_vehicle"] = None
                v["hack_progress"] = 0
            # Resolve any active attacks as failed
            for attack_id in list(self.active_attacks.keys()):
                attack_state = self.active_attacks[attack_id]
                attack_log = attack_state["attack_log"]
                attack_log.status = "cancelled"
                del self.active_attacks[attack_id]
        else:
          # Trigger attack from each attacker vehicle
            attackers = [v for v in self.vehicles if v.get("is_attacker", False)]
            for attacker in attackers[:1]:  # Start with just one attacker for clarity
                attack_id = self.initiate_attack(attack_type, attacker["id"], sophistication)
                if attack_id:
                    print(f"[ATTACK] {ATTACK_TYPES[attack_type]['name']} initiated by {attacker['id']} (ID: {attack_id})")
                    # Schedule attack resolution after some time
                    attack_state = self.active_attacks[attack_id]
                    attack_state["resolution_step"] = self.step_count + random.randint(30, 60)  # 3-6 seconds


    def update_params(self, params):
        self.params.update(params)

    def update_vehicle(self, vehicle_id, updates):
        for v in self.vehicles:
            if v["id"] == vehicle_id:
                v.update(updates)
                break

    # ===== NEW: ATTACK/DEFENSE METHODS =====
    
    def initiate_attack(self, attack_type: str, attacker_id: str, sophistication: str = "medium"):
        """
        Initiate a new attack and create initial attack log
        """
        if attack_type not in ATTACK_TYPES:
            return None
            
        attack_info = ATTACK_TYPES[attack_type]
        attack_id = f"atk_{uuid.uuid4().hex[:8]}"
        
        # Find targets (nearby vehicles for most attacks)
        attacker = next((v for v in self.vehicles if v["id"] == attacker_id), None)
        if not attacker:
            return None
            
        targets = []
        for v in self.vehicles:
            if v["id"] != attacker_id and not v.get("is_attacker", False):
                dist = self._distance(attacker, v)
                if dist < self.params["communication_range"] * 2:
                    targets.append(v["id"])
        
        # Create attack log
        attack_log = AttackLog(
            id=attack_id,
            timestamp=time.time(),
            attack_type=attack_type,
            attacker_id=attacker_id,
            target_ids=targets[:3],  # Limit to 3 targets for clarity
            sophistication=sophistication,
            status="initiated",
            description=attack_info["description"],
            severity=attack_info["severity"],
            icon=attack_info["icon"],
            attack_data={
                "bypass_chance": attack_info["sophistication_levels"][sophistication]["bypass_chance"],
                "sophistication_desc": attack_info["sophistication_levels"][sophistication]["description"]
            },
            educational_context=attack_info["educational_notes"]
        )
        
        self.attack_logs.append(attack_log)
        self.active_attacks[attack_id] = {
            "attack_log": attack_log,
            "start_time": time.time(),
            "detected": False,
            "defenses_triggered": []
        }
        
        return attack_id
    
    def process_defenses(self, attack_log: AttackLog):
        """
        Process all applicable defenses against an attack
        Returns list of defense logs and whether attack was blocked
        """
        attack_type = attack_log.attack_type
        attack_info = ATTACK_TYPES[attack_type]
        sophistication = attack_log.sophistication
        bypass_chance = attack_info["sophistication_levels"][sophistication]["bypass_chance"]
        
        defense_logs_created = []
        defenses_succeeded = []
        
        # Find applicable defenses
        for defense_key, defense_info in DEFENSE_TYPES.items():
            if attack_type not in defense_info["applicable_to"]:
                continue
                
            if not self.defense_config[defense_key]["enabled"]:
                continue
            
            # Calculate defense success chance
            defense_strength = self.defense_config[defense_key]["strength"]
            base_effectiveness = defense_info["effectiveness"][sophistication]
            
            # Adjust effectiveness based on configured strength
            adjusted_effectiveness = base_effectiveness * (defense_strength / 100.0)
            
            # Roll for defense success
            defense_success = random.random() * 100 < adjusted_effectiveness
            
            # Create defense log
            defense_id = f"def_{uuid.uuid4().hex[:8]}"
            action_taken = ""
            
            if defense_success:
                action_taken = f"✓ Blocked {attack_info['name']} using {defense_info['name']}"
                defenses_succeeded.append(defense_key)
            else:
                action_taken = f"✗ Failed to block {attack_info['name']} - attack too sophisticated"
            
            defense_log = DefenseLog(
                id=defense_id,
                timestamp=time.time(),
                defense_type=defense_key,
                attack_id=attack_log.id,
                attacker_id=attack_log.attacker_id,
                action_taken=action_taken,
                success=defense_success,
                detection_time=defense_info["detection_time"],
                confidence=adjusted_effectiveness / 100.0,
                explanation=defense_info["educational_notes"],
                icon=defense_info["icon"]
            )
            
            defense_logs_created.append(defense_log)
            self.defense_logs.append(defense_log)
        
        # Determine overall outcome
        attack_blocked = len(defenses_succeeded) > 0
        
        return defense_logs_created, attack_blocked
    
    def resolve_attack(self, attack_id: str):
        """
        Finalize attack outcome and create outcome log
        """
        if attack_id not in self.active_attacks:
            return
            
        attack_state = self.active_attacks[attack_id]
        attack_log = attack_state["attack_log"]
        
        # Process defenses
        defense_logs, attack_blocked = self.process_defenses(attack_log)
        
        # Update attack status
        attack_log.status = "blocked" if attack_blocked else "succeeded"
        
        # Create outcome log
        outcome_id = f"out_{uuid.uuid4().hex[:8]}"
        
        if attack_blocked:
            result = "blocked"
            impact_description = f"Attack was successfully blocked by defense systems. No vehicles were affected."
            learning_points = f"This demonstrates the importance of layered security. Multiple defense mechanisms working together can stop even sophisticated attacks."
        else:
            result = "full_success"
            impact_description = f"Attack succeeded. Target vehicles may have received false information, potentially affecting their driving decisions."
            learning_points = f"When attack sophistication exceeds defense capabilities, attacks can succeed. This shows why continuous security updates and strong defenses are critical in V2X systems."
        
        outcome = AttackOutcome(
            id=outcome_id,
            timestamp=time.time(),
            attack_id=attack_id,
            defense_ids=[d.id for d in defense_logs],
            result=result,
            impact_description=impact_description,
            learning_points=learning_points,
            attack_succeeded=not attack_blocked,
            defenses_triggered=len(defense_logs)
        )
        
        self.outcome_logs.append(outcome)
        
        # Remove from active attacks
        del self.active_attacks[attack_id]
    
    def configure_defense(self, defense_type: str, enabled: bool = None, strength: int = None):
        """
        Configure individual defense mechanisms
        """
        if defense_type in self.defense_config:
            if enabled is not None:
                self.defense_config[defense_type]["enabled"] = enabled
            if strength is not None:
                self.defense_config[defense_type]["strength"] = max(0, min(100, strength))


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
            "roads": road_data,
            # NEW: Attack/Defense Educational Logs
            "attack_logs": [log.to_dict() for log in self.attack_logs[-20:]],  # Last 20
            "defense_logs": [log.to_dict() for log in self.defense_logs[-20:]],  # Last 20
            "outcome_logs": [log.to_dict() for log in self.outcome_logs[-10:]],  # Last 10
            "active_attacks_count": len(self.active_attacks),
            "defense_config": self.defense_config,
            "attack_sophistication": self.attack_sophistication,
            # Metadata for frontend
            "available_attacks": {k: {
                "name": v["name"],
                "icon": v["icon"],
                "severity": v["severity"],
                "description": v["description"]
            } for k, v in ATTACK_TYPES.items()},
            "available_defenses": {k: {
                "name": v["name"],
                "icon": v["icon"],
                "type": v["type"],
                "description": v["description"]
            } for k, v in DEFENSE_TYPES.items()}
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
        
        # NEW: Process active attacks and resolve them
        for attack_id in list(self.active_attacks.keys()):
            attack_state = self.active_attacks[attack_id]
            if "resolution_step" in attack_state and self.step_count >= attack_state["resolution_step"]:
                self.resolve_attack(attack_id)

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
            "roads": road_data,
            # NEW: Attack/Defense Educational Logs (CRITICAL FOR FRONTEND)
            "attack_logs": [log.to_dict() for log in self.attack_logs[-20:]],  # Last 20
            "defense_logs": [log.to_dict() for log in self.defense_logs[-20:]],  # Last 20
            "outcome_logs": [log.to_dict() for log in self.outcome_logs[-10:]],  # Last 10
            "active_attacks_count": len(self.active_attacks),
            "defense_config": self.defense_config,
            "attack_sophistication": self.attack_sophistication,
            # Metadata for frontend
            "available_attacks": {k: {
                "name": v["name"],
                "icon": v["icon"],
                "severity": v["severity"],
                "description": v["description"]
            } for k, v in ATTACK_TYPES.items()},
            "available_defenses": {k: {
                "name": v["name"],
                "icon": v["icon"],
                "type": v["type"],
                "description": v["description"]
            } for k, v in DEFENSE_TYPES.items()}
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
