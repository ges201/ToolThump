const toolsData = [
    {
        id: "password-generator",
        name: "Password Generator",
        category: "Security",
        description: "Generate strong, random passwords.",
        icon: "/icons/password-generator-icon.png",
        htmlPath: "/tools/security/password-generator/password-generator.html",
        cssPaths: ["/tools/security/password-generator/password-generator.css"],
        jsPath: "/tools/security/password-generator/passwordGenerator.js",
        keywords: ["password", "generator", "security", "passphrase", "key", "random", "create", "safe"]
    },
    {
        id: "password-strength-checker",
        name: "Password Strength Checker",
        category: "Security",
        description: "Check the strength of your passwords.",
        icon: "/icons/password-strength-color.png",
        htmlPath: "/tools/security/password-strength-checker/password-strength-checker.html",
        cssPaths: ["/tools/security/password-strength-checker/password-strength-checker.css"],
        jsPath: "/tools/security/password-strength-checker/js/main.js",
        keywords: ["password", "strength", "checker", "security", "entropy", "test", "meter", "check", "validate"]
    },
    {
        id: "text-comparison",
        name: "Text Comparison",
        category: "Text Tools",
        description: "Compare two pieces of text and highlight differences.",
        icon: "/icons/text-diff-icon.png",
        htmlPath: "/tools/text/text-comparison/text-comparison.html",
        cssPaths: ["/tools/text/text-comparison/text-comparison.css"],
        jsPath: "/tools/text/text-comparison/textComparison.js",
        keywords: ["text", "comparison", "compare", "diff", "difference", "tool", "string"]
    },
    {
        id: "image-converter",
        name: "Image Converter",
        category: "Image Tools",
        description: "Convert images between different formats (PNG, JPG, WEBP, etc.).",
        icon: "/icons/image-converter-color.png",
        htmlPath: "/tools/images/image-converter/image-converter.html",
        cssPaths: ["/tools/images/image-converter/image-converter.css"],
        jsPath: "/tools/images/image-converter/imageConverter.js",
        keywords: ["image", "converter", "picture", "photo", "jpg", "png", "webp", "gif", "convert", "transform"]
    },
    {
        id: "qr-code-generator",
        name: "QR Code Generator",
        category: "Data Tools",
        description: "Generate QR codes for URLs, text, and more.",
        icon: "/icons/qr-code-color.png",
        htmlPath: "/tools/data/qr-code-generator/qr-code-generator.html",
        cssPaths: ["/tools/data/qr-code-generator/qr-code-generator.css"],
        jsPath: "/tools/data/qr-code-generator/qrCodeGenerator.js",
        keywords: ["qr", "code", "generator", "data", "link", "url", "barcode"]
    },
    {
        id: "image-resizer",
        name: "Image Resizer",
        category: "Image Tools",
        description: "Resize images to custom dimensions or standard aspect ratios. Aims to preserve quality and uses the original file format where possible (PNG, JPEG, WEBP).",
        icon: "/icons/image-resizer.png",
        htmlPath: "/tools/images/image-resizer/image-resizer.html",
        cssPaths: ["/tools/images/image-resizer/image-resizer.css"],
        jsPath: "/tools/images/image-resizer/imageResizer.js",
        keywords: ["resize", "image", "picture", "photo", "scale", "dimensions", "aspect ratio", "resizer", "shrinker", "enlarger"]
    },
    {
        id: "text-converter",
        name: "Text Case Converter",
        category: "Text Tools",
        description: "Convert text to uppercase, lowercase, or title case.",
        icon: "/icons/text-case-converter-color.png", // You'll need to create this icon
        htmlPath: "/tools/text/text-converter/text-converter.html",
        cssPaths: ["/tools/text/text-converter/text-converter.css"],
        jsPath: "/tools/text/text-converter/textConverter.js",
        keywords: ["text", "case", "converter", "uppercase", "lowercase", "titlecase", "capitalize", "string", "format"]
    }
];