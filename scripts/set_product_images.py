"""Update placeholder SVG images on products that still have data URI placeholders.
Skips products with uploaded images (/uploads/...)."""
import base64
from packages.db.session import SessionLocal
from packages.db.models import Product


def make_svg(icon_char, bg_color, label):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="16" fill="{bg_color}"/>
  <text x="100" y="80" font-size="56" fill="rgba(255,255,255,0.6)" text-anchor="middle" dominant-baseline="central" font-family="sans-serif">{icon_char}</text>
  <text x="100" y="145" font-size="16" fill="white" text-anchor="middle" font-family="sans-serif" font-weight="600">{label}</text>
</svg>'''
    b64 = base64.b64encode(svg.encode()).decode()
    return f"data:image/svg+xml;base64,{b64}"


CATEGORY_STYLE = {
    "disposable": ("&#x2601;", "#6366f1", "Disposable"),
    "pod":        ("&#x26A1;", "#0891b2", "Pod System"),
    "juice":      ("&#x2B22;", "#16a34a", "E-Liquid"),
    "accessory":  ("&#x2699;", "#d97706", "Accessory"),
}


def main():
    db = SessionLocal()
    try:
        products = db.query(Product).all()
        updated = 0
        skipped = 0
        for p in products:
            # Don't overwrite uploaded custom images
            if p.image_url and p.image_url.startswith("/uploads/"):
                skipped += 1
                continue
            cat = p.category or "accessory"
            icon, color, label = CATEGORY_STYLE.get(cat, CATEGORY_STYLE["accessory"])
            p.image_url = make_svg(icon, color, label)
            updated += 1
        db.commit()
        print(f"Updated {updated} products, skipped {skipped} with custom images")
    finally:
        db.close()


if __name__ == "__main__":
    main()
