import Foundation
import CoreGraphics
import AppKit

let evidenceDir = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("task-03-client-validation")
    .appendingPathComponent("evidence")

func composite(images: [(String, String)], outputFile: String, overallTitle: String) {
    let loaded: [(NSImage, String)] = images.map { (filename, label) in
        let path = evidenceDir.appendingPathComponent(filename).path
        guard let img = NSImage(contentsOfFile: path) else {
            fatalError("Could not load \(path)")
        }
        return (img, label)
    }

    let margin: CGFloat = 36
    let gap: CGFloat = 36
    let headerHeight: CGFloat = 80
    let labelHeight: CGFloat = 48

    let maxW: CGFloat = loaded.map { ($0.0.representations[0] as! NSBitmapImageRep).pixelsWide }.map(CGFloat.init).max() ?? 2160
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
        fatalError("Could not create context")
    }

    // Fill background (#091F5C dark brand surface or #0D1627)
    context.setFillColor(CGColor(red: 0.05, green: 0.09, blue: 0.16, alpha: 1.0))
    context.fill(CGRect(x: 0, y: 0, width: totalW, height: totalH))

    // Draw header text
    let titleAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.boldSystemFont(ofSize: 32),
        .foregroundColor: NSColor.white
    ]
    let titleStr = NSAttributedString(string: overallTitle, attributes: titleAttrs)
    let titleLine = CTLineCreateWithAttributedString(titleStr)
    context.textPosition = CGPoint(x: margin, y: totalH - margin - 40)
    CTLineDraw(titleLine, context)

    // Draw items from top to bottom
    var currentY = totalH - margin - headerHeight

    for item in loaded {
        let img = item.0
        let label = item.1
        let rep = img.representations[0] as! NSBitmapImageRep
        let imgW = CGFloat(rep.pixelsWide)
        let imgH = CGFloat(rep.pixelsHigh)

        // Draw label
        let labelAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 22, weight: .semibold),
            .foregroundColor: NSColor(calibratedRed: 0.7, green: 0.85, blue: 1.0, alpha: 1.0)
        ]
        let labelStr = NSAttributedString(string: label, attributes: labelAttrs)
        let labelLine = CTLineCreateWithAttributedString(labelStr)
        context.textPosition = CGPoint(x: margin, y: currentY - 32)
        CTLineDraw(labelLine, context)

        currentY -= labelHeight

        // Draw image
        guard let cgImg = rep.cgImage else { fatalError("No CGImage") }
        let imgRect = CGRect(x: margin, y: currentY - imgH, width: imgW, height: imgH)
        context.draw(cgImg, in: imgRect)

        // Subtle border around screenshot
        context.setStrokeColor(CGColor(red: 0.2, green: 0.35, blue: 0.55, alpha: 0.6))
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

// 1. Composite 09-number-input-annoying.png (Real Browser Interaction Captures)
composite(
    images: [
        ("09a-number-input-starting-zero.png", "1. Initial state: Explicitly configured starting value 0 in HTML <input type=\"number\">"),
        ("09b-number-input-typing-0400.png", "2. Customer clicks and types 400 via keyboard: Result is 0400 (initial 0 not cleared)"),
        ("09c-number-input-corrected-400.png", "3. Customer moves cursor left 3 times and backspaces: Unwanted leading zero deleted, leaving 400")
    ],
    outputFile: "09-number-input-annoying.png",
    overallTitle: "Nit's Cut — Task 3 Step 4: Number Input Defect & Correction (09)"
)

// 2. Composite 10-text-input-working.png (Real Browser Interaction Captures)
composite(
    images: [
        ("10a-text-input-clean-placeholder.png", "1. Initial state: Clean text input (type=\"text\" inputmode=\"numeric\") with placeholder e.g. 0042"),
        ("10b-text-input-typing-0042.png", "2. Customer types 0042 via keyboard: Leading zeros preserved; non-digits rejected"),
        ("10c-text-input-result-preserved.png", "3. Customer clicks visible submit button: Raw string \"0042\" and length 4 received intact")
    ],
    outputFile: "10-text-input-working.png",
    overallTitle: "Nit's Cut — Task 3 Step 4: Text Input with Numeric Mode Working (10)"
)
