"""Generate perf/fixtures/heavy.json and its images: a published page with every card type.

Run from the repo root:  python3 perf/make-fixture.py
The images are plain JPEGs (Pillow) so next/image has real rasters to optimise.
"""

import json
import os
from datetime import datetime, timedelta, timezone

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(ROOT, "fixtures", "img")
ORIGIN = "http://localhost:8097"  # perf/mock-api.mjs
os.makedirs(IMG, exist_ok=True)
MEDIA = {}


def img(name, w, h, c1, c2):
    im = Image.new("RGB", (w, h), c1)
    d = ImageDraw.Draw(im)
    for i in range(0, w + h, 48):
        d.line([(i, 0), (i - h, h)], fill=c2, width=18)
    d.ellipse([w * 0.3, h * 0.25, w * 0.7, h * 0.75], fill=c2)
    im.save(os.path.join(IMG, name), "JPEG", quality=70)
    # like GET /public/{u}'s media map; widths [] = no resized variants (the fixture server serves originals)
    MEDIA[f"/uploads/{name}"] = {"width": w, "height": h, "widths": []}
    return f"{ORIGIN}/uploads/{name}"


avatar = img("avatar.jpg", 400, 400, (248, 217, 230), (208, 16, 111))
hero = img("hero.jpg", 1080, 720, (251, 226, 210), (194, 65, 12))
thumbs = [img(f"t{i}.jpg", 480, 480, c1, c2) for i, (c1, c2) in enumerate(
    [((220, 243, 230), (29, 122, 74)), ((214, 232, 250), (47, 111, 179)), ((246, 236, 194), (160, 120, 20)),
     ((248, 217, 230), (208, 16, 111)), ((236, 230, 250), (90, 80, 140)), ((251, 226, 210), (194, 65, 12))])]

NOW = "2026-11-16T00:00:00Z"
PID = "p-heavy"
tabs = [
    {"id": "tab-home", "profile_id": PID, "title": "Home", "slug": "home", "position": 0},
    {"id": "tab-shop", "profile_id": PID, "title": "Shop", "slug": "shop", "position": 1},
]
blocks = []


def b(type_, data, tab="tab-home", parent=None):
    blocks.append({
        "id": f"b{len(blocks) + 1:02d}", "profile_id": PID, "tab_id": tab, "parent_id": parent,
        "position": sum(1 for x in blocks if x["tab_id"] == tab and x["parent_id"] == parent),
        "is_visible": True, "created_at": NOW, "updated_at": NOW, "type": type_, "data": data,
    })
    return blocks[-1]["id"]


ends = (datetime.now(timezone.utc) + timedelta(days=9)).replace(microsecond=0).isoformat().replace("+00:00", "Z")

b("image", {"url": hero, "alt": "Stoneware plates on a wooden table", "lightbox": True})
b("link", {"title": "Shop the spring glaze collection", "url": "https://example.com/shop", "description": "Twelve new pieces"})
b("link", {"title": "Workshop sign-ups", "url": "https://example.com/workshops", "layout": "thumbnail", "thumbnail_url": thumbs[0]})
b("link", {"title": "Studio tour", "url": "https://example.com/tour", "layout": "grid2", "thumbnail_url": thumbs[1]})
b("link", {"title": "Glaze notes", "url": "https://example.com/notes", "layout": "grid2", "thumbnail_url": thumbs[2]})
b("heading", {"title": "Latest"})
b("video", {"url": "https://www.youtube.com/watch?v=aqz-KE-bpKQ"})
b("music", {"url": "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"})
b("discount_code", {"code": "KILN15", "description": "15% off your first order", "brand": "Kiln", "url": "https://example.com/shop"})
b("countdown", {"ends_at": ends, "label": "Winter kiln sale starts in", "description": "Seconds and seconds-only pieces."})
b("text", {"content": "Small-batch stoneware made in Yogyakarta. **Wholesale** enquiries welcome."})
f = b("folder", {"title": "Studio favourites", "style": "collapsible"})
for i, t in enumerate(["Clay supplier", "Kiln I use", "Glaze recipes"]):
    b("link", {"title": t, "url": f"https://example.com/fav{i}"}, parent=f)
b("social_icons", {"items": [{"platform": "instagram", "url": "https://instagram.com/kiln"}, {"platform": "tiktok", "url": "https://tiktok.com/@kiln"}, {"platform": "youtube", "url": "https://youtube.com/@kiln"}]})
b("quote", {"quote": "Make the thing you wish existed.", "name": "Sari"})
b("faq", {"heading": "Questions", "items": [{"q": "Do you ship abroad?", "a": "Yes, to most of Southeast Asia."}, {"q": "Are the plates dishwasher-safe?", "a": "Yes."}, {"q": "Custom orders?", "a": "Open twice a year."}]})
b("divider", {"style": "dashed"})
b("file", {"title": "Wholesale price sheet", "url": "https://example.com/price.pdf", "file_name": "price.pdf", "size": 812000})
b("booking", {"url": "https://calendly.com/example/30min"})
b("email_signup", {"title": "Kiln-opening letter", "description": "One email when a firing comes out.", "button_label": "Join"})
b("contact_form", {"title": "Say hello", "button_label": "Send"})
b("form", {"title": "Custom order request", "button_label": "Send request", "fields": [
    {"id": "name", "type": "text", "label": "Name", "required": True},
    {"id": "email", "type": "email", "label": "Email", "required": True},
    {"id": "piece", "type": "select", "label": "Piece", "options": ["Plate", "Bowl", "Mug"]},
    {"id": "notes", "type": "textarea", "label": "Notes"}]})
# testimonial (kept generic: this is test data, not social proof shown anywhere public)
b("testimonial", {"heading": "Notes from the studio", "items": [{"quote": "Fixture quote one.", "author": "Fixture A"}, {"quote": "Fixture quote two.", "author": "Fixture B"}]})
for i in range(3):
    b("link", {"title": f"Carousel item {i + 1}", "url": f"https://example.com/c{i}", "layout": "carousel", "thumbnail_url": thumbs[3 + i]})
# Shop tab
for i in range(4):
    b("link", {"title": f"Product {i + 1}", "url": f"https://example.com/p{i}", "layout": "grid2", "thumbnail_url": thumbs[i]}, tab="tab-shop")

page = {
    "profile": {
        "id": PID, "user_id": "u-heavy", "username": "heavy", "display_name": "Sari Wulandari",
        "bio": "Ceramicist in Yogyakarta. Small-batch stoneware, workshops on weekends.",
        "avatar_url": avatar,
        "theme": {"preset": "kertas", "bg": {"type": "color", "value": "#f8d9e6"}, "font": "Urbanist", "text_color": "#16150f",
                  "button": {"style": "fill", "color": "#d0106f", "text_color": "#ffffff", "radius": 100}},
        "seo": {"title": "", "description": "", "image_url": None},
        "is_published": True, "created_at": NOW, "updated_at": NOW,
        "socials": [{"platform": "instagram", "url": "https://instagram.com/kiln"}, {"platform": "email", "url": "mailto:hi@example.com"}],
        "socials_position": "top",
        "announcement": {"id": "ann1", "layout": "banner", "title": "Kiln sale this weekend", "description": "20% off plates until Sunday.",
                         "cta": {"label": "Shop", "url": "https://example.com/shop"}},
        "settings": {"ga4_id": "G-TEST1234", "meta_pixel_id": "1234567890", "show_share": True, "show_save_contact": True},
    },
    "tabs": tabs,
    "blocks": blocks,
    "media": MEDIA,
}
with open(os.path.join(ROOT, "fixtures", "heavy.json"), "w") as fh:
    json.dump(page, fh, indent=1)
print(len(blocks), "blocks;", "types:", sorted({x["type"] for x in blocks}))
