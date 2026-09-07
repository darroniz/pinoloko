#!/usr/bin/env python3
"""Descarga los datos de OpenStreetMap de una caja y los cachea en el repo.

Solo stdlib: en la Pi no hay pip ni numpy, y no hacen falta.
Uso:  python3 tools/osm_descarga.py [sur,oeste,norte,este] [nombre]
La caché vive en tools/cache-osm/<nombre>.json y se reutiliza si existe;
para forzar una descarga nueva, borra el fichero o pasa --forzar.
"""
from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

CACHE = Path(__file__).parent / "cache-osm"
OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

QUERY = """
[out:json][timeout:90];
(
  way["building"]({bbox});
  relation["building"]({bbox});
  way["highway"]({bbox});
  node["amenity"]({bbox});
  way["amenity"]({bbox});
  node["shop"]({bbox});
  way["shop"]({bbox});
  node["natural"="tree"]({bbox});
  way["leisure"]({bbox});
  way["landuse"]({bbox});
  way["natural"]({bbox});
  node["highway"="bus_stop"]({bbox});
  node["highway"="crossing"]({bbox});
  node["highway"="traffic_signals"]({bbox});
);
out body;
>;
out skel qt;
"""


def descargar(bbox: str, nombre: str, forzar: bool = False) -> dict:
    CACHE.mkdir(exist_ok=True)
    destino = CACHE / f"{nombre}.json"
    if destino.exists() and not forzar:
        return json.loads(destino.read_text())
    consulta = QUERY.format(bbox=bbox)
    datos = urllib.parse.urlencode({"data": consulta}).encode()
    ultimo_error: Exception | None = None
    for servidor in OVERPASS:
        for intento in range(3):
            try:
                req = urllib.request.Request(servidor, data=datos, headers={"User-Agent": "pinoloko/0.1 (juego personal)"})
                with urllib.request.urlopen(req, timeout=120) as resp:
                    cuerpo = json.loads(resp.read().decode())
                tmp = destino.with_suffix(".json.tmp")
                tmp.write_text(json.dumps(cuerpo, ensure_ascii=False, separators=(",", ":")))
                tmp.replace(destino)
                return cuerpo
            except Exception as exc:  # noqa: BLE001 — cualquier fallo de red reintenta
                ultimo_error = exc
                time.sleep(5 * (intento + 1))
    raise SystemExit(f"No se pudo descargar OSM: {ultimo_error}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    bbox = args[0] if args else "37.42020,-5.96658,37.42470,-5.96092"
    nombre = args[1] if len(args) > 1 else "pino-montano-mercado"
    datos = descargar(bbox, nombre, forzar="--forzar" in sys.argv)
    print(f"{len(datos.get('elements', []))} elementos en {CACHE / (nombre + '.json')}")
