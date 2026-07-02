"use client";

import { useState } from "react";
import Papa from "papaparse";

export default function Home() {
  const [slangInput, setSlangInput] = useState("¡Qué guay está este coche!\nEse chabón es un boludo.");
  const [promptTemplate, setPromptTemplate] = useState("你是一位精通拉美区域变体（Regional Variants）与跨文化语境的顶级西班牙语应用语言学专家。\n\n【核心任务】\n我将提供一组包含特定地域性俚语、商贸黑话或非正式表达的西班牙语例句。请你逐一深度分析这些例句，精准判断它们最常使用的目标国家，并解释其在本地的真实含义。\n\n【红线规则】\n1. 绝对禁止过度纠错：面对不符合标准语法的地域方言（如 voseo 的特殊变位）或看似拼写错误的本土借词，绝对不要用标准西班牙本土语（Castellano）的逻辑进行强行纠错，必须尊重本地真实语用习惯。\n2. 消除主干语料压制：警惕高频词汇的歧义。如果词汇在拉美特定国家有截然不同的俚语含义，必须优先输出该本地俚语含义。\n3. 精准地域定位：必须给出最匹配的单一国家名称文本（如：Paraguay, Argentina, Mexico 等），不要包含多余的修饰词。\n\n【输出数据格式要求 - 极其重要】\n1. 你的回答必须是纯粹的、合法的 JSON 格式文本，不要包含在任何 Markdown 代码块中。\n2. 绝对不要输出任何开场白、也不要有任何结尾解释文字。\n3. 必须是一个包含以下字段的 JSON 对象：\"predicted_country\", \"explanation\"。");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ results: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [answerData, setAnswerData] = useState<any[] | null>(null);
  const [resultsData, setResultsData] = useState<any[] | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalResults, setEvalResults] = useState<any[] | null>(null);

  const handleMultipleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<any[] | null>>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let combinedData: any[] = [];
    
    for (const file of files) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const dataArray = Array.isArray(json) ? json : (json.results || json);
        if (Array.isArray(dataArray)) {
          combinedData = [...combinedData, ...dataArray];
        }
      } catch (err) {
        alert(`Failed to parse JSON file: ${file.name}`);
      }
    }
    
    setter(combinedData.length > 0 ? combinedData : null);
  };

  const handleEvaluate = async () => {
    if (!answerData || !resultsData) {
      setEvalError("Please upload both Answer JSON and Results JSON.");
      return;
    }

    setIsEvaluating(true);
    setEvalError(null);
    setEvalResults(null);

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultsData, answerData }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Evaluation failed.");
      setEvalResults(data.results);
    } catch (err: any) {
      setEvalError(err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    const sentences = slangInput
      .split("\n")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length === 0) {
      setError("Please enter at least one sentence.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/generate-explanations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sentences, promptTemplate }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate explanations.");
      }

      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadJSON = (data: any[], filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCSV = (data: any[], filename: string) => {
    const flatData = data.map((item: any) => ({
      Sentence: item.Sentence,
      GroundTruth_Country: item.GroundTruth?.predicted_country || "",
      Gemini_Country: item["Gemini 3.1 Pro"]?.predicted_country || (typeof item["Gemini 3.1 Pro"] === "string" ? item["Gemini 3.1 Pro"] : ""),
      DeepSeek_Country: item.DeepSeek?.predicted_country || (typeof item.DeepSeek === "string" ? item.DeepSeek : ""),
      Gemini_Country_Score: item.Gemini_Evaluation?.country_score ?? "",
      DeepSeek_Country_Score: item.DeepSeek_Evaluation?.country_score ?? "",
      GroundTruth_Explanation: item.GroundTruth?.explanation || "",
      Gemini_Explanation: item["Gemini 3.1 Pro"]?.explanation || "",
      DeepSeek_Explanation: item.DeepSeek?.explanation || "",
      Gemini_Explanation_Score: item.Gemini_Evaluation?.explanation_score ?? "",
      DeepSeek_Explanation_Score: item.DeepSeek_Evaluation?.explanation_score ?? "",
    }));

    const csvStr = Papa.unparse(flatData);
    // Add UTF-8 BOM to ensure Excel opens it correctly with special characters
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvStr], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-500/20 to-transparent pointer-events-none blur-3xl"></div>

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            Slang Model Comparison
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Compare DeepSeek and Gemini API explanations for Spanish slang side-by-side.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Input */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Custom Prompt Template
                </label>
                <textarea
                  className="w-full h-32 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none font-mono text-sm leading-relaxed"
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-2">
                  The text above will be sent as the <strong>System Prompt</strong>. Each sentence below will be sent as the User Message.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Spanish Sentences with Slang (One per line)
                </label>
                <textarea
                  className="w-full h-64 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none font-mono text-sm leading-relaxed"
                  value={slangInput}
                  onChange={(e) => setSlangInput(e.target.value)}
                  placeholder="¡Qué guay está este coche!&#10;Ese chabón es un boludo."
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className={`mt-6 w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg ${
                  isLoading
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white hover:shadow-indigo-500/25 hover:-translate-y-0.5"
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing LLMs...
                  </span>
                ) : (
                  "Generate Results"
                )}
              </button>

              {error && (
                <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="space-y-6">
             {results ? (
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
                  <h2 className="text-2xl font-bold text-white mb-2">Results Ready! 🎉</h2>
                  <p className="text-slate-400 mb-8">
                    Successfully generated data for {results.results.length} sentences. Download the JSON below.
                  </p>
                  
                  <div className="space-y-4 mt-auto">
                     <button
                      onClick={() => downloadJSON(results.results, "model_comparison_results.json")}
                      className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 hover:border-slate-600 transition-all group"
                    >
                      <div className="flex flex-col text-left">
                         <span className="text-slate-200 font-semibold text-lg">Download JSON Results</span>
                         <span className="text-slate-400 text-sm">Contains Sentence and Explanations from both models</span>
                      </div>
                      <svg className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                  </div>
                </div>
             ) : (
                <div className="bg-slate-900/20 border border-slate-800/50 rounded-2xl p-6 shadow-inner h-full flex items-center justify-center border-dashed">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl mx-auto mb-4 flex items-center justify-center rotate-12">
                      <span className="text-2xl">👀</span>
                    </div>
                    <h3 className="text-xl font-medium text-slate-300 mb-2">Waiting for input</h3>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                      Enter your sentences and click generate to create the JSON results.
                    </p>
                  </div>
                </div>
             )}
          </div>
        </div>

        {/* Evaluation Section */}
        <div className="mt-12 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Evaluate Results</h2>
          <p className="text-slate-400 mb-6">
            Upload your generated results and the ground truth `answer.json` to score the models using a third-party LLM judge.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                1. Upload Generated Results JSON (Multiple allowed)
              </label>
              <input
                type="file"
                accept=".json"
                multiple
                onChange={(e) => handleMultipleFileUpload(e, setResultsData)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer"
              />
              {resultsData && <p className="text-xs text-green-400 mt-2">✓ Loaded {resultsData.length} total results</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                2. Upload Ground Truth Answer JSON (Multiple allowed)
              </label>
              <input
                type="file"
                accept=".json"
                multiple
                onChange={(e) => handleMultipleFileUpload(e, setAnswerData)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 transition-all cursor-pointer"
              />
              {answerData && <p className="text-xs text-green-400 mt-2">✓ Loaded {answerData.length} total answers</p>}
            </div>
          </div>

          <button
            onClick={handleEvaluate}
            disabled={isEvaluating || !answerData || !resultsData}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg ${
              isEvaluating || !answerData || !resultsData
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white hover:shadow-purple-500/25 hover:-translate-y-0.5"
            }`}
          >
            {isEvaluating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Evaluating...
              </span>
            ) : (
              "Run Evaluation"
            )}
          </button>

          {evalError && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {evalError}
            </div>
          )}

          {evalResults && (
            <div className="mt-6">
              <button
                onClick={() => downloadCSV(evalResults, "evaluated_results.csv")}
                className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 hover:border-slate-600 transition-all group"
              >
                <div className="flex flex-col text-left">
                   <span className="text-slate-200 font-semibold text-lg">Download Evaluated CSV</span>
                   <span className="text-slate-400 text-sm">Contains flattened scores and explanations for each model</span>
                </div>
                <svg className="w-6 h-6 text-purple-400 group-hover:text-purple-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
