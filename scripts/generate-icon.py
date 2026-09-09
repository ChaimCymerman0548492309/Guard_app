#!/usr/bin/env python3
"""Generate Guardian app icon (1024x1024 PNG) using only the Python standard library."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

SIZE = 1024
BG = (30, 58, 95)  # #1e3a5f
SHIELD = (56, 189, 248)  # #38bdf8
SHIELD_DARK = (14, 116, 144)  # #0e7490


def png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def inside_shield(x: float, y: float) -> bool:
    cx, top, bottom = 0.5, 0.16, 0.86
    if y < top or y > bottom:
        return False
    half = 0.34 * (1 - (y - top) / (bottom - top) * 0.35)
    return abs(x - cx) <= half


def pixel_color(x: int, y: int) -> tuple[int, int, int, int]:
    nx, ny = x / SIZE, y / SIZE
    if inside_shield(nx, ny):
        inner = inside_shield(nx, ny - 0.03) and ny < 0.62
        if inner:
            return (*SHIELD_DARK, 255)
        return (*SHIELD, 255)
    return (*BG, 255)


def write_png(path: Path) -> None:
    raw = bytearray()
    for y in range(SIZE):
        raw.append(0)
        for x in range(SIZE):
            raw.extend(pixel_color(x, y))

    compressed = zlib.compress(bytes(raw), 9)
    ihdr = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", compressed)
        + png_chunk(b"IEND", b"")
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    icon = root / "apps" / "mobile" / "assets" / "icon.png"
    write_png(icon)
    print(f"Wrote {icon}")


if __name__ == "__main__":
    main()
