# AO3 同人小说翻译器 Pro 📚✨

[![English Documentation](https://img.shields.io/badge/Docs-English-blue.svg)](README.md)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![Gemini 3](https://img.shields.io/badge/AI-Gemini%203-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6)

**AO3 Fanfic Translator Pro** 是一个专为跨语言阅读同人小说设计的智能翻译工具。它由 Google 最新的 **Gemini 3** 模型驱动，相比于传统的字面翻译，它更注重叙事的流畅性、情感共鸣以及特定同人圈（Fandom）的语境准确性。

## 🌟 核心功能

*   **🧠 上下文感知翻译**: 采用滑动窗口机制，确保大段文本翻译时剧情连贯，并在长对话中保持角色语气一致。
*   **🏷️ 智能 AO3 解析**: 支持直接上传 AO3 下载的 HTML 文件，自动提取元数据（标题、作者、原作 Fandom、CP/标签），让 AI 在翻译前就“读懂”背景设定。
*   **✨ 交互式润色 (Refine)**: 对翻译不满意的段落，可以点击“刷新”按钮，输入指令（例如：“把语气改得更傲娇一点”、“修正这个人名的翻译”），让 AI 进行针对性重写。
*   **📖 多样化阅读模式**:
    *   **沉浸模式 (Translated Only)**: 仅显示译文，提供类似原生电子书的阅读体验。
    *   **双语对照 (Side-by-Side)**: 左右分栏显示，适合语言学习或校对。
    *   **行间对照 (Interlinear)**: 逐段原文/译文穿插显示。
*   **📚 个人书库**:
    *   **历史记录**: 自动保存翻译进度，随时继续阅读。
    *   **收藏夹**: 遇到喜欢的段落或金句，点击红心收藏，并支持添加个人笔记。
    *   **书签**: 自动记录上次阅读位置。
*   **⚙️ 高级控制**:
    *   **术语表 (Glossary)**: 自定义角色名、地名或特定术语的翻译规则，保持全文一致。
    *   **自定义提示词 (Prompt)**: 调整 AI 的翻译人格（例如：“像维多利亚时代的文学作品那样翻译”）。
    *   **批处理大小**: 在翻译速度和上下文连贯性之间寻找平衡。
*   **💾 数据管理**: 支持备份整个书库数据，或将翻译结果导出为 Markdown/HTML 文件。

## 🚀 快速开始

### 前置要求

*   Node.js (v18 或更高版本)
*   拥有 **Gemini API** 权限的 Google Cloud 项目。
*   从 [Google AI Studio](https://aistudio.google.com/) 获取的 API Key。

### 安装步骤

1.  **克隆仓库**
    ```bash
    git clone https://github.com/yourusername/ao3-fanfic-translator-pro.git
    cd ao3-fanfic-translator-pro
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **配置 API Key**
    在项目根目录创建一个 `.env` 文件，填入你的 Key：
    ```env
    API_KEY=your_google_gemini_api_key_here
    ```
    *(注意: 请确保你的构建工具配置了 `process.env.API_KEY` 的注入)*

4.  **启动应用**
    ```bash
    npm run dev
    ```

## 📖 使用指南

1.  **导入内容**:
    *   **文件上传**: 推荐上传从 AO3 下载的 HTML 文件（Download -> HTML），这样可以获得最佳的元数据识别效果。
    *   **粘贴文本**: 直接粘贴章节内容或全文。
2.  **配置**:
    *   检查自动识别的 **原作 (Fandom)** 和 **标签 (Tags)** 是否正确。
    *   选择 **目标语言** (支持中文简体/繁体等)。
    *   (可选) 在设置中添加 **术语表** 以固定特定名词翻译。
3.  **开始翻译**:
    *   点击 **开始翻译**。AI 将分批处理文本。
    *   你可以随时暂停/恢复翻译进度。
4.  **阅读与修正**:
    *   点击任意段落可进行 **手动编辑**。
    *   使用 **润色 (刷新图标)** 按钮，指挥 AI 重新翻译特定段落。
    *   点击 **心形图标** 将精彩段落加入收藏夹。

## 🛠️ 技术栈

*   **前端框架**: React 18, TypeScript, Tailwind CSS
*   **AI 集成**: @google/genai SDK (Gemini 3 Models)
*   **图标库**: Lucide React
*   **渲染**: React Markdown

## 🤝 贡献

欢迎提交 Issue 或 Pull Request！

## 📄 许可证

本项目基于 MIT 许可证开源 - 详情请参阅 [LICENSE](LICENSE) 文件。

---

*免责声明: 本工具仅供个人跨语言阅读同人作品使用。请尊重原作者的版权，未经许可切勿擅自转载或发布机器翻译的内容。*
