// composite-step5-evidence.swift
// Composites captured browser panels into publication-quality evidence images
// for Task 4 Step 5: Email Normalization & Password Trimming.

import Foundation
import CoreGraphics
import AppKit

let evidenceDir = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("task-04-server-security")
    .appendingPathComponent("evidence")

let tmpDir = evidenceDir.appendingPathComponent("tmp-step5")

func composite(images: [(String, String)], outputFile: String, overallTitle: String) {
    let loaded: [(NSImage, String)] = images.map { (filename, label) in
        let path = tmpDir.appendingPathComponent(filename).path
        guard let img = NSImage(contentsOfFile: path) else {
            fatalError("Could not load \(path)")
        }
        return (img, label)
    }

    let margin: CGFloat = 36
    let gap: CGFloat = 36
    let headerHeight: CGFloat = 72
    let labelHeight: CGFloat = 44

    let maxW: CGFloat = loaded.map { ($0.0.representations[0] as! NSBitmapImageRep).pixelsWide }.map(CGFloat.init).max() ?? 1600
    let totalW = maxW + (margin * 2)

    var totalH: CGFloat = margin * 2 + headerHeight
    for item in loaded {
        let rep = item.0.representations[0] as! NSBitmapImageRep
        totalH += CGFloat(rep.pixelsHigh) + labelHeight + gap
    }

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(
        data: nil,
        width: Int(totalW),
        height: Int(totalH),
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        fatalError("Could not create CGContext")
    }

    // Background: Nit's Cut deep navy brand surface (#091F5C / #0B132B)
    context.setFillColor(CGColor(red: 0.04, green: 0.07, blue: 0.17, alpha: 1.0))
    context.fill(CGRect(x: 0, y: 0, width: totalW, height: totalH))

    // Header Title
    let titleAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.boldSystemFont(ofSize: 28),
        .foregroundColor: NSColor.white
    ]
    let titleStr = NSAttributedString(string: overallTitle, attributes: titleAttrs)
    let titleLine = CTLineCreateWithAttributedString(titleStr)
    context.textPosition = CGPoint(x: margin, y: totalH - margin - 36)
    CTLineDraw(titleLine, context)

    // Layout panels top to bottom
    var currentY = totalH - margin - headerHeight

    for item in loaded {
        let img = item.0
        let label = item.1
        let rep = img.representations[0] as! NSBitmapImageRep
        let imgW = CGFloat(rep.pixelsWide)
        let imgH = CGFloat(rep.pixelsHigh)

        // Draw panel label
        let labelAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 20, weight: .semibold),
            .foregroundColor: NSColor(calibratedRed: 0.75, green: 0.88, blue: 1.0, alpha: 1.0)
        ]
        let labelStr = NSAttributedString(string: label, attributes: labelAttrs)
        let labelLine = CTLineCreateWithAttributedString(labelStr)
        context.textPosition = CGPoint(x: margin, y: currentY - 30)
        CTLineDraw(labelLine, context)

        currentY -= labelHeight

        // Draw panel image
        guard let cgImg = rep.cgImage else { fatalError("No CGImage available") }
        let imgRect = CGRect(x: margin, y: currentY - imgH, width: imgW, height: imgH)
        context.draw(cgImg, in: imgRect)

        // Border around screenshot
        context.setStrokeColor(CGColor(red: 0.25, green: 0.40, blue: 0.65, alpha: 0.7))
        context.setLineWidth(2.0)
        context.stroke(imgRect)

        currentY -= (imgH + gap)
    }

    guard let outputCGImage = context.makeImage() else { fatalError("makeImage failed") }
    let rep = NSBitmapImageRep(cgImage: outputCGImage)
    guard let pngData = rep.representation(using: .png, properties: [:]) else { fatalError("PNG encode failed") }

    let outPath = evidenceDir.appendingPathComponent(outputFile)
    try! pngData.write(to: outPath)
    print("Created composite: \(outputFile) (\(pngData.count / 1024) KB)")
}

// 1. Evidence 09: Email Case Normalization
composite(
    images: [
        ("09a-signup-mixed-case.png", "1. Client Registration: Mixed-case email entered in signup form ('Simi.Adeyemi@EXAMPLE.COM')"),
        ("09b-login-lowercase-success.png", "2. Client Login: Authentication succeeds with all-lowercase email ('simi.adeyemi@example.com')")
    ],
    outputFile: "09-email-case-normalised.png",
    overallTitle: "Nit's Cut — Task 4 Step 5: Email Normalization Verification (09)"
)

// 2. Evidence 10: Password Whitespace Trimming
composite(
    images: [
        ("10a-signup-trailing-space.png", "1. Client Registration: Password entered with trailing whitespace ('BespokeKaftan#2026!   ')"),
        ("10b-login-trimmed-password.png", "2. Client Login: Password entered without trailing whitespace ('BespokeKaftan#2026!')"),
        ("10c-login-success-result.png", "3. Authentication Result: Login succeeds because trailing spaces were trimmed on registration")
    ],
    outputFile: "10-password-trim-working.png",
    overallTitle: "Nit's Cut — Task 4 Step 5: Password Leading/Trailing Whitespace Trimming (10)"
)
