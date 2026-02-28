"""Set placeholder SVG images on all products that lack an image_url."""
import base64
from packages.db.session import SessionLocal
from packages.db.models import Product


def make_svg(emoji, bg_color, label):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="16" fill="{bg_color}"/>
  <text x="100" y="85" font-size="64" text-anchor="middle" dominant-baseline="central">{emoji}</text>
  <text x="100" y="150" font-size="14" fill="white" text-anchor="middle" font-family="sans-serif">{label}</text>
</svg>'''
    b64 = base64.b64encode(svg.encode()).decode()
    return f"data:image/svg+xml;base64,{b64}"


CATEGORY_STYLE = {
    "disposable": ("\U0001F4A8", "#6366f1", "Disposable"),
    "pod":        ("\U0001F50C", "#0891b2", "Pod System"),
    "juice":      ("\U0001F9EA", "#16a34a", "E-Liquid"),
    "accessory":  ("\U0001F527", "#d97706", "Accessory"),
}


def main():
    db = SessionLocal()
    try:
        products = db.query(Product).all()
        updated = 0
        for p in products:
            cat = p.category or "accessory"
            emoji, color, label = CATEGORY_STYLE.get(cat, CATEGORY_STYLE["accessory"])
            p.image_url = make_svg(emoji, color, label)
            updated += 1
        db.commit()
        print(f"Updated {updated} products with image URLs")
    finally:
        db.close()


if __name__ == "__main__":
    main()
