#!/usr/bin/env bash
# Build a demo MP4 from BundleStack marketing assets for App Store screencast URL.
# Upload the output to YouTube (unlisted) or Loom, then paste the link in Partners.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/docs/app-store"
WORK="$ASSETS/screencast-build"
OUT="$ASSETS/bundlestack-screencast.mp4"
SLIDE_SECONDS="${SLIDE_SECONDS:-22}"

mkdir -p "$WORK"
rm -f "$WORK"/*.mp4 "$OUT"

scale_image() {
  local src="$1"
  local dest="$2"
  ffmpeg -y -loglevel error -i "$src" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0f172a,format=yuv420p" \
    -frames:v 1 "$dest"
}

make_slide_video() {
  local image="$1"
  local out="$2"
  ffmpeg -y -loglevel error -loop 1 -i "$image" -t "$SLIDE_SECONDS" \
    -vf "zoompan=z='min(zoom+0.0004,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$((SLIDE_SECONDS * 30)):s=1920x1080:fps=30" \
    -c:v libx264 -pix_fmt yuv420p -r 30 "$out"
}

make_title_video() {
  local out="$1"
  local duration="${2:-8}"
  # Solid brand slide (no drawtext — works with minimal ffmpeg builds)
  ffmpeg -y -loglevel error -f lavfi -i "color=c=0x0f172a:s=1920x1080:d=${duration}:r=30" \
    -c:v libx264 -pix_fmt yuv420p "$out"
}

echo "==> Preparing slides..."
scale_image "$ASSETS/feature-media-1600x900.png" "$WORK/00-feature.png"
scale_image "$ASSETS/screenshots/screenshot-01-dashboard.png" "$WORK/01-dashboard.png"
scale_image "$ASSETS/screenshots/screenshot-02-create-offer.png" "$WORK/02-offer.png"
scale_image "$ASSETS/screenshots/screenshot-03-storefront-widget.png" "$WORK/03-storefront.png"

echo "==> Rendering segments (${SLIDE_SECONDS}s each)..."
make_title_video "$WORK/seg-intro.mp4" 8
make_slide_video "$WORK/00-feature.png" "$WORK/seg-feature.mp4"
make_slide_video "$WORK/01-dashboard.png" "$WORK/seg-dashboard.mp4"
make_slide_video "$WORK/02-offer.png" "$WORK/seg-offer.mp4"
make_slide_video "$WORK/03-storefront.png" "$WORK/seg-storefront.mp4"
make_title_video "$WORK/seg-outro.mp4" 8

printf "file '%s'\n" \
  "$WORK/seg-intro.mp4" \
  "$WORK/seg-feature.mp4" \
  "$WORK/seg-dashboard.mp4" \
  "$WORK/seg-offer.mp4" \
  "$WORK/seg-storefront.mp4" \
  "$WORK/seg-outro.mp4" > "$WORK/concat.txt"

echo "==> Concatenating..."
ffmpeg -y -loglevel error -f concat -safe 0 -i "$WORK/concat.txt" -c copy "$OUT"

DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT")
echo "==> Done: $OUT (${DUR%.*}s)"
echo "Upload to YouTube (Unlisted) or Loom, then paste URL in Partners → Screencast URL."
