# 西班牙语俚语大语言模型对比 (Spanish Slang Model Comparison)

这是一个基于 Next.js 开发的 Web 应用程序，旨在评估和比较不同大语言模型 (LLMs) 在分析和解释西班牙语地区俚语及变体（Regional Variants）方面的能力。

目前，该项目对比的模型包括：
- **Gemini 3.1 Pro**
- **DeepSeek v4 Pro**

## 概述

该应用程序提供了一个简洁、直观的用户界面，用户可以输入一系列包含特定地方俚语、商业术语或非正式表达的西班牙语句子。它还允许用户自定义发送给 LLM 的系统提示词 (System Prompt)。

模型将被要求扮演专业的西班牙语应用语言学家。对于每个句子，它们必须：
1. 识别该俚语最常被使用的特定国家。
2. 准确解释其在当地的含义。
3. 以严格的 JSON 格式返回结果 (`{"predicted_country": "...", "explanation": "..."}`)。

## 主要功能

- **并排模型评估：** 并发向 Gemini 和 DeepSeek 发送请求，以实时比较它们的表现和准确性。
- **第三方模型数据校验：** 支持引入第三方模型对生成结果进行自动校验和交叉验证，确保数据的准确性与一致性。
- **自定义提示词：** 直接在 UI 中轻松调整系统提示词，以测试不同的指令或限制（例如：禁止过度纠正当地方言）。
- **JSON 导出：** 将生成的比较结果下载为结构化的 JSON 文件，以便进行进一步分析。

## 技术栈

- **框架：** [Next.js 16](https://nextjs.org/)
- **UI 与样式：** React 19, Tailwind CSS v4
- **API 集成：** OpenAI Node SDK（作为 DeepSeek API 和 Gemini API 兼容端点的统一客户端使用）

## 快速开始

### 前置要求

你需要 Gemini、DeepSeek 以及用于校验的评估模型（如 GPT-5.5 等）的 API 密钥。

### 环境配置

在根目录下创建一个 `.env.local` 文件，并添加你的 API 密钥和相关配置：

```env
GEMINI_API_KEY=your_gemini_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key

# 评估模型配置 (用于第三方模型数据校验)
EVALUATOR_BASE_URL=https://api.example.com/v1
EVALUATOR_API_KEY=your_evaluator_api_key
EVALUATOR_MODEL=gpt-5.5
```

### 安装与运行

1. 安装依赖：
   ```bash
   npm install
   ```

2. 运行开发服务器：
   ```bash
   npm run dev
   ```

3. 在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看运行结果。

## 使用指南

1. **自定义提示词：** 如有需要，可在屏幕左侧修改系统提示词 (System Prompt)。默认提示词针对语言学分析和 JSON 格式实施了严格的规则。
2. **输入句子：** 在输入框中输入或粘贴您的西班牙语句子，每行一句。
3. **生成结果：** 点击 "Generate Results" 触发 API 调用。
4. **模型校验：** 结果生成后，可利用第三方评估模型对生成的数据进行校验和交叉验证。
5. **下载：** 处理完成后，下载生成的 `.json` 文件，以比较每个模型是如何分析这些俚语的。
