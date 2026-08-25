#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
扫描 PDF → 文本：PyMuPDF 渲染页面 + macOS Vision 中文 OCR
用法: python ocr_pdf.py <input.pdf> <output.txt> [dpi]
"""

import os
import sys

import fitz  # PyMuPDF
import Vision
from Foundation import NSURL


def ocr_image(png_path: str) -> str:
    """对单张图片执行 Vision 文本识别"""
    url = NSURL.fileURLWithPath_(png_path)
    handler = Vision.VNImageRequestHandler.alloc().initWithURL_options_(url, None)
    req = Vision.VNRecognizeTextRequest.alloc().init()
    try:
        req.setRecognitionLanguages_(["zh-Hans", "en-US"])
    except Exception:
        pass
    try:
        req.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
    except Exception:
        pass
    ok, _err = handler.performRequests_error_([req], None)
    if not ok:
        return ""
    lines = []
    for obs in req.results() or []:
        cand = obs.topCandidates_(1)
        if cand and len(cand) and cand[0].string():
            lines.append(cand[0].string())
    return "\n".join(lines)


def ocr_pdf(pdf_path: str, out_path: str, dpi: int = 200) -> int:
    doc = fitz.open(pdf_path)
    pages_text = []
    tmp_dir = os.path.dirname(out_path) or "/tmp"
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=dpi)
        png = os.path.join(tmp_dir, f"_ocr_page_{i}.png")
        pix.save(png)
        try:
            text = ocr_image(png)
        finally:
            os.remove(png)
        pages_text.append(f"--- 第 {i + 1} 页 ---\n{text}")
        print(f"[{i + 1}/{doc.page_count}] 页 OCR 完成 ({len(text)} 字)", flush=True)
    doc.close()
    full = "\n\n".join(pages_text)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(full)
    return doc.page_count


if __name__ == "__main__":
    pdf_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else pdf_path + ".txt"
    dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 200
    if not os.path.exists(pdf_path):
        print(f"文件不存在: {pdf_path}")
        sys.exit(1)
    n = ocr_pdf(pdf_path, out_path, dpi)
    total = os.path.getsize(out_path)
    print(f"OCR 完成：{n} 页，输出 {out_path}（{total} 字节）")
