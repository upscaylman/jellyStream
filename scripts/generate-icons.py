"""
Génère icon.png, adaptive-icon.png et favicon.png depuis logo.png avec fond noir.
"""
from PIL import Image
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(BASE, "assets", "images", "logo.png")
OUT_ICON = os.path.join(BASE, "assets", "images", "icon.png")
OUT_ADAPTIVE = os.path.join(BASE, "assets", "images", "adaptive-icon.png")
OUT_FAVICON = os.path.join(BASE, "assets", "images", "favicon.png")

logo = Image.open(LOGO).convert("RGBA")

# --- icon.png (1024x1024, logo centré fond noir, padding 15%) ---
TARGET = 1024
PADDING = int(TARGET * 0.15)
logo_size = TARGET - PADDING * 2

logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
canvas = Image.new("RGBA", (TARGET, TARGET), (0, 0, 0, 255))
canvas.paste(logo_resized, (PADDING, PADDING), logo_resized)
canvas.convert("RGB").save(OUT_ICON, "PNG")
print(f"✓ icon.png ({TARGET}x{TARGET})")

# --- adaptive-icon.png (1024x1024, logo centré fond noir, padding 20%) ---
TARGET = 1024
PADDING = int(TARGET * 0.20)
logo_size = TARGET - PADDING * 2

logo_resized = logo.resize((logo_size, logo_size), Image.LANCZOS)
canvas = Image.new("RGBA", (TARGET, TARGET), (0, 0, 0, 255))
canvas.paste(logo_resized, (PADDING, PADDING), logo_resized)
canvas.convert("RGB").save(OUT_ADAPTIVE, "PNG")
print(f"✓ adaptive-icon.png ({TARGET}x{TARGET})")

# --- favicon.png (48x48 pour les onglets navigateur, fond transparent) ---
FAV_SIZE = 48
logo_resized = logo.resize((FAV_SIZE, FAV_SIZE), Image.LANCZOS)
logo_resized.save(OUT_FAVICON, "PNG")
print(f"✓ favicon.png ({FAV_SIZE}x{FAV_SIZE})")

print("\nIcônes générées avec succès.")
