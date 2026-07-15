"""Gera icones PWA (bandeira IT) — apenas biblioteca padrao."""
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def crc32(data: bytes) -> int:
    return zlib.crc32(data) & 0xFFFFFFFF


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc32(tag + data))


def png_rgba(size: int, draw) -> bytes:
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            r, g, b, a = draw(x, y, size)
            rows.extend((r, g, b, a))
    comp = zlib.compress(bytes(rows), 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", comp) + chunk(b"IEND", b"")


def draw_icon(x, y, size):
    pad = int(size * 0.08)
    inner = size - pad * 2
    ix, iy = x - pad, y - pad
    if ix < 0 or iy < 0 or ix >= inner or iy >= inner:
        return (0, 98, 188, 255)
    third = inner / 3
    if ix < third:
        return (0, 146, 70, 255)
    if ix < third * 2:
        return (255, 255, 255, 255)
    return (206, 43, 55, 255)


def draw_maskable(x, y, size):
    cx = cy = size / 2
    r = size * 0.42
    if (x - cx + 0.5) ** 2 + (y - cy + 0.5) ** 2 > r * r:
        return (15, 20, 32, 255)
    return draw_icon(x, y, size)


for name, sz, fn in [
    ("icon-192.png", 192, draw_icon),
    ("icon-512.png", 512, draw_icon),
    ("icon-512-maskable.png", 512, draw_maskable),
]:
    out = ROOT / name
    out.write_bytes(png_rgba(sz, fn))
    print(f"OK {name} {sz}x{sz}")
