# AO3 Fanfic Translator Pro 📚✨

[![中文文档](https://img.shields.io/badge/文档-中文版-red.svg)](README_ZH.md)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![Gemini 3](https://img.shields.io/badge/AI-Gemini%203-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6)

**AO3 Fanfic Translator Pro** is a specialized translation tool designed for reading fanfiction across languages. Powered by Google's **Gemini 3** models, it prioritizes narrative flow, emotional resonance, and fandom-specific context over literal translation.

## 🌟 Key Features

*   **🧠 Context-Aware AI Translation**: Uses a sliding context window to ensure continuity in narrative and dialogue.
*   **🏷️ Smart AO3 Parsing**: Automatically extracts metadata (Title, Author, Fandom, Tags) from uploaded AO3 HTML files to prime the AI with correct context.
*   **✨ Interactive Refinement**: Select any translated paragraph to "Fix" or "Refine" it with specific instructions (e.g., "Make it more poetic", "Fix the character name").
*   **📖 Specialized Reading Modes**:
    *   **Translated Only**: Clean, immersive reading experience.
    *   **Side-by-Side**: Bilingual view for language learners or verification.
    *   **Interlinear**: Sentence-by-sentence comparison.
*   **📚 Personal Library**:
    *   **History**: Auto-saves your translation progress locally.
    *   **Favorites**: Save specific paragraphs/quotes with personal notes.
    *   **Bookmarks**: Track your reading position automatically.
*   **⚙️ Advanced Control**:
    *   **Glossary**: Define specific terms (Character names, locations) to ensure consistency.
    *   **Custom Prompts**: Tailor the AI's persona (e.g., "Translate like a Victorian novel").
    *   **Batch Size**: Control translation speed vs. precision.
*   **💾 Import/Export**: Backup your entire library or export translations as Markdown/HTML.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   A Google Cloud Project with the **Gemini API** enabled.
*   An API Key from [Google AI Studio](https://aistudio.google.com/).

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/ao3-fanfic-translator-pro.git
    cd ao3-fanfic-translator-pro
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

## 📖 Usage Guide

1.  **Load Content**:
    *   **File**: Upload an HTML file downloaded from AO3 (Recommended for best metadata detection).
    *   **Paste**: Paste raw text directly.
2.  **Configure**:
    *   Check detected **Fandom** and **Tags**.
    *   Set your **Target Language**.
    *   (Optional) Add a **Glossary** for specific names.
3.  **Translate**:
    *   Click **Start Translation**. The AI will process the text in batches.
    *   You can Pause/Resume at any time.
4.  **Read & Refine**:
    *   Click on any paragraph to **Edit** manually.
    *   Use the **Refine (Refresh Icon)** button to ask AI to fix a specific block.
    *   Click the **Heart** icon to save quotes to your Favorites.

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
