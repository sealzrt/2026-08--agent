import base64, urllib.request, pathlib, time

IMAGES_DIR = pathlib.Path(__file__).parent

FRONTMATTER = "%%{init: {'look': 'handDrawn', 'theme': 'neutral'}}%%\n"

diagrams = [
    ("fig-1-1-product-flow.mmd", "fig-1-1-product-flow.png"),
    ("fig-3-1-end-to-end.mmd", "fig-3-1-end-to-end.png"),
    ("fig-3-3-decision-chain.mmd", "fig-3-3-decision-chain.png"),
    ("fig-4-module-arch.mmd", "fig-4-module-arch.png"),
    ("fig-4-6-gate-check.mmd", "fig-4-6-gate-check.png"),
    ("fig-4-8-decision-chain-detail.mmd", "fig-4-8-decision-chain-detail.png"),
    ("fig-5-navigation.mmd", "fig-5-navigation.png"),
    ("fig-6-3-er-diagram.mmd", "fig-6-3-er-diagram.png"),
    ("fig-7-3-state-machine.mmd", "fig-7-3-state-machine.png"),
    ("fig-11-2-gantt.mmd", "fig-11-2-gantt.png"),
]

for src, dst in diagrams:
    src_path = IMAGES_DIR / src
    dst_path = IMAGES_DIR / dst
    code = src_path.read_text(encoding="utf-8")
    # Prepend handDrawn frontmatter if not already present
    if "handDrawn" not in code:
        code = FRONTMATTER + code
    encoded = base64.urlsafe_b64encode(code.encode("utf-8")).decode("ascii")
    url = f"https://mermaid.ink/img/{encoded}?type=png&width=1200&bgColor=white"
    print(f"Rendering {src} -> {dst} ...", end=" ", flush=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            dst_path.write_bytes(resp.read())
        print(f"OK ({dst_path.stat().st_size} bytes)")
    except Exception as e:
        print(f"FAILED: {e}")
    time.sleep(2)  # rate limit

print("\nAll done!")
