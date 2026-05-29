from __future__ import annotations

import math
import shutil
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "phase-2" / "asset-audit"
EXTRACTED = OUT / "extracted-media"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff"}
VIDEO_EXTS = {".mp4", ".mov", ".m4v"}


def safe_slug(text: str) -> str:
    chars = []
    for char in text.lower():
        if char.isalnum():
            chars.append(char)
        elif char in {" ", "-", "_", ".", "(", ")"}:
            chars.append("-")
    slug = "".join(chars).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug[:90] or "asset"


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT)).replace("\\", "/")
    except ValueError:
        return str(path)


def ensure() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    EXTRACTED.mkdir(parents=True, exist_ok=True)


def extract_office_media(path: Path) -> list[Path]:
    media_paths: list[Path] = []
    if not path.exists():
        return media_paths
    dest = EXTRACTED / safe_slug(path.stem)
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path) as zf:
        for member in zf.infolist():
            name = member.filename
            suffix = Path(name).suffix.lower()
            if ("/media/" not in name and not name.startswith("media/")) or suffix not in IMAGE_EXTS:
                continue
            target = dest / f"{safe_slug(Path(name).stem)}{suffix}"
            with zf.open(member) as src, target.open("wb") as dst:
                shutil.copyfileobj(src, dst)
            media_paths.append(target)
    return media_paths


def render_pdf_pages(path: Path) -> list[Path]:
    rendered: list[Path] = []
    try:
        import fitz  # type: ignore
    except Exception:
        return rendered
    if not path.exists():
        return rendered
    dest = EXTRACTED / safe_slug(path.stem)
    dest.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(path)
    for index, page in enumerate(doc):
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
        target = dest / f"page-{index + 1:02d}.jpg"
        pix.save(target)
        rendered.append(target)
    return rendered


def extract_zip_previews(path: Path, limit: int = 14) -> list[Path]:
    extracted: list[Path] = []
    dest = EXTRACTED / safe_slug(path.stem)
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path) as zf:
        candidates = [
            m
            for m in zf.infolist()
            if not m.is_dir()
            and "__MACOSX" not in m.filename
            and Path(m.filename).suffix.lower() in IMAGE_EXTS
        ]
        candidates.sort(key=lambda m: (Path(m.filename).suffix.lower() not in {".jpg", ".jpeg", ".png"}, m.file_size))
        for member in candidates[:limit]:
            suffix = Path(member.filename).suffix.lower()
            target = dest / f"{len(extracted) + 1:02d}-{safe_slug(Path(member.filename).stem)}{suffix}"
            with zf.open(member) as src, target.open("wb") as dst:
                shutil.copyfileobj(src, dst)
            extracted.append(target)
    return extracted


def video_frame(path: Path) -> Path | None:
    try:
        import cv2  # type: ignore
    except Exception:
        return None
    dest = EXTRACTED / "video-frames"
    dest.mkdir(parents=True, exist_ok=True)
    target = dest / f"{safe_slug(path.stem)}.jpg"
    if target.exists():
        return target
    cap = cv2.VideoCapture(str(path))
    ok, frame = cap.read()
    cap.release()
    if not ok:
        return None
    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    Image.fromarray(frame).save(target, quality=88)
    return target


def collect_images(paths: list[Path]) -> list[Path]:
    images: list[Path] = []
    for base in paths:
        if not base.exists():
            continue
        if base.is_file():
            if base.suffix.lower() in IMAGE_EXTS:
                images.append(base)
            elif base.suffix.lower() in VIDEO_EXTS:
                frame = video_frame(base)
                if frame:
                    images.append(frame)
            elif base.suffix.lower() == ".zip":
                images.extend(extract_zip_previews(base))
            elif base.suffix.lower() in {".pptx", ".docx"}:
                images.extend(extract_office_media(base))
            elif base.suffix.lower() == ".pdf":
                images.extend(render_pdf_pages(base))
            continue
        for file in base.rglob("*"):
            if not file.is_file():
                continue
            suffix = file.suffix.lower()
            if suffix in IMAGE_EXTS:
                images.append(file)
            elif suffix in VIDEO_EXTS:
                frame = video_frame(file)
                if frame:
                    images.append(frame)
            elif suffix == ".zip":
                images.extend(extract_zip_previews(file))
    return images


def wrapped_label(draw: ImageDraw.ImageDraw, text: str, width: int, font: ImageFont.ImageFont) -> list[str]:
    words = text.split("/")
    lines: list[str] = []
    line = ""
    for word in words:
        attempt = f"{line}/{word}" if line else word
        if draw.textbbox((0, 0), attempt, font=font)[2] <= width:
            line = attempt
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines[-3:]


def make_sheet(images: list[Path], output: Path, title: str) -> None:
    tile_w, tile_h = 340, 300
    thumb_h = 220
    cols = 3
    rows = max(1, math.ceil(len(images) / cols))
    sheet = Image.new("RGB", (cols * tile_w, 78 + rows * tile_h), "#f6f0e7")
    draw = ImageDraw.Draw(sheet)
    try:
        title_font = ImageFont.truetype("arial.ttf", 26)
        label_font = ImageFont.truetype("arial.ttf", 13)
    except Exception:
        title_font = ImageFont.load_default()
        label_font = ImageFont.load_default()

    draw.text((24, 22), title, fill="#173f2a", font=title_font)
    draw.text((24, 52), f"{len(images)} apercus", fill="#756a5c", font=label_font)

    for idx, image_path in enumerate(images):
        x = (idx % cols) * tile_w + 18
        y = 78 + (idx // cols) * tile_h + 18
        draw.rounded_rectangle((x, y, x + tile_w - 36, y + tile_h - 22), radius=10, fill="#fffaf2", outline="#d8c5ad")
        try:
            with Image.open(image_path) as im:
                im = ImageOps.exif_transpose(im).convert("RGB")
                im.thumbnail((tile_w - 62, thumb_h), Image.Resampling.LANCZOS)
                px = x + ((tile_w - 36) - im.width) // 2
                py = y + 14 + ((thumb_h - im.height) // 2)
                sheet.paste(im, (px, py))
        except Exception as exc:
            draw.text((x + 16, y + 40), f"Erreur image: {exc}", fill="#8a3f2e", font=label_font)
        label = rel(image_path)
        for line_index, line in enumerate(wrapped_label(draw, label, tile_w - 62, label_font)):
            draw.text((x + 16, y + 238 + line_index * 17), line, fill="#223126", font=label_font)

    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=90)


def main() -> None:
    ensure()
    groups = {
        "envato-lp1": [ROOT / "Envato" / "LP1"],
        "envato-lp-b": [ROOT / "Envato" / "LP B"],
        "envato-lp-c": [ROOT / "Envato" / "LP C"],
        "envato-lp-d": [ROOT / "Envato" / "LP D"],
        "document-tara": [
            ROOT / "Document Tara" / "Brief- MAISON de TARA (4).pptx",
            ROOT / "Document Tara" / "MOOD BOARD (1).pptx",
            ROOT / "Document Tara" / "PARTIE QUALI (1).docx",
            ROOT / "Document Tara" / "MAISON_DE_TARA_Dossier_Projet.pdf",
        ],
        "envato-local-patterns": [ROOT / "Envato" / "Indian_Traditional_Ornament_Muhgal_Kalamkari_Seamless_Patterns" / "JPG"],
    }
    report_lines = ["# Asset audit", ""]
    for name, paths in groups.items():
        images = collect_images(paths)
        images = sorted(dict.fromkeys(images), key=lambda p: rel(p).lower())
        sheet = OUT / f"{name}.jpg"
        make_sheet(images, sheet, name)
        report_lines.append(f"- {name}: {len(images)} previews -> `{rel(sheet)}`")
    (OUT / "README.md").write_text("\n".join(report_lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
