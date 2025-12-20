
# AO3 阅读器 & 翻译助手 📚✨

[![English Documentation](https://img.shields.io/badge/Docs-English-blue.svg)](README.md)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![Gemini 3](https://img.shields.io/badge/AI-Gemini%203-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6)

**AO3 阅读器** 不仅仅是一个翻译工具，更是一个功能完备的同人小说沉浸式阅读与管理平台。它由 Google 最新的 **Gemini 3** 模型驱动，旨在打破语言壁垒，同时提供极致的本地阅读体验。

## 🌟 核心功能

### 📖 沉浸式阅读体验
*   **多模式视图**: 支持 **原文模式**（适合语言学习）、**仅译文模式**（沉浸阅读）、**双语对照**（左右分栏）以及 **行间对照**。
*   **高度可定制**: 自由调整字体（衬线/无衬线）、字号、行高和段落间距。
*   **主题与背景**: 内置深色模式、羊皮纸、护眼绿、午夜蓝等主题，支持 **自定义背景图片** 并提供磨砂玻璃特效。

### 🧠 语境感知 AI 翻译
*   **Gemini 3 驱动**: 提供流畅、富有文学性的叙事翻译。
*   **上下文滑动窗口**: 确保长文翻译中的剧情连贯性和角色语气一致性。
*   **智能元数据解析**: 自动识别 AO3 HTML 文件中的标题、作者、Fandom 和 CP 标签，在翻译前为 AI 注入准确的背景知识。

### 📚 个人书库管理
*   **本地书库**: 自动保存所有导入的书籍和翻译进度。
*   **智能书签**: 自动记录每一本书的阅读位置，下次打开即刻继续。
*   **收藏与摘录**: 遇到喜欢的段落，一键点击红心加入收藏夹。
*   **读书笔记**: 支持对任意段落添加个人感悟或翻译备注。

### 🛠️ 进阶工具
*   **交互式润色 (Refine)**: 对翻译不满意的段落，可输入指令（如“把语气改得更傲娇一点”）让 AI 重写。
*   **术语表 (Glossary)**: 自定义角色名或专有名词的翻译规则。
*   **数据备份**: 支持导出/导入完整的书库数据（包含笔记和收藏）。
*   **导出**: 将翻译结果导出为 Markdown 或 HTML 格式。

## 🚀 快速开始

### 前置要求

*   Node.js (v18 或更高版本)
*   拥有 **Gemini API** 权限的 Google Cloud 项目。
*   从 [Google AI Studio](https://aistudio.google.com/) 获取的 API Key。

### 安装步骤

1.  **克隆仓库**
    ```bash
    git clone https://github.com/yourusername/fanfic-reader-pro.git
    cd fanfic-reader-pro
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
    *   **文件上传**: 推荐上传从 AO3 下载的 HTML 文件（Download -> HTML），以获得最佳体验。
    *   **链接获取**: 输入 AO3 网址（通过代理获取）。
    *   **文本粘贴**: 直接粘贴内容。
2.  **阅读或翻译**:
    *   点击 **开始阅读** 直接进入原文阅读模式。
    *   开启 **AI 翻译** 开关，选择目标语言进行翻译。
3.  **管理**:
    *   点击右上角 **书库图标** 切换书籍。
    *   点击 **红心图标** 查看收藏的语录。
    *   点击 **保存图标** 备份你的数据。

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
