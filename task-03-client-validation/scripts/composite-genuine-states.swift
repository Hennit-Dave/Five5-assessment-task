import Foundation
import CoreGraphics
import AppKit

let outDir = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("task-03-client-validation")
    .appendingPathComponent("evidence")

// 1. Copy individual real screenshots to evidence
let f1 = "/tmp/real-chrome-login.png"
let f2 = "/tmp/real-chrome-signup.png"
let f3 = "/tmp/real-chrome-reset.png"

guard let img1 = NSImage(contentsOfFile: f1),
      let img2 = NSImage(contentsOfFile: f2),
      let img3 = NSImage(contentsOfFile: f3) else {
    print("Error loading one of the screenshots")
    exit(1)
}

let rep1 = img1.representations[0] as! NSBitmapImageRep
let rep2 = img2.representations[0] as! NSBitmapImageRep
let rep3 = img3.representations[0] as! NSBitmapImageRep

let w = rep1.pixelsWide
let h1 = rep1.pixelsHigh
let h2 = rep2.pixelsHigh
let h3 = rep3.pixelsHigh

let gap = 48
let margin = 40
let labelH = 64
let totalW = w + (margin * 2)
let totalH = (margin * 2) + (labelH * 3) + h1 + h2 + h3 + (gap * 2)

let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let context = CGContext(
    data: nil,
    width: totalW,
    height: totalH,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    print("Error creating CGContext")
    exit(1)
}

// Background
context.setFillColor(CGColor(red: 14/255.0, green: 15/255.0, blue: 18/255.0, alpha: 1.0))
context.fill(CGRect(x: 0, y: 0, width: totalW, height: totalH))

func drawImage(_ img: NSImage, atY y: Int, label: String) {
    guard let cgImg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return }
    let rect = CGRect(x: margin, y: y, width: w, height: cgImg.height)
    context.draw(cgImg, in: rect)
}

// Draw from bottom to top in CGContext
var currentY = margin
drawImage(img3, atY: currentY, label: "State 3: Reset Password (?mode=reset)")
currentY += h3 + gap + labelH

drawImage(img2, atY: currentY, label: "State 2: Sign Up (?mode=signup)")
currentY += h2 + gap + labelH

drawImage(img1, atY: currentY, label: "State 1: Log In (?mode=login)")

guard let finalCGImage = context.makeImage() else {
    print("Error creating final CGImage")
    exit(1)
}

let finalRep = NSBitmapImageRep(cgImage: finalCGImage)
guard let pngData = finalRep.representation(using: .png, properties: [:]) else {
    print("Error getting PNG data")
    exit(1)
}

let targetURL = outDir.appendingPathComponent("03-url-states.png")
try pngData.write(to: targetURL)
print("Saved genuine 03-url-states.png (\(totalW)x\(totalH), \(pngData.count / 1024) KB)")
