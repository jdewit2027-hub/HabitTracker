#!/usr/bin/env python3
"""Generate a Minecraft-style 5x7 pixel TTF ("Voxel Pixel") with no deps.

Glyphs are drawn on a 5-wide grid, 7 rows above the baseline plus one row
below for descenders. Every pixel becomes a 128-unit square (upem 1024).
Lowercase letters map to the uppercase outlines via cmap.
"""
import struct, sys, time

PX = 128
UPEM = 1024
ADV = 6 * PX  # 5px glyph + 1px gap, monospaced like the Minecraft HUD font

# rows top->bottom; rows[0..6] above baseline, rows[7] below (descender)
G = {}
def d(ch, *rows):
    rows = list(rows)
    while len(rows) < 8:
        rows.append("00000")
    assert len(rows) == 8 and all(len(r) == 5 for r in rows), ch
    G[ch] = rows

d(' ', "00000")
d('!', "00100","00100","00100","00100","00100","00000","00100")
d('"', "01010","01010")
d('%', "11000","11001","00010","00100","01000","10011","00011")
d('&', "01100","10010","10100","01000","10101","10010","01101")
d("'", "00100","00100")
d('(', "00010","00100","01000","01000","01000","00100","00010")
d(')', "01000","00100","00010","00010","00010","00100","01000")
d('+', "00000","00100","00100","11111","00100","00100","00000")
d(',', "00000","00000","00000","00000","00000","01100","01100","01000")
d('-', "00000","00000","00000","01110","00000","00000","00000")
d('.', "00000","00000","00000","00000","00000","01100","01100")
d('/', "00001","00001","00010","00100","01000","10000","10000")
d('0', "01110","10001","10011","10101","11001","10001","01110")
d('1', "00100","01100","00100","00100","00100","00100","01110")
d('2', "01110","10001","00001","00010","00100","01000","11111")
d('3', "01110","10001","00001","00110","00001","10001","01110")
d('4', "00010","00110","01010","10010","11111","00010","00010")
d('5', "11111","10000","11110","00001","00001","10001","01110")
d('6', "00110","01000","10000","11110","10001","10001","01110")
d('7', "11111","00001","00010","00100","01000","01000","01000")
d('8', "01110","10001","10001","01110","10001","10001","01110")
d('9', "01110","10001","10001","01111","00001","00010","01100")
d(':', "00000","01100","01100","00000","00000","01100","01100")
d(';', "00000","01100","01100","00000","00000","01100","01100","01000")
d('?', "01110","10001","00001","00010","00100","00000","00100")
d('A', "01110","10001","10001","11111","10001","10001","10001")
d('B', "11110","10001","10001","11110","10001","10001","11110")
d('C', "01110","10001","10000","10000","10000","10001","01110")
d('D', "11110","10001","10001","10001","10001","10001","11110")
d('E', "11111","10000","10000","11110","10000","10000","11111")
d('F', "11111","10000","10000","11110","10000","10000","10000")
d('G', "01110","10001","10000","10111","10001","10001","01111")
d('H', "10001","10001","10001","11111","10001","10001","10001")
d('I', "01110","00100","00100","00100","00100","00100","01110")
d('J', "00111","00010","00010","00010","00010","10010","01100")
d('K', "10001","10010","10100","11000","10100","10010","10001")
d('L', "10000","10000","10000","10000","10000","10000","11111")
d('M', "10001","11011","10101","10101","10001","10001","10001")
d('N', "10001","11001","10101","10011","10001","10001","10001")
d('O', "01110","10001","10001","10001","10001","10001","01110")
d('P', "11110","10001","10001","11110","10000","10000","10000")
d('Q', "01110","10001","10001","10001","10101","10010","01101")
d('R', "11110","10001","10001","11110","10100","10010","10001")
d('S', "01111","10000","10000","01110","00001","00001","11110")
d('T', "11111","00100","00100","00100","00100","00100","00100")
d('U', "10001","10001","10001","10001","10001","10001","01110")
d('V', "10001","10001","10001","10001","10001","01010","00100")
d('W', "10001","10001","10001","10101","10101","11011","10001")
d('X', "10001","10001","01010","00100","01010","10001","10001")
d('Y', "10001","10001","01010","00100","00100","00100","00100")
d('Z', "11111","00001","00010","00100","01000","10000","11111")
d('a', "00000","00000","01110","00001","01111","10001","01111")
d('b', "10000","10000","11110","10001","10001","10001","11110")
d('c', "00000","00000","01110","10000","10000","10001","01110")
d('d', "00001","00001","01111","10001","10001","10001","01111")
d('e', "00000","00000","01110","10001","11111","10000","01110")
d('f', "00110","01001","01000","11100","01000","01000","01000")
d('g', "00000","00000","01111","10001","10001","01111","00001","01110")
d('h', "10000","10000","11110","10001","10001","10001","10001")
d('i', "00100","00000","01100","00100","00100","00100","01110")
d('j', "00010","00000","00110","00010","00010","00010","10010","01100")
d('k', "10000","10000","10010","10100","11000","10100","10010")
d('l', "01100","00100","00100","00100","00100","00100","01110")
d('m', "00000","00000","11010","10101","10101","10101","10101")
d('n', "00000","00000","11110","10001","10001","10001","10001")
d('o', "00000","00000","01110","10001","10001","10001","01110")
d('p', "00000","00000","11110","10001","10001","11110","10000","10000")
d('q', "00000","00000","01111","10001","10001","01111","00001","00001")
d('r', "00000","00000","10110","11001","10000","10000","10000")
d('s', "00000","00000","01111","10000","01110","00001","11110")
d('t', "01000","01000","11100","01000","01000","01001","00110")
d('u', "00000","00000","10001","10001","10001","10011","01101")
d('v', "00000","00000","10001","10001","10001","01010","00100")
d('w', "00000","00000","10001","10001","10101","10101","01010")
d('x', "00000","00000","10001","01010","00100","01010","10001")
d('y', "00000","00000","10001","10001","10001","01111","00001","01110")
d('z', "00000","00000","11111","00010","00100","01000","11111")
d('–', "00000","00000","00000","11111","00000","00000","00000")
d('—', "00000","00000","00000","11111","00000","00000","00000")
d('‘', "00100","00100")
d('’', "00100","00100")
d('“', "01010","01010")
d('”', "01010","01010")
d('…', "00000","00000","00000","00000","00000","10101","10101")

CODES = sorted(ord(c) for c in G)          # one glyph per codepoint
GIDS = {cp: i + 1 for i, cp in enumerate(CODES)}  # gid 0 = .notdef
NUMG = len(CODES) + 1

def rects(rows):
    """Merge horizontal pixel runs into rectangles (font units, y-up)."""
    out = []
    for r, row in enumerate(rows):
        c = 0
        while c < 5:
            if row[c] == '1':
                c0 = c
                while c < 5 and row[c] == '1':
                    c += 1
                y_top = (7 - r) * PX          # row 0 top edge = 896
                out.append((c0 * PX, y_top - PX, c * PX, y_top))
            else:
                c += 1
    return out

def glyf_bytes(rows):
    rs = rects(rows)
    if not rs:
        return b'', (0, 0, 0, 0)
    xmin = min(r[0] for r in rs); ymin = min(r[1] for r in rs)
    xmax = max(r[2] for r in rs); ymax = max(r[3] for r in rs)
    endpts, flags, xs, ys = [], [], [], []
    px = py = 0
    n = -1
    for (x0, y0, x1, y1) in rs:
        for (x, y) in ((x0, y0), (x1, y0), (x1, y1), (x0, y1)):
            flags.append(1)                   # on-curve, long deltas
            xs.append(x - px); ys.append(y - py)
            px, py = x, y
            n += 1
        endpts.append(n)
    b = struct.pack('>hhhhh', len(rs), xmin, ymin, xmax, ymax)
    b += struct.pack('>%dH' % len(endpts), *endpts)
    b += struct.pack('>H', 0)                 # no instructions
    b += bytes(flags)
    b += struct.pack('>%dh' % len(xs), *xs)
    b += struct.pack('>%dh' % len(ys), *ys)
    if len(b) % 4:
        b += b'\0' * (4 - len(b) % 4)
    return b, (xmin, ymin, xmax, ymax)

# ---- glyf + loca + metrics ----
glyf = b''
loca = [0]
bboxes = [(0, 0, 0, 0)]                       # .notdef: empty
hmtx = [(ADV, 0)]
glyf += b''                                    # empty .notdef
loca.append(len(glyf))
for cp in CODES:
    b, bb = glyf_bytes(G[chr(cp)])
    glyf += b
    loca.append(len(glyf))
    bboxes.append(bb)
    hmtx.append((ADV, bb[0] if b else 0))

fxmin = min(b[0] for b in bboxes); fymin = min(b[1] for b in bboxes)
fxmax = max(b[2] for b in bboxes); fymax = max(b[3] for b in bboxes)

loca_b = struct.pack('>%dI' % len(loca), *loca)
hmtx_b = b''.join(struct.pack('>Hh', a, l) for a, l in hmtx)

# ---- cmap format 4 ----
segs = []
run_start = CODES[0]
prev = CODES[0]
for cp in CODES[1:]:
    if cp != prev + 1:
        segs.append((run_start, prev, (GIDS[run_start] - run_start) & 0xFFFF))
        run_start = cp
    prev = cp
segs.append((run_start, prev, (GIDS[run_start] - run_start) & 0xFFFF))
segs.sort(key=lambda s: s[1])
segs.append((0xFFFF, 0xFFFF, 1))
segc = len(segs)
import math
sr = 2 * (2 ** int(math.floor(math.log2(segc))))
sub = struct.pack('>HHHHHHH', 4, 16 + 8 * segc, 0, segc * 2, sr,
                  int(math.log2(sr // 2)), segc * 2 - sr)
sub += struct.pack('>%dH' % segc, *[s[1] for s in segs]) + b'\0\0'
sub += struct.pack('>%dH' % segc, *[s[0] for s in segs])
sub += struct.pack('>%dH' % segc, *[s[2] for s in segs])
sub += struct.pack('>%dH' % segc, *([0] * segc))
cmap = struct.pack('>HHHHI', 0, 1, 3, 1, 12) + sub

# ---- head / hhea / maxp / post / OS/2 / name ----
now = int(time.time()) + 2082844800
head = struct.pack('>IIIIHHqqhhhhHHhhh',
    0x00010000, 0x00010000, 0, 0x5F0F3CF5, 0x0003, UPEM, now, now,
    fxmin, fymin, fxmax, fymax, 0, 8, 2, 1, 0)

maxpts = 4 * max(len(rects(G[chr(cp)])) for cp in CODES)
hhea = struct.pack('>IhhhHhhhhhhhhhhhH',
    0x00010000, 896, -160, 160, ADV, 0, 0, fxmax, 1, 0, 0, 0, 0, 0, 0, 0, NUMG)
maxp = struct.pack('>IHHHHHHHHHHHHHH', 0x00010000, NUMG, maxpts, maxpts // 4,
                   0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0)
post = struct.pack('>IihhIIIII', 0x00030000, 0, -160, 64, 1, 0, 0, 0, 0)
os2 = struct.pack('>HhHHHhhhhhhhhhhh', 4, ADV, 400, 5, 0,
                  512, 512, 0, 77, 512, 512, 0, 512, 64, 460, 0)
os2 += b'\0' * 10                              # panose
os2 += struct.pack('>IIII', 0x80000001, 0, 0, 0)
os2 += b'VOXL'
os2 += struct.pack('>HHHhhhHH', 0x0040, 32, 0x2026, 896, -160, 160, 1024, 256)
os2 += struct.pack('>II', 0x00000001, 0)
os2 += struct.pack('>hhHHH', 640, 896, 0, 32, 1)

def name_table():
    names = [(1, "Voxel Pixel"), (2, "Regular"),
             (3, "VoxelPixel-1.0"), (4, "Voxel Pixel"),
             (5, "Version 1.0"), (6, "VoxelPixel-Regular")]
    recs = b''; strs = b''
    for nid, s in names:
        enc = s.encode('utf-16-be')
        recs += struct.pack('>HHHHHH', 3, 1, 0x409, nid, len(enc), len(strs))
        strs += enc
    return struct.pack('>HHH', 0, len(names), 6 + 12 * len(names)) + recs + strs
name = name_table()

tables = {'OS/2': os2, 'cmap': cmap, 'glyf': glyf, 'head': head,
          'hhea': hhea, 'hmtx': hmtx_b, 'loca': loca_b, 'maxp': maxp,
          'name': name, 'post': post}

def cksum(b):
    if len(b) % 4:
        b += b'\0' * (4 - len(b) % 4)
    return sum(struct.unpack('>%dI' % (len(b) // 4), b)) & 0xFFFFFFFF

tags = sorted(tables)
n = len(tags)
p2 = 2 ** int(math.floor(math.log2(n)))
hdr = struct.pack('>IHHHH', 0x00010000, n, p2 * 16, int(math.log2(p2)), n * 16 - p2 * 16)
off = 12 + 16 * n
dirb = b''; body = b''
offsets = {}
for t in tags:
    data = tables[t]
    offsets[t] = off + len(body)
    dirb += struct.pack('>4sIII', t.encode(), cksum(data), off + len(body), len(data))
    body += data + (b'\0' * ((4 - len(data) % 4) % 4))
font = bytearray(hdr + dirb + body)
adj = (0xB1B0AFBA - cksum(bytes(font))) & 0xFFFFFFFF
struct.pack_into('>I', font, offsets['head'] + 8, adj)

out = sys.argv[1] if len(sys.argv) > 1 else 'voxel-pixel.ttf'
with open(out, 'wb') as f:
    f.write(bytes(font))
print('wrote', out, len(font), 'bytes,', NUMG, 'glyphs')
