import Foundation
import Vision
import ImageIO

// Vision recognizes text locally. No network service or user account is involved.
do {
    guard CommandLine.arguments.count == 2 else { throw NSError(domain: "OCR", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing image"]) }
    let url = URL(fileURLWithPath: CommandLine.arguments[1])
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil), let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        throw NSError(domain: "OCR", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot open image"])
    }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    let supported = try request.supportedRecognitionLanguages()
    request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en-US"].filter { supported.contains($0) }
    if #available(macOS 13.0, *) { request.automaticallyDetectsLanguage = true }
    try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
    let text = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
    let output = try JSONSerialization.data(withJSONObject: ["text": text])
    FileHandle.standardOutput.write(output)
} catch {
    let output = try! JSONSerialization.data(withJSONObject: ["error": error.localizedDescription])
    FileHandle.standardOutput.write(output)
    exit(1)
}
