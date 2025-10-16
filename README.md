# CaseThread - AI-Powered Legal Judgment Analyzer

CaseThread is a Chrome extension that helps legal professionals quickly analyze and organize court judgments using AI. Save time on initial case review while maintaining the rigor of thorough legal analysis.

## ✨ Features

### 🤖 **Multi-AI Model Support**
- **Google Gemini Models**: Pro, Flash, Flash Lite
- **xAI Grok**: Grok 4 Fast Reasoning
- Flexible model selection based on your needs (speed vs. accuracy)
- AI cross-check functionality for enhanced accuracy (Accuracy of the analysis hinges on the output of the AI model. CaseThread is not responsible for any inaccuracies or errors appearing in the AI analysis)

### 📊 **Comprehensive Analysis**
- **Case Summary**: Clear, concise summaries of legal judgments
- **Key Issues**: Automatically extracted legal issues
- **Notable Quotes**: Exact quotes from the judgment with verification
- **Legal Principles**: Transferable principles applicable to other cases
- **Citation Extraction**: Automatic case citation detection

### 💾 **Knowledge Base**
- Save and organize analyzed cases locally
- Add custom labels and notes
- Search through your saved cases
- Export analysis as JSON

### 🔒 **Data Handling**
- All data stored locally in your browser
- API keys stored securely in browser storage
- No data sent to CaseThread developer
- Only judgment content sent to your chosen AI provider

## 🚀 Installation

### From Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store listing](#) (link coming soon)
2. Click "Add to Chrome"
3. Follow the setup instructions

### Manual Installation (Development)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the extension folder

## ⚙️ Setup

### 1. Get API Keys

You'll need at least one API key:

**Gemini API (Google)**
- Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
- Sign in with your Google account
- Create an API key
- Free tier available

**Grok API (xAI)** (Optional)
- Visit [xAI Console](https://console.x.ai/)
- Sign in and navigate to API Keys
- Create a new API key

### 2. Configure Extension
1. Right-click the CaseThread icon in Chrome
2. Select "Options"
3. Enter your API key(s)
4. Click "Test Connection" to verify
5. Save settings

## 📖 Usage

### Basic Analysis
1. Navigate to a legal judgment webpage
2. Click the CaseThread extension icon
3. Select your preferred AI model
4. Click "Analyze Judgment"
5. Review the AI-generated analysis

### AI Cross-Check (Optional)
- After initial analysis, click "AI Cross-check"
- Select a different AI model
- Get verification and enhanced accuracy
- Compare results from multiple AI models

### Save to Knowledge Base
1. After analysis, click "Save to Knowledge Base"
2. Add a custom label (e.g., "Contract Law - Breach")
3. Add optional notes
4. Access saved cases from the homepage

## 🎯 Intended Use

### ✅ This tool may help legal professionals:
- Quickly assess whether a judgment warrants deeper reading
- Organize and summarize cases in your personal knowledge system
- Flag potentially relevant judgments for further review

### ❌ This tool is NOT suitable for:
- Detailed legal research on complex or nuanced topics
- Relying on AI summaries as authoritative analysis
- Cases requiring fine-grained interpretation of legal principles

### ⚠️ Important Limitations
Large language models have inherent limitations in:
- Capturing nuanced legal reasoning
- Distinguishing between holdings and dicta
- Understanding jurisdictional subtleties

**Always conduct thorough independent review for substantive legal work.**

## 🔐 Privacy & Data Handling

- **User Responsibility**: Users are solely responsible for reviewing and complying with the privacy policy and data handling practices of their selected AI service provider, and the terms of service of the websites they are analyzing.
- **Local Storage**: All cached analysis and summaries are stored locally on your device only
- **No Central Collection**: This tool does not collect, store, or transmit cached data to CaseThread servers (if exist)
- **AI Provider Communication**: Only the judgment content necessary for AI analysis is sent to your chosen AI service provider in accordance with their terms

## 🛠️ Technical Details

### Architecture
- **Manifest Version**: 3
- **Content Scripts**: Extract judgment text from web pages
- **Background Worker**: Handles AI API calls
- **Local Storage**: Chrome storage API for caching and knowledge base

### Supported Websites
Works on most legal judgment websites in English (subject to websites' terms of service), including:
- Court websites with HTML judgments
- Public judgment repositories

**Note**: PDF analysis is not supported due to Chrome security restrictions. Use HTML versions when available.

### AI Models

| Model | Speed | Accuracy | Best For |
|-------|-------|----------|----------|
| Gemini Flash Lite | ⚡⚡⚡ Fastest | Good | Quick reviews |
| Gemini Flash | ⚡⚡ Fast | Very Good | Balanced use |
| Gemini Pro | ⚡ Slower | Excellent | Complex cases |
| Grok 4 Fast Reasoning | ⚡⚡ Fast | Very Good | Alternative perspective |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup
1. Clone the repository
2. Make your changes
3. Test thoroughly with `chrome://extensions/` developer mode
4. Submit a PR with clear description

### Reporting Issues
- Use GitHub Issues to report bugs
- Include steps to reproduce
- Attach screenshots if applicable
- Specify Chrome version and extension version

## 📧 Support

- **Email**: [casethread.ai@gmail.com](mailto:casethread.ai@gmail.com)
- **GitHub Issues**: For bug reports and feature requests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚖️ Disclaimer

**Important**: Users are solely responsible for verifying the accuracy of any information from this tool and conducting independent legal research before relying on any analysis for legal advice or decisions.

AI models may make errors. Please review analysis carefully before relying on it.

## 🙏 Acknowledgments

- Built with Google Gemini and xAI Grok APIs
- Icon generated by Google Gemini
- Design inspired by modern legal tech tools
- Thanks to the open-source community

## 📊 Changelog

### Version 1.0.0 (Current)
- Multi-AI model support (Google Gemini Pro, Flash, Flash Lite; xAI Grok 4 Fast Reasoning)
- Dynamic model selection based on configured API keys
- AI cross-check functionality for enhanced accuracy
- Knowledge Base for organizing and searching analyzed cases
- Local storage with export functionality
- Comprehensive legal analysis with case summaries, key issues, notable quotes, and legal principles

---

**Made with ⚖️ for legal professionals**
