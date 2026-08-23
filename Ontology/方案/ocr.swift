#!/usr/bin/env swift
// -*- coding: utf-8 -*-
//
// 扫描 PDF → 文本：PDFKit 渲染页面 + Vision 中文 OCR（macOS 原生，零第三方依赖）
// 用法: swift ocr.swift <input.pdf>  > output.txt
// 输出: 每页文本，页间以 "--- 第 N 页 ---" 分隔；进度写 stderr

import Foundation
import PDFKit
import Vision
import AppKit

guard CommandLine.arguments.count > 1 else {
    FileHandle.standardError.write("usage: swift ocr.swift <input.pdf>\n".data(using: .utf8)!)
    exit(1)
}

let pdfURL = URL(fileURLWithPath: CommandLine.arguments[1])
guard let doc = PDFDocument(url: pdfURL) else {
    FileHandle.standardError.write("无法打开 PDF: \(pdfURL.path)\n".data(using: .utf8)!)
    exit(1)
}

var allText: [String] = []
for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }

    // 渲染页面为位图（2x 缩放，提高 OCR 准确率）
    let bounds = page.bounds(for: .mediaBox)
    let scale: CGFloat = 2.0
    let size = NSSize(width: bounds.width * scale, height: bounds.height * scale)
    let image = NSImage(size: size)
    image.lockFocus()
    NSColor.white.setFill()
    NSRect(origin: .zero, size: size).fill()
    if let ctx = NSGraphicsContext.current?.cgContext {
        ctx.saveGState()
        ctx.scaleBy(x: scale, y: scale)
        page.draw(with: .mediaBox, to: ctx)
        ctx.restoreGState()
    }
    image.unlockFocus()

    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        continue
    }

    // Vision 文本识别（中文 + 英文）
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["zh-Hans", "en-US"]
    request.usesLanguageCorrection = true

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    do {
        try handler.perform([request])
    } catch {
        FileHandle.standardError.write("第 \(i + 1) 页识别失败: \(error)\n".data(using: .utf8)!)
        continue
    }

    var pageLines: [String] = []
    for obs in request.results ?? [] {
        if let candidate = obs.topCandidates(1).first {
            pageLines.append(candidate.string)
        }
    }
    allText.append("--- 第 \(i + 1) 页 ---")
    allText.append(contentsOf: pageLines)
    fputs("[\(i + 1)/\(doc.pageCount)] 页 OCR 完成 (\(pageLines.count) 行)\n", stderr)
}

print(allText.joined(separator: "\n"))
