#!/usr/bin/env python3
"""Convierte la descarga de OSM en el nivel del barrio (JSON en metros locales).

Solo stdlib. El nivel lo lee src/mundo/nivel.ts y construye la geometría en el
navegador (extrusión de huellas, calles como cintas, grafo de tráfico).

Uso: python3 tools/genera_nivel.py <id-de-barrio>            (perfil de PERFILES, lo normal)
     python3 tools/genera_nivel.py [sur,oeste,norte,este] [nombre-cache] [carpeta-salida]

Sistema de coordenadas del juego: x = este, z = sur (Three.js, el norte apunta a -z).
Origen en el centro de la caja.
"""
from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from osm_descarga import descargar  # noqa: E402

BBOX_MERCADO = "37.42020,-5.96658,37.42470,-5.96092"

# Vías rodadas (con ancho en metros) y peatonales. Lo demás se ignora.
VIAS_RODADAS = {"tertiary": 9.0, "secondary": 10.0, "primary": 12.0, "residential": 6.5,
                "unclassified": 6.0, "service": 4.0, "living_street": 5.0}
VIAS_PEATONALES = {"pedestrian": 5.0, "footway": 2.5, "cycleway": 2.5, "path": 2.0, "steps": 2.0}

# Colores pastel planos. Los bloques rotan por la paleta según su id para que no
# sean todos iguales; los equipamientos tienen color fijo para reconocerse.
PALETA_BLOQUES = ["#f4e7d3", "#f7d9c4", "#f2cfc9", "#e8dcc8", "#f6e2b3", "#e9d5d0", "#efe3cf", "#f1d8b8"]
COLOR_TIPO = {
    "mercado": "#f2a65a",
    "iglesia": "#d9c8ec",
    "colegio": "#bfe3d0",
    "bomberos": "#e88d7a",
    "sanidad": "#cfe5f2",
    "biblioteca": "#d6d2ea",
    "comercio": "#f6c58f",
    "publico": "#d5dce6",
    "garaje": "#cfd3d8",
    "nave": "#c9cfd6",
    "estadio": "#ece7df",
}
PLANTAS_POR_DEFECTO = {"apartments": 5, "residential": 4, "yes": 4, "public": 2, "fire_station": 2,
                       "commercial": 1, "retail": 1, "garage": 1, "garages": 1, "industrial": 1,
                       "church": 6, "school": 2}
ALTO_PLANTA = 3.0

# Casco antiguo: cal, albero, ocre y terracota en vez de los pasteles de los bloques.
PALETA_CASCO = ["#f7f2e6", "#f2e3c2", "#eccfa8", "#f6efe2", "#e8b98a", "#f4d9c4", "#dcae86", "#f0e6d2"]

# Los Remedios: bloques altos de los 60-70 en ladrillo visto, cremas y blancos de pijo.
PALETA_REMEDIOS = ["#efd3b8", "#e2b394", "#f6ecdc", "#ecc8a8", "#faf4e8", "#e6c8b0", "#f2e0c8", "#dcb094"]

# Perfil de cada barrio: caja, caché de OSM, nombre y lo que cambia de un barrio a otro
# (paleta y plantas por defecto cuando OSM no trae `building:levels`). Añadir un barrio es
# añadir una entrada aquí y ejecutar `python3 tools/genera_nivel.py <id>`.
PERFILES = {
    "nervion": {
        "nombre": "Nervión",
        "bbox": "37.38170,-5.97280,37.38630,-5.96720",
        "cache": "nervion",
        "paleta": PALETA_REMEDIOS,
        "plantas": {**PLANTAS_POR_DEFECTO, "yes": 7, "residential": 7, "apartments": 8, "house": 2, "stadium": 10},
        "alto_planta": 3.0,
    },
    "los-remedios": {
        "nombre": "Los Remedios",
        "bbox": "37.37420,-6.00580,37.37880,-6.00020",
        "cache": "los-remedios",
        "paleta": PALETA_REMEDIOS,
        "plantas": {**PLANTAS_POR_DEFECTO, "yes": 6, "residential": 7, "apartments": 8, "house": 2},
        "alto_planta": 3.0,
    },
    "triana": {
        "nombre": "Triana",
        "bbox": "37.38225,-6.00833,37.38675,-6.00267",
        "cache": "triana",
        "paleta": PALETA_CASCO,
        "plantas": {**PLANTAS_POR_DEFECTO, "yes": 3, "residential": 3, "apartments": 4, "house": 2},
        "alto_planta": 3.2,
    },
    "pino-montano": {
        "nombre": "Pino Montano · Mercado",
        "bbox": BBOX_MERCADO,
        "cache": "pino-montano-mercado",
        "paleta": PALETA_BLOQUES,
        "plantas": PLANTAS_POR_DEFECTO,
        "alto_planta": ALTO_PLANTA,
    },
    "alameda": {
        "nombre": "La Alameda",
        "bbox": "37.39650,-5.99600,37.40100,-5.99030",
        "cache": "alameda",
        "paleta": PALETA_CASCO,
        "plantas": {**PLANTAS_POR_DEFECTO, "yes": 3, "residential": 3, "apartments": 4, "house": 2},
        "alto_planta": 3.2,
    },
}


def hash_id(n: int) -> int:
    return int(hashlib.md5(str(n).encode()).hexdigest()[:8], 16)


class Proyeccion:
    def __init__(self, bbox: str):
        s, o, n, e = (float(v) for v in bbox.split(","))
        self.sur, self.oeste, self.norte, self.este = s, o, n, e
        self.lat0 = (s + n) / 2
        self.lon0 = (o + e) / 2
        self.m_lat = 111_320.0
        self.m_lon = 111_320.0 * math.cos(math.radians(self.lat0))

    def xz(self, lat: float, lon: float) -> tuple[float, float]:
        x = (lon - self.lon0) * self.m_lon
        z = -(lat - self.lat0) * self.m_lat
        return round(x, 2), round(z, 2)

    @property
    def tamano(self) -> tuple[float, float]:
        return round((self.este - self.oeste) * self.m_lon, 1), round((self.norte - self.sur) * self.m_lat, 1)


def area_firmada(p: list[tuple[float, float]]) -> float:
    a = 0.0
    for i in range(len(p)):
        x1, z1 = p[i]
        x2, z2 = p[(i + 1) % len(p)]
        a += x1 * z2 - x2 * z1
    return a / 2


def simplificar(p: list[tuple[float, float]], tolerancia: float = 0.3) -> list[tuple[float, float]]:
    """Quita los vértices que se desvían menos de `tolerancia` metros del segmento entre sus
    vecinos (OSM trae muchos puntos casi colineales). Nunca baja de cuatro vértices."""
    pts = list(p)
    cambiado = True
    while cambiado and len(pts) > 4:
        cambiado = False
        for i in range(len(pts)):
            if len(pts) <= 4:
                break
            (ax, az), (bx, bz), (cx, cz) = pts[i - 1], pts[i], pts[(i + 1) % len(pts)]
            dx, dz = cx - ax, cz - az
            l2 = dx * dx + dz * dz
            if l2 == 0:
                d = math.hypot(bx - ax, bz - az)
            else:
                t = max(0.0, min(1.0, ((bx - ax) * dx + (bz - az) * dz) / l2))
                d = math.hypot(ax + t * dx - bx, az + t * dz - bz)
            if d < tolerancia:
                pts.pop(i)
                cambiado = True
                break
    return pts


def recortar(p: list[tuple[float, float]], minx: float, minz: float, maxx: float, maxz: float) -> list[tuple[float, float]]:
    """Recorta un polígono a un rectángulo (Sutherland-Hodgman). El río es una vía de 4 km:
    sin recorte sería un triángulo gigante que el recorte de losetas del cliente descartaría."""
    def lado(pts, dentro, cruce):
        out = []
        for i in range(len(pts)):
            a, b = pts[i - 1], pts[i]
            da, db = dentro(a), dentro(b)
            if db:
                if not da:
                    out.append(cruce(a, b))
                out.append(b)
            elif da:
                out.append(cruce(a, b))
        return out

    def cruce_x(x):
        return lambda a, b: (x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]))

    def cruce_z(z):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]), z)

    pts = list(p)
    for dentro, cruce in (
        (lambda q: q[0] >= minx, cruce_x(minx)), (lambda q: q[0] <= maxx, cruce_x(maxx)),
        (lambda q: q[1] >= minz, cruce_z(minz)), (lambda q: q[1] <= maxz, cruce_z(maxz)),
    ):
        pts = lado(pts, dentro, cruce)
        if len(pts) < 3:
            return []
    return [(round(x, 2), round(z, 2)) for x, z in pts]


def clasificar_edificio(t: dict) -> str:
    b = t.get("building", "yes")
    am = t.get("amenity", "")
    if am == "marketplace":
        return "mercado"
    if b == "stadium" or t.get("leisure") == "stadium":
        return "estadio"
    if am == "place_of_worship" or b in ("church", "chapel", "cathedral"):
        return "iglesia"
    if am in ("school", "kindergarten", "college", "university") or b == "school":
        return "colegio"
    if am == "fire_station" or b == "fire_station":
        return "bomberos"
    if am in ("clinic", "hospital", "doctors", "pharmacy"):
        return "sanidad"
    if am == "library":
        return "biblioteca"
    if "shop" in t or b in ("retail", "commercial", "kiosk"):
        return "comercio"
    if b in ("garage", "garages"):
        return "garaje"
    if b in ("industrial", "warehouse"):
        return "nave"
    if b == "public" or am:
        return "publico"
    return "bloque"


def color_edificio(tipo: str, oid: int, paleta: list[str]) -> str:
    if tipo in COLOR_TIPO:
        return COLOR_TIPO[tipo]
    return paleta[hash_id(oid) % len(paleta)]


def nombre_via(t: dict) -> str:
    n = t.get("name", "")
    if not n and t.get("highway") == "pedestrian":
        return "Pasaje"
    return n


def generar(bbox: str, nombre_cache: str, salida: Path, perfil: dict | None = None) -> dict:
    perfil = perfil or PERFILES["pino-montano"]
    paleta = perfil["paleta"]
    plantas_defecto = perfil["plantas"]
    alto_planta = perfil["alto_planta"]
    datos = descargar(bbox, nombre_cache)
    proy = Proyeccion(bbox)
    # Overpass devuelve los nodos con etiquetas primero (out body) y luego todos sin ellas
    # (out skel): hay que quedarse con la versión etiquetada cuando existe.
    nodos: dict = {}
    for e in datos["elements"]:
        if e["type"] != "node":
            continue
        if e["id"] not in nodos or e.get("tags"):
            nodos[e["id"]] = e
    vias = {e["id"]: e for e in datos["elements"] if e["type"] == "way"}
    relaciones = [e for e in datos["elements"] if e["type"] == "relation"]

    def coords(way: dict) -> list[tuple[float, float]]:
        out = []
        for nid in way["nodes"]:
            n = nodos.get(nid)
            if n:
                out.append(proy.xz(n["lat"], n["lon"]))
        return out

    def anillo(way: dict) -> list[tuple[float, float]]:
        pts = coords(way)
        if len(pts) > 1 and pts[0] == pts[-1]:
            pts = pts[:-1]
        return pts

    # ---- Edificios --------------------------------------------------------
    edificios = []
    en_relacion: set[int] = set()

    def edificio(oid: int, t: dict, exterior: list, huecos: list) -> None:
        if len(exterior) < 3:
            return
        exterior = simplificar(exterior)
        huecos = [simplificar(h) for h in huecos]
        if area_firmada(exterior) < 0:  # orientación uniforme (sentido horario en xz)
            exterior = exterior[::-1]
        huecos = [h[::-1] if area_firmada(h) > 0 else h for h in huecos if len(h) >= 3]
        tipo = clasificar_edificio(t)
        b = t.get("building", "yes")
        try:
            plantas = int(float(t["building:levels"]))
        except (KeyError, ValueError):
            plantas = plantas_defecto.get(b, plantas_defecto.get("yes", 4))
            if tipo in ("mercado", "comercio"):
                plantas = 1
            elif tipo in ("colegio", "sanidad", "biblioteca", "publico", "bomberos"):
                plantas = 2
            elif tipo == "iglesia":
                plantas = 5
        try:
            altura = float(t["height"])
        except (KeyError, ValueError):
            altura = plantas * alto_planta + (0.8 if tipo == "bloque" else 0.4)
        ed = {
            "id": oid,
            "tipo": tipo,
            "plantas": plantas,
            "altura": round(altura, 2),
            "color": t.get("building:colour") or color_edificio(tipo, oid, paleta),
            "poligono": [list(p) for p in exterior],
        }
        if huecos:
            ed["huecos"] = [[list(p) for p in h] for h in huecos]
        if t.get("name"):
            ed["nombre"] = t["name"]
        if t.get("roof:shape"):
            ed["tejado"] = t["roof:shape"]
        edificios.append(ed)

    for rel in relaciones:
        t = rel.get("tags", {})
        if "building" not in t:
            continue
        exteriores, interiores = [], []
        for m in rel.get("members", []):
            if m["type"] != "way" or m["ref"] not in vias:
                continue
            en_relacion.add(m["ref"])
            r = anillo(vias[m["ref"]])
            (interiores if m.get("role") == "inner" else exteriores).append(r)
        if exteriores:
            exteriores.sort(key=lambda r: -abs(area_firmada(r)))
            edificio(rel["id"], t, exteriores[0], interiores)
            for extra in exteriores[1:]:
                edificio(rel["id"] * 10 + exteriores.index(extra), t, extra, [])

    for wid, w in vias.items():
        t = w.get("tags", {})
        if "building" in t and wid not in en_relacion:
            edificio(wid, t, anillo(w), [])

    # ---- Vías y grafo -------------------------------------------------------
    vias_out = []
    grafo_idx: dict[int, int] = {}
    grafo_nodos: list[list[float]] = []
    grafo_aristas: list[list] = []
    # Semáforos: los de cruce (highway=traffic_signals) y los de paso de peatones
    # (crossing=traffic_signals), siempre que estén sobre una calle rodada.
    en_rodada = {nid for w in vias.values() if w.get("tags", {}).get("highway") in VIAS_RODADAS for nid in w["nodes"]}
    cruces_semaforo = {nid for nid, n in nodos.items() if nid in en_rodada
                       and (n.get("tags", {}).get("highway") == "traffic_signals" or n.get("tags", {}).get("crossing") == "traffic_signals")}

    def idx_nodo(nid: int) -> int:
        if nid not in grafo_idx:
            n = nodos[nid]
            grafo_idx[nid] = len(grafo_nodos)
            grafo_nodos.append(list(proy.xz(n["lat"], n["lon"])))
        return grafo_idx[nid]

    for wid, w in vias.items():
        t = w.get("tags", {})
        hw = t.get("highway")
        if not hw:
            continue
        if hw in VIAS_RODADAS:
            clase, ancho = "rodada", VIAS_RODADAS[hw]
        elif hw in VIAS_PEATONALES:
            clase, ancho = "peatonal", VIAS_PEATONALES[hw]
        else:
            continue
        pts = coords(w)
        if len(pts) < 2:
            continue
        try:
            ancho = float(t["width"])
        except (KeyError, ValueError):
            pass
        sentido_unico = t.get("oneway") in ("yes", "true", "1")
        vias_out.append({
            "id": wid,
            "clase": clase,
            "tipo": hw,
            "nombre": nombre_via(t),
            "ancho": ancho,
            "puntos": [list(p) for p in pts],
            **({"unico": True} if sentido_unico else {}),
        })
        ids = [nid for nid in w["nodes"] if nid in nodos]
        for a, b in zip(ids, ids[1:]):
            ia, ib = idx_nodo(a), idx_nodo(b)
            if ia == ib:
                continue
            grafo_aristas.append([ia, ib, clase, wid] + ([1] if sentido_unico else []))

    # ---- Puntos de interés, árboles, zonas verdes --------------------------
    pois = []
    for e in datos["elements"]:
        t = e.get("tags", {})
        if not t or not (t.get("amenity") or t.get("shop") or t.get("highway") == "bus_stop"):
            continue
        if t.get("amenity") in ("bicycle_parking", "bench", "drinking_water"):
            continue
        if e["type"] == "node":
            x, z = proy.xz(e["lat"], e["lon"])
        elif e["type"] == "way":
            pts = coords(e)
            if not pts:
                continue
            x = round(sum(p[0] for p in pts) / len(pts), 2)
            z = round(sum(p[1] for p in pts) / len(pts), 2)
        else:
            continue
        clase = t.get("amenity") or t.get("shop") or "bus_stop"
        pois.append({"nombre": t.get("name", ""), "clase": clase, "x": x, "z": z,
                     **({"ref": t["ref"]} if t.get("ref") else {})})

    arboles = [list(proy.xz(e["lat"], e["lon"])) for e in datos["elements"]
               if e["type"] == "node" and e.get("tags", {}).get("natural") == "tree"]
    bancos = [list(proy.xz(e["lat"], e["lon"])) for e in datos["elements"]
              if e["type"] == "node" and e.get("tags", {}).get("amenity") == "bench"]

    semaforos = [list(proy.xz(n["lat"], n["lon"])) for nid, n in nodos.items() if nid in cruces_semaforo]
    pasos_cebra = [list(proy.xz(n["lat"], n["lon"])) for nid, n in nodos.items()
                   if n.get("tags", {}).get("highway") == "crossing" and nid not in cruces_semaforo]

    zonas = []
    for w in vias.values():
        t = w.get("tags", {})
        clase = None
        if t.get("leisure") in ("park", "garden", "playground", "pitch"):
            clase = t["leisure"]
        elif t.get("landuse") in ("grass", "greenfield", "village_green"):
            clase = "grass"
        elif t.get("amenity") == "parking" and "building" not in t:
            clase = "parking"
        elif t.get("natural") == "water" or t.get("waterway") == "riverbank":
            clase = "water"
        if clase:
            r = anillo(w)
            if clase == "water":
                ancho, fondo = proy.tamano
                r = recortar(r, -ancho / 2 - 40, -fondo / 2 - 40, ancho / 2 + 40, fondo / 2 + 40)
            if len(r) >= 3:
                zonas.append({"clase": clase, "poligono": [list(p) for p in r]})

    nivel = {
        "nombre": perfil["nombre"],
        "bbox": [float(v) for v in bbox.split(",")],
        "tamano": list(proy.tamano),
        "edificios": edificios,
        "vias": vias_out,
        "grafo": {"nodos": grafo_nodos, "aristas": grafo_aristas},
        "pois": pois,
        "arboles": arboles,
        "bancos": bancos,
        "zonas": zonas,
        "semaforos": semaforos,
        "pasos": pasos_cebra,
        "atribucion": "© colaboradores de OpenStreetMap (ODbL)",
    }
    salida.mkdir(parents=True, exist_ok=True)
    (salida / "nivel.json").write_text(json.dumps(nivel, ensure_ascii=False, separators=(",", ":")))
    return nivel


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    raiz = Path(__file__).parent.parent / "public" / "barrios"
    if args and args[0] in PERFILES:
        perfil = PERFILES[args[0]]
        bbox, nombre = perfil["bbox"], perfil["cache"]
        salida = Path(args[1]) if len(args) > 1 else raiz / args[0]
    else:
        perfil = PERFILES["pino-montano"]
        bbox = args[0] if args else BBOX_MERCADO
        nombre = args[1] if len(args) > 1 else "pino-montano-mercado"
        salida = Path(args[2]) if len(args) > 2 else raiz / "pino-montano"
    n = generar(bbox, nombre, salida, perfil)
    print(f"{len(n['edificios'])} edificios, {len(n['vias'])} vías, {len(n['grafo']['nodos'])} nodos / "
          f"{len(n['grafo']['aristas'])} aristas, {len(n['pois'])} POIs, {len(n['arboles'])} árboles, "
          f"{len(n['zonas'])} zonas, {len(n['semaforos'])} semáforos, {len(n['pasos'])} pasos → {salida / 'nivel.json'} ({(salida / 'nivel.json').stat().st_size // 1024} KB)")
