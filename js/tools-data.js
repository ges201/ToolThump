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
        icon: "/icons/password-strength-checker-icon.png",
        htmlPath: "/tools/security/password-strength-checker/password-strength-checker.html",
        cssPaths: ["/tools/security/password-strength-checker/password-strength-checker.css"],
        jsPath: "/tools/security/password-strength-checker/js/main.js",
        keywords: ["password", "strength", "checker", "security", "entropy", "test", "meter", "check", "validate"]
    },
    {
        id: "encoder-decoder",
        name: "Encoder / Decoder",
        category: "Security",
        description: "Encode and decode data in various formats like Base64, URL, and more.",
        icon: "/icons/encoder-decoder-icon.png",
        htmlPath: "/tools/security/encoder-decoder/encoder-decoder.html",
        cssPaths: ["/tools/security/encoder-decoder/encoder-decoder.css"],
        jsPath: "/tools/security/encoder-decoder/encoderDecoder.js",
        keywords: ["encode", "decode", "base64", "url", "string", "data", "security", "converter", "encoder", "decoder"]
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
        id: "text-converter",
        name: "Text Case Converter",
        category: "Text Tools",
        description: "Convert text to uppercase, lowercase, or title case.",
        icon: "/icons/text-case-converter-color.png",
        htmlPath: "/tools/text/text-converter/text-converter.html",
        cssPaths: ["/tools/text/text-converter/text-converter.css"],
        jsPath: "/tools/text/text-converter/textConverter.js",
        keywords: ["text", "case", "converter", "uppercase", "lowercase", "titlecase", "capitalize", "string", "format"]
    },
    {
        id: "duplicate-words-finder",
        name: "Duplicate Words Finder",
        category: "Text Tools",
        description: "Find and highlight duplicate words in a text.",
        icon: "/icons/text-tool-icon.png", // Placeholder, create a specific icon later
        htmlPath: "/tools/text/duplicate-words-finder/duplicate-words-finder.html",
        cssPaths: ["/tools/text/duplicate-words-finder/duplicate-words-finder.css"],
        jsPath: "/tools/text/duplicate-words-finder/duplicateWordsFinder.js",
        keywords: ["duplicate", "words", "finder", "text", "analysis", "remove", "identify"]
    },
    {
        id: "image-converter",
        name: "Image Converter",
        category: "Image Tools",
        description: "Convert images between different formats (PNG, JPG, WEBP, etc.).",
        icon: "/icons/image-converter-icon.png",
        htmlPath: "/tools/images/image-converter/image-converter.html",
        cssPaths: ["/tools/images/image-converter/image-converter.css"],
        jsPath: "/tools/images/image-converter/imageConverter.js",
        keywords: ["image", "converter", "picture", "photo", "jpg", "png", "webp", "gif", "convert", "transform"]
    },
    {
        id: "image-resizer",
        name: "Image Resizer",
        category: "Image Tools",
        description: "Resize images to custom dimensions or standard aspect ratios.",
        icon: "/icons/image-resizer-icon.png",
        htmlPath: "/tools/images/image-resizer/image-resizer.html",
        cssPaths: ["/tools/images/image-resizer/image-resizer.css"],
        jsPath: "/tools/images/image-resizer/imageResizer.js",
        keywords: ["resize", "image", "picture", "photo", "scale", "dimensions", "aspect ratio", "resizer", "shrinker", "enlarger"]
    },
    {
        id: "color-picker",
        name: "Image Color Picker",
        category: "Image Tools",
        description: "Pick a color from an image to get its HEX, RGB, and HSL values.",
        icon: "/icons/color-picker-icon.png",
        htmlPath: "/tools/images/color-picker/color-picker.html",
        cssPaths: ["/tools/images/color-picker/color-picker.css"],
        jsPath: "/tools/images/color-picker/colorPicker.js",
        keywords: ["color", "picker", "eyedropper", "image", "hex", "rgb", "hsl", "select", "palette", "finder"]
    },
    {
        id: "bg-remover",
        name: "Background Remover",
        category: "Image Tools",
        description: "Remove the background from images.",
        icon: "/icons/bg-remover-icon.png",
        htmlPath: "/tools/images/bg-remover/bg-remover.html",
        cssPaths: ["/tools/images/bg-remover/bg-remover.css"],
        jsPath: "/tools/images/bg-remover/bgRemover.js",
        keywords: ["background", "remover", "image", "photo", "editor", "transparent", "cut out"]
    },
    {
        id: "qr-code-generator",
        name: "QR Code Generator",
        category: "Data Tools",
        description: "Generate QR codes for URLs, text, and more.",
        icon: "/icons/qr-code-icon.png",
        htmlPath: "/tools/data/qr-code-generator/qr-code-generator.html",
        cssPaths: ["/tools/data/qr-code-generator/qr-code-generator.css"],
        jsPath: "/tools/data/qr-code-generator/qrCodeGenerator.js",
        keywords: ["qr", "code", "generator", "data", "link", "url", "barcode"]
    }
];