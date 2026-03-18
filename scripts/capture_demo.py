#!/usr/bin/env python3

from __future__ import annotations

import time
from pathlib import Path

import pexpect
import pyte
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "assets"
APP = ROOT / "brewcli"

COLS = 118
ROWS = 34
PADDING_X = 24
PADDING_Y = 24
HEADER_H = 34
CELL_W = 9
CELL_H = 18

FRAME_BG = "#11111b"
PANEL_BG = "#1e1e2e"
PANEL_BORDER = "#45475a"
HEADER_BG = "#181825"
TEXT = "#cdd6f4"
MUTED = "#a6adc8"

ANSI = {
    "black": "#1e1e2e",
    "red": "#f38ba8",
    "green": "#a6e3a1",
    "yellow": "#f9e2af",
    "blue": "#89b4fa",
    "magenta": "#f5c2e7",
    "cyan": "#89dceb",
    "white": "#cdd6f4",
    "default": TEXT,
}


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/SFNSMono.ttf",
        "/System/Library/Fonts/Menlo.ttc",
        "/System/Library/Fonts/Courier.dfont",
    ):
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


FONT = load_font(14)
FONT_BOLD = load_font(14)


def rgb(value: str | None, default: str, *, allow_ansi_default: bool) -> str:
    if not value:
        return default
    if value.startswith("#"):
        return value
    if value == "default" and not allow_ansi_default:
        return default
    return ANSI.get(value, default)


def drain(child: pexpect.spawn, stream: pyte.Stream, settle: float = 0.5) -> None:
    deadline = time.time() + settle
    while True:
        try:
            chunk = child.read_nonblocking(size=65535, timeout=0.05)
        except pexpect.TIMEOUT:
            if time.time() >= deadline:
                break
            continue
        except pexpect.EOF:
            break
        else:
            if not chunk:
                if time.time() >= deadline:
                    break
                continue
            stream.feed(chunk)
            deadline = time.time() + settle


def send_keys(
    child: pexpect.spawn, stream: pyte.Stream, keys: list[str], pause: float = 0.2
) -> None:
    for key in keys:
        child.send(key)
        time.sleep(pause)
        drain(child, stream, settle=0.2)


def render(screen: pyte.Screen, title: str) -> Image.Image:
    width = PADDING_X * 2 + COLS * CELL_W
    height = PADDING_Y * 2 + HEADER_H + ROWS * CELL_H
    image = Image.new("RGB", (width, height), FRAME_BG)
    draw = ImageDraw.Draw(image)

    panel_x0 = PADDING_X
    panel_y0 = PADDING_Y
    panel_x1 = width - PADDING_X
    panel_y1 = height - PADDING_Y

    draw.rounded_rectangle(
        (panel_x0, panel_y0, panel_x1, panel_y1),
        radius=18,
        fill=PANEL_BG,
        outline=PANEL_BORDER,
        width=1,
    )
    draw.rounded_rectangle(
        (panel_x0, panel_y0, panel_x1, panel_y0 + HEADER_H),
        radius=18,
        fill=HEADER_BG,
        outline=HEADER_BG,
    )
    draw.text(
        (panel_x0 + 18, panel_y0 + 9),
        f"brewcli demo - {title}",
        fill=TEXT,
        font=FONT_BOLD,
    )

    screen_x = panel_x0 + 14
    screen_y = panel_y0 + HEADER_H + 12

    for y in range(ROWS):
        row = screen.buffer[y]
        for x in range(COLS):
            char = row[x]
            bg = rgb(getattr(char, "bg", None), PANEL_BG, allow_ansi_default=False)
            fg = rgb(getattr(char, "fg", None), TEXT, allow_ansi_default=True)
            if getattr(char, "reverse", False):
                bg, fg = fg, bg

            cell_x = screen_x + x * CELL_W
            cell_y = screen_y + y * CELL_H
            if bg != PANEL_BG:
                draw.rectangle(
                    (cell_x, cell_y, cell_x + CELL_W, cell_y + CELL_H), fill=bg
                )

            text = char.data if char.data != " " else " "
            if text.strip():
                draw.text((cell_x, cell_y - 1), text, fill=fg, font=FONT)

    return image


def capture_frames() -> list[tuple[str, Image.Image]]:
    if not APP.exists():
        raise SystemExit("Build brewcli first with `make build`.")

    OUT.mkdir(parents=True, exist_ok=True)
    screen = pyte.Screen(COLS, ROWS)
    stream = pyte.Stream(screen)
    child = pexpect.spawn(
        str(APP), dimensions=(ROWS, COLS), encoding="utf-8", timeout=5
    )
    child.delaybeforesend = 0.05

    steps = [
        ("dashboard", 3.0, None),
        ("formulae", 2.0, ["j", "\r"]),
        ("detail", 1.5, ["\r"]),
        ("search", 2.0, ["\x1b", "/", "g", "i", "t"]),
    ]

    frames: list[tuple[str, Image.Image]] = []
    try:
        for name, wait_s, keys in steps:
            if keys:
                send_keys(child, stream, keys)
            time.sleep(wait_s)
            drain(child, stream)
            frames.append((name, render(screen, name)))
    finally:
        try:
            child.send("q")
            time.sleep(0.2)
        except Exception:
            pass
        child.close(force=True)

    return frames


def main() -> None:
    frames = capture_frames()
    stills = {
        "dashboard": "dashboard.png",
        "formulae": "formulae.png",
        "detail": "detail.png",
    }
    for name, image in frames:
        if name in stills:
            image.save(OUT / stills[name])

    gif_frames = [image for _, image in frames]
    if gif_frames:
        gif_frames[0].save(
            OUT / "demo.gif",
            save_all=True,
            append_images=gif_frames[1:],
            duration=[1800, 1800, 1800, 1800][: len(gif_frames)],
            loop=0,
        )


if __name__ == "__main__":
    main()
