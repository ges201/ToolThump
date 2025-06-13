// ToolThump/js/tools-data.js

const toolsData = [
    {
        id: "password-generator",
        name: "Password Generator",
        category: "Security",
        description: "Generate strong, random passwords.", // Added description
        icon: "/ToolThump/icons/password-generator-color.png",
        htmlPath: "/ToolThump/tools/security/password-generator/password-generator.html",
        // Assuming CSS/JS are linked directly in its HTML or you have a main loader
        cssPaths: ["/ToolThump/tools/security/password-generator/password-generator.css"], // Example if separate
        jsPath: "/ToolThump/tools/security/password-generator/passwordGenerator.js", // Example if separate
        keywords: ["password", "generator", "security", "passphrase", "key", "random", "create", "safe"]
    },
    {
        id: "password-strength-checker",
        name: "Password Strength Checker",
        category: "Security",
        description: "Check the strength of your passwords.", // Added description
        icon: "/ToolThump/icons/password-strength-color.png",
        htmlPath: "/ToolThump/tools/security/password-strength-checker/password-strength-checker.html",
        cssPaths: ["/ToolThump/tools/security/password-strength-checker/password-strength-checker.css"], // Example
        jsPath: "/ToolThump/tools/security/password-strength-checker/js/main.js", // Example
        keywords: ["password", "strength", "checker", "security", "entropy", "test", "meter", "check", "validate"]
    },
    {
        id: "text-comparison",
        name: "Text Comparison",
        category: "Text Tools",
        description: "Compare two pieces of text and highlight differences.", // Added description
        icon: "/ToolThump/icons/text-comparison-color.png",
        htmlPath: "/ToolThump/tools/text/text-comparison/text-comparison.html",
        cssPaths: ["/ToolThump/tools/text/text-comparison/text-comparison.css"], // Example
        jsPath: "/ToolThump/tools/text/text-comparison/textComparison.js", // Example
        keywords: ["text", "comparison", "compare", "diff", "difference", "tool", "string"]
    },
    {
        id: "image-converter",
        name: "Image Converter",
        category: "Image Tools", // Corrected category name for consistency
        description: "Convert images between different formats (PNG, JPG, WEBP, etc.).", // Added description
        icon: "/ToolThump/icons/image-converter-color.png",
        htmlPath: "/ToolThump/tools/images/image-converter/image-converter.html",
        cssPaths: ["/ToolThump/tools/images/image-converter/image-converter.css"], // Example
        jsPath: "/ToolThump/tools/images/image-converter/imageConverter.js", // Example
        keywords: ["image", "converter", "picture", "photo", "jpg", "png", "webp", "gif", "convert", "transform"]
    },
    {
        id: "qr-code-generator",
        name: "QR Code Generator",
        category: "Data Tools",
        description: "Generate QR codes for URLs, text, and more.", // Added description
        icon: "/ToolThump/icons/qr-code-color.png",
        htmlPath: "/ToolThump/tools/data/qr-code-generator/qr-code-generator.html",
        cssPaths: ["/ToolThump/tools/data/qr-code-generator/qr-code-generator.css"], // Example
        jsPath: "/ToolThump/tools/data/qr-code-generator/qrCodeGenerator.js", // Example
        keywords: ["qr", "code", "generator", "data", "link", "url", "barcode"]
    },
    { // New Image Resizer Tool
        id: "image-resizer",
        name: "Image Resizer",
        category: "Image Tools", // Corrected category name for consistency
        description: "Resize images to custom dimensions or standard aspect ratios. Aims to preserve quality and uses the original file format where possible (PNG, JPEG, WEBP).",
        icon: "/ToolThump/assets/icons/image-resizer.svg", // Ensure this icon exists
        htmlPath: "/ToolThump/tools/images/image-resizer/image-resizer.html",
        cssPaths: ["/ToolThump/tools/images/image-resizer/image-resizer.css"],
        jsPath: "/ToolThump/tools/images/image-resizer/imageResizer.js",
        keywords: ["resize", "image", "picture", "photo", "scale", "dimensions", "aspect ratio", "resizer", "shrinker", "enlarger"]
    }
];