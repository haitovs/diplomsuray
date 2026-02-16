import random
import time
import math
import networkx as nx
from typing import Dict, Any, List
from dataclasses import dataclass, asdict
import uuid

# Vehicle type definitions
VEHICLE_TYPES = {
    "passenger": {"max_speed": 60, "acceleration": 3, "color": "blue", "trust": 0.9, "icon": "car"},
    "truck": {"max_speed": 40, "acceleration": 2, "color": "green", "trust": 0.85, "icon": "truck"},
    "emergency": {"max_speed": 80, "acceleration": 5, "color": "red", "trust": 0.95, "icon": "emergency"},
    "bus": {"max_speed": 35, "acceleration": 1.5, "color": "orange", "trust": 0.88, "icon": "bus"},
}

# Defense level multipliers: how much they slow down hacking
DEFENSE_LEVELS = {
    "low":    {"name": "Низкий",  "hack_multiplier": 1.5, "resist_chance": 0.0,  "defense_bonus": 0.7},
    "medium": {"name": "Средний", "hack_multiplier": 1.0, "resist_chance": 0.15, "defense_bonus": 1.0},
    "high":   {"name": "Высокий", "hack_multiplier": 0.35, "resist_chance": 0.4,  "defense_bonus": 1.5},
}

# Attack sophistication multipliers for hack speed
ATTACK_SPEED_MULTIPLIERS = {
    "low":    0.6,
    "medium": 1.0,
    "high":   1.8,
}

# ===== REALISTIC V2X ATTACK TYPES =====
ATTACK_TYPES = {
    "position_falsification": {
        "name": "Фальсификация позиции",
        "category": "message_manipulation",
        "description": "Атакующий передаёт ложные GPS-координаты в BSM-сообщениях, создавая видимость нахождения в другом месте.",
        "severity": "high",
        "real_world_example": "Атакующий может создать видимость заблокированной полосы, заставляя другие автомобили тормозить или менять полосу.",
        "target_layer": ["application"],
        "educational_notes": "Одна из самых распространённых V2X-атак. Данные о позиции критичны для предотвращения столкновений.",
        "icon": "📍",
        "sophistication_levels": {
            "low": {"description": "Случайные позиции, легко обнаружить", "bypass_chance": 0.1},
            "medium": {"description": "Близкие позиции с реалистичным движением", "bypass_chance": 0.4},
            "high": {"description": "Постепенный дрейф позиции, сложно обнаружить", "bypass_chance": 0.7}
        }
    },
    "gps_spoofing": {
        "name": "Подмена GPS-сигнала",
        "category": "sensor_manipulation",
        "description": "Систематическая подмена GPS-сигналов, из-за которой автомобили считают, что находятся в неправильном месте.",
        "severity": "critical",
        "real_world_example": "В 2013 году исследователи подменили GPS на яхте, вызвав навигационные ошибки. Аналогичные атаки могут быть на V2X.",
        "target_layer": ["physical", "application"],
        "educational_notes": "Подмена GPS влияет на всю систему позиционирования. В отличие от фальсификации позиции, здесь атакуется сам датчик.",
        "icon": "🛰️",
        "sophistication_levels": {
            "low": {"description": "Дрейф GPS одного автомобиля", "bypass_chance": 0.2},
            "medium": {"description": "Координированная подмена нескольких машин", "bypass_chance": 0.5},
            "high": {"description": "Постепенный дрейф, имитирующий естественные ошибки", "bypass_chance": 0.8}
        }
    },
    "sybil": {
        "name": "Атака Сивиллы",
        "category": "identity",
        "description": "Атакующий создаёт множество фейковых транспортных средств для манипуляции информацией о трафике.",
        "severity": "high",
        "real_world_example": "Может создать ложную пробку, имитируя множество автомобилей и влияя на маршрутизацию.",
        "target_layer": ["network", "application"],
        "educational_notes": "Названа по психиатрическому случаю. В V2X атака Сивиллы может перегрузить систему принятия решений.",
        "icon": "👥",
        "sophistication_levels": {
            "low": {"description": "2-3 фейковых машины в одном месте", "bypass_chance": 0.15},
            "medium": {"description": "Распределённые фейковые машины с движением", "bypass_chance": 0.45},
            "high": {"description": "Реалистичные фейковые машины с координацией", "bypass_chance": 0.75}
        }
    },
    "message_replay": {
        "name": "Повторная атака",
        "category": "message_manipulation",
        "description": "Атакующий перехватывает легитимные V2X-сообщения и ретранслирует их позже, создавая ложное присутствие.",
        "severity": "medium",
        "real_world_example": "Запись BSM-сообщений возле перекрёстка и воспроизведение их, чтобы машина казалась на месте.",
        "target_layer": ["application"],
        "educational_notes": "Повторные атаки эксплуатируют отсутствие проверки актуальности сообщений. Метки времени — ключевая защита.",
        "icon": "🔁",
        "sophistication_levels": {
            "low": {"description": "Старые сообщения с очевидными метками", "bypass_chance": 0.1},
            "medium": {"description": "Сообщения давностью в несколько секунд", "bypass_chance": 0.3},
            "high": {"description": "Модификация меток времени", "bypass_chance": 0.6}
        }
    },
    "dos_flooding": {
        "name": "DoS — Переполнение сети",
        "category": "network",
        "description": "Атакующий заваливает V2X-сеть лишними сообщениями, блокируя легитимные коммуникации.",
        "severity": "critical",
        "real_world_example": "Переполнение сети может помешать экстренным предупреждениям дойти до автомобилей.",
        "target_layer": ["network"],
        "educational_notes": "DoS-атаки вызывают задержки, превышающие критические пороги безопасности (100мс для предупреждений).",
        "icon": "💥",
        "sophistication_levels": {
            "low": {"description": "Простой спам сообщениями", "bypass_chance": 0.2},
            "medium": {"description": "Целевое заполнение определённых типов", "bypass_chance": 0.5},
            "high": {"description": "Адаптивное заполнение, обходящее лимиты", "bypass_chance": 0.8}
        }
    },
    "velocity_spoofing": {
        "name": "Подмена скорости",
        "category": "message_manipulation",
        "description": "Атакующий передаёт ложные данные о скорости и ускорении, вводя окружающие машины в заблуждение.",
        "severity": "high",
        "real_world_example": "Ложное экстренное торможение может спровоцировать столкновения сзади.",
        "target_layer": ["application"],
        "educational_notes": "Скорость и ускорение критичны для расчёта столкновений. Ложные данные могут вызвать аварийное торможение.",
        "icon": "⚡",
        "sophistication_levels": {
            "low": {"description": "Невозможная скорость (500 км/ч)", "bypass_chance": 0.05},
            "medium": {"description": "Завышенная, но правдоподобная скорость", "bypass_chance": 0.35},
            "high": {"description": "Небольшие отклонения, накапливающиеся со временем", "bypass_chance": 0.65}
        }
    },
    "certificate_replay": {
        "name": "Повтор сертификата",
        "category": "cryptographic",
        "description": "Атакующий использует истёкшие или отозванные сертификаты для подписи V2X-сообщений.",
        "severity": "high",
        "real_world_example": "Использование сертификата выведенного из эксплуатации автомобиля для маскировки.",
        "target_layer": ["application", "cryptographic"],
        "educational_notes": "IEEE 1609.2 требует проверки сертификатов. Списки отзыва (CRL) должны регулярно обновляться.",
        "icon": "🔐",
        "sophistication_levels": {
            "low": {"description": "Очевидно истёкший сертификат", "bypass_chance": 0.1},
            "medium": {"description": "Недавно отозванный сертификат", "bypass_chance": 0.4},
            "high": {"description": "Валидно выглядящий сертификат с дефектами", "bypass_chance": 0.7}
        }
    },
    "false_emergency": {
        "name": "Ложный сигнал скорой помощи",
        "category": "message_manipulation",
        "description": "Атакующий рассылает фейковые предупреждения о скорой помощи для расчистки дороги.",
        "severity": "high",
        "real_world_example": "Ложные сигналы скорой могут вызвать опасные перестроения.",
        "target_layer": ["application"],
        "educational_notes": "Приоритет экстренных машин — критическая функция V2X. Ложные сигналы подрывают доверие.",
        "icon": "🚨",
        "sophistication_levels": {
            "low": {"description": "Одиночный ложный сигнал", "bypass_chance": 0.25},
            "medium": {"description": "Координированный ложный сценарий", "bypass_chance": 0.55},
            "high": {"description": "Имитация приближения скорой", "bypass_chance": 0.75}
        }
    },
    "message_suppression": {
        "name": "Глушение сигнала",
        "category": "network",
        "description": "Атакующий создаёт помехи в V2X-радиосвязи, блокируя получение сообщений.",
        "severity": "critical",
        "real_world_example": "Глушение предупреждений на перекрёстках может привести к столкновениям.",
        "target_layer": ["physical", "network"],
        "educational_notes": "Радиоглушение сложно защитить программно. Требуется физическая безопасность и смена частот.",
        "icon": "📡",
        "sophistication_levels": {
            "low": {"description": "Непрерывный широкополосный шум", "bypass_chance": 0.3},
            "medium": {"description": "Выборочное глушение каналов", "bypass_chance": 0.6},
            "high": {"description": "Реактивное глушение по триггерам", "bypass_chance": 0.85}
        }
    },
    "illusion": {
        "name": "Атака-иллюзия",
        "category": "message_manipulation",
        "description": "Несколько атакующих координируются для создания полностью ложного сценария движения.",
        "severity": "critical",
        "real_world_example": "Создание ложной пробки на шоссе для перенаправления трафика.",
        "target_layer": ["application", "network"],
        "educational_notes": "Наиболее опасна в сочетании с атакой Сивиллы. Сложно обнаружить без внешней проверки.",
        "icon": "🎭",
        "sophistication_levels": {
            "low": {"description": "Нескоординированные ложные отчёты", "bypass_chance": 0.2},
            "medium": {"description": "Координированный сценарий с пробелами", "bypass_chance": 0.5},
            "high": {"description": "Идеальная иллюзия со всеми деталями", "bypass_chance": 0.9}
        }
    }
}

# ===== DEFENSE MECHANISMS =====
DEFENSE_TYPES = {
    "cryptographic_verification": {
        "name": "Криптографическая проверка подписи",
        "type": "cryptographic",
        "description": "Проверяет цифровые подписи V2X-сообщений с использованием сертификатов IEEE 1609.2 и PKI.",
        "effectiveness": {"low": 90, "medium": 70, "high": 40},
        "detection_time": 0.05,  # 50мс
        "false_positive_rate": 0.01,
        "educational_notes": "Первая линия защиты. Все V2X-сообщения должны быть подписаны. Недействительные подписи сразу отклоняются.",
        "icon": "🔒",
        "applicable_to": ["certificate_replay", "message_replay", "sybil"]
    },
    "plausibility_check": {
        "name": "Проверка правдоподобности",
        "type": "behavioral",
        "description": "Проверяет содержимое сообщений на соответствие физическим законам (ограничения скорости, ускорение, позиция).",
        "effectiveness": {"low": 95, "medium": 75, "high": 50},
        "detection_time": 0.1,  # 100мс
        "false_positive_rate": 0.05,
        "educational_notes": "Проверяет, физически ли возможны данные. Скорость >200 км/ч на городских дорогах или мгновенная телепортация — подозрительны.",
        "icon": "⚗️",
        "applicable_to": ["position_falsification", "velocity_spoofing", "gps_spoofing", "false_emergency"]
    },
    "trust_management": {
        "name": "Система доверия и репутации",
        "type": "behavioral",
        "description": "Ведёт уровни доверия для каждого автомобиля на основе истории поведения. Повторные аномалии снижают доверие.",
        "effectiveness": {"low": 60, "medium": 80, "high": 85},
        "detection_time": 2.0,  # 2 секунды
        "false_positive_rate": 0.10,
        "educational_notes": "Долгосрочная защита на основе профилей. Опытные атакующие сначала зарабатывают доверие, потом атакуют.",
        "icon": "⭐",
        "applicable_to": ["position_falsification", "velocity_spoofing", "gps_spoofing", "illusion"]
    },
    "misbehavior_detection": {
        "name": "Система обнаружения вторжений (IDS)",
        "type": "behavioral",
        "description": "Обнаружение аномалий на основе машинного обучения, выявляющее необычные паттерны в V2X-связи.",
        "effectiveness": {"low": 85, "medium": 70, "high": 55},
        "detection_time": 0.5,  # 500мс
        "false_positive_rate": 0.15,
        "educational_notes": "Использует статистические модели для обнаружения отклонений от нормального трафика. Может обнаружить новые атаки.",
        "icon": "🛡️",
        "applicable_to": ["dos_flooding", "illusion", "message_suppression", "sybil"]
    },
    "collaborative_verification": {
        "name": "Совместная проверка (V2V)",
        "type": "collaborative",
        "description": "Перекрёстная проверка информации с соседними автомобилями для обнаружения несоответствий.",
        "effectiveness": {"low": 70, "medium": 85, "high": 75},
        "detection_time": 1.0,  # 1 секунда
        "false_positive_rate": 0.08,
        "educational_notes": "Если большинство машин согласны, а одна нет — она подозрительна. Требуются честные соседние машины.",
        "icon": "🤝",
        "applicable_to": ["position_falsification", "gps_spoofing", "sybil", "illusion"]
    },
    "rate_limiting": {
        "name": "Ограничение частоты сообщений",
        "type": "network",
        "description": "Ограничивает частоту сообщений от каждого автомобиля для предотвращения DoS-атак.",
        "effectiveness": {"low": 90, "medium": 70, "high": 45},
        "detection_time": 0.2,  # 200мс
        "false_positive_rate": 0.05,
        "educational_notes": "IEEE 1609.4 определяет максимальную частоту сообщений. Превышение порогов указывает на DoS-атаку.",
        "icon": "⏱️",
        "applicable_to": ["dos_flooding", "sybil"]
    },
    "timestamp_validation": {
        "name": "Проверка актуальности меток времени",
        "type": "cryptographic",
        "description": "Проверяет метки времени сообщений для обнаружения повторных атак и устаревших данных.",
        "effectiveness": {"low": 95, "medium": 65, "high": 40},
        "detection_time": 0.05,  # 50мс
        "false_positive_rate": 0.03,
        "educational_notes": "Сообщения старше порога (обычно 1-2 секунды) отклоняются. Синхронизация часов критически важна.",
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
            "lat_min": 40.7020,
            "lat_max": 40.7170,
            "lon_min": -74.0150,
            "lon_max": -74.0010
        }
        
        # Initialize Road Network & Traffic Lights
        self.road_graph = self._create_advanced_road_network()
        self.traffic_lights = self._init_traffic_lights()
        self.vehicles = self._generate_initial_vehicles(count=10)
        
        # Simulation parameters
        self.params = {
            "global_speed_multiplier": 0.5,
            "message_frequency": 1.0,
            "detection_sensitivity": 0.7,
            "communication_range": 0.005
        }

    def _create_advanced_road_network(self):
        """Create a road network aligned with real Lower Manhattan streets.

        Uses actual intersection coords for the Financial District area
        (40.700-40.720, -74.020 to -74.000) so vehicles follow visible roads
        on the CartoDB / OSM tiles.
        """
        G = nx.DiGraph()

        # ── Real intersection nodes ──────────────────────────────────────
        # N-S streets (south → north): Greenwich, W Broadway, Church, Broadway
        # E-W streets (west → east): Battery Pl, Morris, Rector, Cortlandt,
        #   Fulton, Vesey, Barclay, Park Pl, Murray
        intersections = {
            # ── Greenwich St (west column) ──
            "greenwich_battery":   (40.7028, -74.0135),
            "greenwich_rector":    (40.7065, -74.0133),
            "greenwich_cortlandt": (40.7090, -74.0130),
            "greenwich_fulton":    (40.7107, -74.0120),
            "greenwich_vesey":     (40.7120, -74.0115),
            "greenwich_barclay":   (40.7135, -74.0108),
            "greenwich_murray":    (40.7152, -74.0100),

            # ── West Broadway / W Broadway (center-west) ──
            "wbway_rector":        (40.7070, -74.0105),
            "wbway_cortlandt":     (40.7092, -74.0098),
            "wbway_fulton":        (40.7110, -74.0090),
            "wbway_vesey":         (40.7125, -74.0085),
            "wbway_barclay":       (40.7140, -74.0078),
            "wbway_murray":        (40.7155, -74.0070),

            # ── Church St (center) ──
            "church_rector":       (40.7075, -74.0075),
            "church_cortlandt":    (40.7095, -74.0068),
            "church_fulton":       (40.7112, -74.0058),
            "church_vesey":        (40.7128, -74.0055),
            "church_barclay":      (40.7143, -74.0048),
            "church_murray":       (40.7158, -74.0042),

            # ── Broadway (east column) ──
            "bway_battery":        (40.7035, -74.0130),
            "bway_rector":         (40.7080, -74.0060),
            "bway_cortlandt":      (40.7098, -74.0048),
            "bway_fulton":         (40.7115, -74.0040),
            "bway_vesey":          (40.7130, -74.0032),
            "bway_barclay":        (40.7145, -74.0028),
            "bway_murray":         (40.7160, -74.0020),
        }

        for nid, (lat, lon) in intersections.items():
            G.add_node(nid, pos=(lat, lon))

        # ── Edges (bidirectional): N-S streets ───────────────────────────
        ns_streets = {
            "greenwich": [
                "greenwich_battery", "greenwich_rector", "greenwich_cortlandt",
                "greenwich_fulton", "greenwich_vesey", "greenwich_barclay",
                "greenwich_murray",
            ],
            "wbway": [
                "wbway_rector", "wbway_cortlandt", "wbway_fulton",
                "wbway_vesey", "wbway_barclay", "wbway_murray",
            ],
            "church": [
                "church_rector", "church_cortlandt", "church_fulton",
                "church_vesey", "church_barclay", "church_murray",
            ],
            "bway": [
                "bway_battery", "bway_rector", "bway_cortlandt",
                "bway_fulton", "bway_vesey", "bway_barclay", "bway_murray",
            ],
        }

        for _street, nodes in ns_streets.items():
            for i in range(len(nodes) - 1):
                G.add_edge(nodes[i], nodes[i + 1])
                G.add_edge(nodes[i + 1], nodes[i])

        # ── Edges (bidirectional): E-W cross-streets ─────────────────────
        ew_streets = {
            "rector":    ["greenwich_rector",    "wbway_rector",    "church_rector",    "bway_rector"],
            "cortlandt": ["greenwich_cortlandt", "wbway_cortlandt", "church_cortlandt", "bway_cortlandt"],
            "fulton":    ["greenwich_fulton",    "wbway_fulton",    "church_fulton",    "bway_fulton"],
            "vesey":     ["greenwich_vesey",     "wbway_vesey",     "church_vesey",     "bway_vesey"],
            "barclay":   ["greenwich_barclay",   "wbway_barclay",   "church_barclay",   "bway_barclay"],
            "murray":    ["greenwich_murray",    "wbway_murray",    "church_murray",    "bway_murray"],
        }

        for _street, nodes in ew_streets.items():
            for i in range(len(nodes) - 1):
                G.add_edge(nodes[i], nodes[i + 1])
                G.add_edge(nodes[i + 1], nodes[i])

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
            
            # Assign defense level: weighted random (more medium, fewer high)
            defense_roll = random.random()
            if defense_roll < 0.3:
                defense_level = "low"
            elif defense_roll < 0.75:
                defense_level = "medium"
            else:
                defense_level = "high"

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
                "defense_level": defense_level,
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
        
        # Add Hacker (just 1 for clarity)
        attacker_count = 1
        for i in range(attacker_count):
            if i < len(vehicles):
                vehicles[i]["is_attacker"] = True
                vehicles[i]["trust_score"] = 0.3
                vehicles[i]["color"] = "red"
                vehicles[i]["type"] = "hacker"
                vehicles[i]["defense_level"] = "high"  # Hacker has high self-defense
            
        return vehicles

    def _get_path(self, start, end):
        try:
            return nx.shortest_path(self.road_graph, start, end)
        except (nx.NetworkXNoPath, nx.NodeNotFound, nx.NetworkXError):
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
        self.vehicles = self._generate_initial_vehicles(count=10)


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
                    attack_state["repeat_interval"] = random.randint(40, 80)  # Re-attack interval


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
        
        # Find target vehicles to include in logs
        target_ids = attack_log.target_ids
        target_vehicles = [v for v in self.vehicles if v["id"] in target_ids]
        
        # Determine average target defense level for log context
        avg_defense = "medium"
        if target_vehicles:
            defense_counts = {"low": 0, "medium": 0, "high": 0}
            for tv in target_vehicles:
                dl = tv.get("defense_level", "medium")
                defense_counts[dl] = defense_counts.get(dl, 0) + 1
            avg_defense = max(defense_counts, key=defense_counts.get)
        
        defense_logs_created = []
        defenses_succeeded = []
        
        # Find applicable defenses
        for defense_key, defense_info in DEFENSE_TYPES.items():
            if attack_type not in defense_info["applicable_to"]:
                continue
                
            if not self.defense_config[defense_key]["enabled"]:
                continue
            
            # Get defense effectiveness for this sophistication level
            base_effectiveness = defense_info["effectiveness"].get(sophistication, 50)
            defense_strength = self.defense_config[defense_key]["strength"]
            
            # Boost effectiveness based on target vehicle defense level
            defense_level_bonus = DEFENSE_LEVELS.get(avg_defense, DEFENSE_LEVELS["medium"])["defense_bonus"]
            adjusted_effectiveness = base_effectiveness * (defense_strength / 100.0) * defense_level_bonus
            adjusted_effectiveness = min(adjusted_effectiveness, 99)  # Cap at 99%
            
            # Roll for defense success
            defense_success = random.random() * 100 < adjusted_effectiveness
            
            # Create defense log with SPECIFIC details
            defense_id = f"def_{uuid.uuid4().hex[:8]}"
            target_names = ', '.join(target_ids[:2]) if target_ids else 'неизвестно'
            defense_level_name = DEFENSE_LEVELS.get(avg_defense, DEFENSE_LEVELS["medium"])["name"]
            
            if defense_success:
                action_taken = f"✓ {defense_info['name']} заблокировала {attack_info['name']} на {target_names} (защита: {defense_level_name}, эффективность: {adjusted_effectiveness:.0f}%)"
                defenses_succeeded.append(defense_key)
            else:
                action_taken = f"✗ {defense_info['name']} не смогла остановить {attack_info['name']} — уровень атаки ({sophistication}) превышает защиту {target_names} ({defense_level_name})"
            
            defense_log = DefenseLog(
                id=defense_id,
                timestamp=time.time(),
                defense_type=defense_key,
                attack_id=attack_log.id,
                attacker_id=attack_log.attacker_id,
                action_taken=action_taken,
                success=defense_success,
                detection_time=defense_info["detection_time"] + random.uniform(-0.02, 0.05),
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
        
        # Build dynamic outcome text with real vehicle/defense data
        target_ids = attack_log.target_ids
        target_vehicles = [v for v in self.vehicles if v["id"] in target_ids]
        target_list_str = ', '.join(target_ids[:3]) if target_ids else 'нет целей'
        attack_name = ATTACK_TYPES.get(attack_log.attack_type, {}).get('name', attack_log.attack_type)
        defenses_used = [DEFENSE_TYPES[d.defense_type]['name'] for d in defense_logs if d.success]
        defenses_failed = [DEFENSE_TYPES[d.defense_type]['name'] for d in defense_logs if not d.success]
        
        if attack_blocked:
            result = "blocked"
            impact_description = f"{attack_name} на {target_list_str} заблокирована. Сработали: {', '.join(defenses_used[:3])}. Транспортные средства не пострадали."
            if target_vehicles:
                dl = DEFENSE_LEVELS.get(target_vehicles[0].get('defense_level', 'medium'), DEFENSE_LEVELS['medium'])['name']
                learning_points = f"Уровень защиты целей ({dl}) оказался достаточным против атаки уровня '{attack_log.sophistication}'. {len(defenses_used)} из {len(defense_logs)} защит сработали успешно."
            else:
                learning_points = f"Многоуровневая защита ({len(defenses_used)} механизмов) остановила атаку."
        else:
            result = "full_success"
            impact_description = f"{attack_name} прошла на {target_list_str}. Не сработали: {', '.join(defenses_failed[:3])}. Автомобили могли получить ложные данные."
            if target_vehicles:
                dl = DEFENSE_LEVELS.get(target_vehicles[0].get('defense_level', 'medium'), DEFENSE_LEVELS['medium'])['name']
                learning_points = f"Уровень атаки '{attack_log.sophistication}' превысил защиту ({dl}). {len(defenses_failed)} из {len(defense_logs)} защит не справились. Рекомендуется повысить уровень защиты."
            else:
                learning_points = f"Атака уровня '{attack_log.sophistication}' прошла мимо {len(defenses_failed)} защитных механизмов."
        
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
        
        # Process active attacks: resolve and re-trigger for continuous journal entries
        for attack_id in list(self.active_attacks.keys()):
            attack_state = self.active_attacks[attack_id]
            if "resolution_step" in attack_state and self.step_count >= attack_state["resolution_step"]:
                self.resolve_attack(attack_id)
                # Re-trigger a new attack if the attack type is still active
                if self.active_attack:
                    attackers = [v for v in self.vehicles if v.get("is_attacker", False)]
                    for attacker in attackers[:1]:
                        new_id = self.initiate_attack(self.active_attack, attacker["id"], self.attack_sophistication)
                        if new_id:
                            new_state = self.active_attacks[new_id]
                            new_state["resolution_step"] = self.step_count + random.randint(40, 80)
                            new_state["repeat_interval"] = random.randint(40, 80)

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
                
                # Hack target — speed depends on attack sophistication vs target defense level
                if v["target_vehicle"]:
                    target = next((t for t in self.vehicles if t["id"] == v["target_vehicle"]), None)
                    if target and target["status"] == "moving":
                        dist = self._distance(v, target)
                        if dist < self.params["communication_range"] * 1.2:
                            # Calculate hack speed based on attack sophistication vs defense level
                            attack_mult = ATTACK_SPEED_MULTIPLIERS.get(self.attack_sophistication, 1.0)
                            defense_info = DEFENSE_LEVELS.get(target.get("defense_level", "medium"), DEFENSE_LEVELS["medium"])
                            defense_mult = defense_info["hack_multiplier"]
                            hack_speed = 1.5 * attack_mult / max(defense_mult, 0.1)
                            
                            v["hack_progress"] += hack_speed
                            
                            # High-defense vehicles can resist hacking entirely
                            resist_chance = defense_info["resist_chance"]
                            if v["hack_progress"] > 70 and resist_chance > 0 and random.random() < resist_chance * 0.05:
                                # Defense kicked in — reset hack
                                v["target_vehicle"] = None
                                v["hack_progress"] = 0
                                target["anomalies_detected"] = target.get("anomalies_detected", 0) + 1
                                new_anomalies.append({
                                    "id": f"a_{self.step_count}_{target['id']}",
                                    "timestamp": time.time(),
                                    "sender": v["id"],
                                    "type": self.active_attack,
                                    "reason": f"Атака ОТРАЖЕНА защитой ({defense_info['name']})",
                                    "severity": "medium"
                                })
                            elif v["hack_progress"] >= 100:
                                target["status"] = "stopped"
                                target["speed"] = 0
                                target["hack_recovery_timer"] = 50  # Will recover after ~5 seconds
                                target["anomalies_detected"] = target.get("anomalies_detected", 0) + 1
                                v["target_vehicle"] = None
                                v["hack_progress"] = 0
                                defense_lvl = DEFENSE_LEVELS.get(target.get("defense_level", "medium"), DEFENSE_LEVELS["medium"])
                                new_anomalies.append({
                                    "id": f"a_{self.step_count}_{target['id']}",
                                    "timestamp": time.time(),
                                    "sender": v["id"],
                                    "type": self.active_attack,
                                    "reason": f"Автомобиль {target['id']} ВЗЛОМАН (защита: {defense_lvl['name']})",
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

            # Vehicle recovery: hacked vehicles resume after recovery timer expires
            if v["status"] == "stopped" and not v.get("is_attacker", False):
                recovery = v.get("hack_recovery_timer", 0)
                if recovery > 0:
                    v["hack_recovery_timer"] = recovery - 1
                    if v["hack_recovery_timer"] <= 0:
                        v["status"] = "moving"
                        v["hack_recovery_timer"] = 0

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
                v["messages_sent"] = v.get("messages_sent", 0) + 1
                
                is_anomaly, reason = self._detect_anomaly(msg)
                if is_anomaly:
                    v["anomalies_detected"] = v.get("anomalies_detected", 0) + 1
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
        
        move_dist = speed_deg_per_sec * 0.1 * self.params["global_speed_multiplier"]
        
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
        sensitivity = self.params.get("detection_sensitivity", 0.7)
        
        # Speed threshold scales with sensitivity (higher sensitivity = lower threshold)
        speed_threshold = 200 - (sensitivity * 80)  # Range: 144-200 km/h
        if msg["speed"] > speed_threshold:
            is_anomaly = True
            reason = f"Impossible speed: {msg['speed']:.0f} km/h (threshold: {speed_threshold:.0f})"
        
        # Timestamp freshness scales with sensitivity
        time_threshold = 10 - (sensitivity * 6)  # Range: 4-10 seconds
        if msg["timestamp"] < time.time() - time_threshold:
            is_anomaly = True
            reason = f"Replayed message (older than {time_threshold:.0f}s)"
            
        return is_anomaly, reason

    def _distance(self, v1, v2):
        return math.sqrt((v1["lat"] - v2["lat"])**2 + (v1["lon"] - v2["lon"])**2)

