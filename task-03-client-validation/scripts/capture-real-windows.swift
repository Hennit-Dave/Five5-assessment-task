import Foundation
import CoreGraphics
import AppKit

func runCommand(_ cmd: String) -> String {
    let process = Process()
    process.launchPath = "/bin/zsh"
    process.arguments = ["-c", cmd]
    let pipe = Pipe()
    process.standardOutput = pipe
    process.standardError = pipe
    process.launch()
    process.waitUntilExit()
    let data = pipe.fileHandleForReading.readDataToEndOfFile()
    return String(data: data, encoding: .utf8) ?? ""
}

func getChromeWindowID() -> CGWindowID? {
    let list = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]] ?? []
    for w in list {
        if let owner = w[kCGWindowOwnerName as String] as? String, owner.contains("Chrome") {
            let bounds = w[kCGWindowBounds as String] as? [String: Any] ?? [:]
            let h = bounds["Height"] as? Int ?? 0
            let wid = w[kCGWindowNumber as String] as? Int ?? 0
            // Find the main app window (height > 400)
            if h >= 500 {
                return CGWindowID(wid)
            }
        }
    }
    return nil
}

let states = [
    ("login", "http://localhost:3000/auth?mode=login", "/tmp/real-chrome-login.png"),
    ("signup", "http://localhost:3000/auth?mode=signup", "/tmp/real-chrome-signup.png"),
    ("reset", "http://localhost:3000/auth?mode=reset", "/tmp/real-chrome-reset.png")
]

print("1. Activating and positioning Google Chrome...")
_ = runCommand("""
osascript -e '
tell application "Google Chrome"
    activate
    if (count of windows) is 0 then
        make new window
    end if
    set bounds of front window to {60, 60, 1060, 780}
end tell
'
""")

Thread.sleep(forTimeInterval: 0.8)

guard let windowID = getChromeWindowID() else {
    print("Error: Could not locate Chrome window ID")
    exit(1)
}
print("Found Chrome window ID: \(windowID)")

for (mode, url, outPath) in states {
    print("Navigating to \(url)...")
    _ = runCommand("""
    osascript -e '
    tell application "Google Chrome"
        set URL of active tab of front window to "\(url)"
    end tell
    '
    """)
    Thread.sleep(forTimeInterval: 1.2) // allow render
    
    print("Capturing window to \(outPath)...")
    _ = runCommand("screencapture -l \(windowID) -o '\(outPath)'")
}

print("Closing capture window...")
_ = runCommand("""
osascript -e '
tell application "Google Chrome"
    close front window
end tell
'
""")

print("Done capturing individual windows.")
