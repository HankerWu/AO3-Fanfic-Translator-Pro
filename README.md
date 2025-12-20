
# AO3 Reader & Translator 📚✨

[![中文文档](https://img.shields.io/badge/文档-中文版-red.svg)](README_ZH.md)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![Gemini 3](https://img.shields.io/badge/AI-Gemini%203-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6)

**AO3 Reader** is a comprehensive reading companion for fanfiction, designed to bridge language barriers and enhance the reading experience. While built on powerful AI translation (Gemini 3), it functions as a fully-featured **e-reader and library manager**, allowing you to organize, annotate, and enjoy fanfiction in its original or translated form.

## 🌟 Key Features

### 📖 Immersive Reading Experience
*   **Flexible Views**: Switch seamlessly between **Original** (for language learners), **Translated Only** (for immersion), **Side-by-Side** (bilingual comparison), or **Interlinear** modes.
*   **Customizable Typography**: Adjust fonts (Serif/Sans), size, line height, and spacing.
*   **Theming**: Includes Dark Mode, Sepia, Eye-Protection Green, Midnight Blue, and **Custom Background Image** support with frosted glass effects.

### 🧠 Context-Aware AI Translation
*   **Gemini 3 Powered**: Uses the latest models for high-fluency narrative translation.
*   **Context Sliding Window**: Maintains plot continuity across paragraphs.
*   **Smart AO3 Parsing**: Auto-detects Title, Author, Fandom, and Tags from HTML files to prime the AI with correct context before translation begins.

### 📚 Personal Library Manager
*   **Local History**: Auto-saves your reading progress and library locally.
*   **Bookmarks**: Automatically tracks your reading position per book.
*   **Favorites & Quotes**: Clip specific paragraphs to a dedicated "Favorites" collection.
*   **Notes**: Add personal annotations or translation notes to any paragraph.

### 🛠️ Advanced Tools
*   **Interactive Refinement**: "Fix" specific paragraphs with custom AI instructions (e.g., "Make this more poetic", "Fix character name").
*   **Glossary**: Define custom terms to ensure consistency across the work.
*   **Backup & Restore**: Export your entire library, including notes and favorites, to JSON.
*   **Export**: Save translations as Markdown or HTML files.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   A Google Cloud Project with the **Gemini API** enabled.
*   An API Key from [Google AI Studio](https://aistudio.google.com/).

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/fanfic-reader-pro.git
    cd fanfic-reader-pro
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure API Key**
    Create a `.env` file in the root directory:
    ```env
    API_KEY=your_google_gemini_api_key_here
    ```
    *(Note: Ensure your build tool injects this into `process.env.API_KEY`)*

4.  **Run the application**
    ```bash
    npm run dev
    ```

## 📖 User Guide

1.  **Import**:
    *   **Drag & Drop**: Upload an HTML file downloaded from AO3 (recommended).
    *   **URL**: Fetch directly from an AO3 URL (via proxy).
    *   **Text**: Paste raw text.
2.  **Read or Translate**:
    *   Click **Start Reading** to import without translating.
    *   Enable **AI Translation** to translate into your target language.
3.  **Manage**:
    *   Use the **Library** (Archive icon) to switch between books.
    *   Access **Favorites** (Heart icon) to review clipped quotes.
    *   Backup your data via the **Save** button.

## 🛠️ Tech Stack

*   **Frontend**: React 18, TypeScript, Tailwind CSS
*   **AI Integration**: @google/genai SDK (Gemini 3 Models)
*   **Icons**: Lucide React
*   **Markdown Rendering**: React Markdown

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Disclaimer: This tool is for personal use to facilitate reading fanfiction across languages. Please respect authors' rights and do not repost translations without permission.*
