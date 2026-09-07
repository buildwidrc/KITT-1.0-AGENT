import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  CheckCircle2,
  Zap,
  RotateCw,
  Cpu,
  CornerDownLeft,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { AIMessage } from '../types';

interface ChatbotPanelProps {
  messages: AIMessage[];
  onSendMessage: (text: string) => void;
  isAiProcessing: boolean;
  onApplyPendingActions: (messageId: string) => void;
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
  onClearHistory?: () => void;
  compact?: boolean;
}

export const ChatbotPanel: React.FC<ChatbotPanelProps> = ({
  messages,
  onSendMessage,
  isAiProcessing,
  onApplyPendingActions,
  selectedModel = 'gemini-3.5-flash',
  onSelectModel,
  onClearHistory,
  compact = false,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiProcessing]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isAiProcessing) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (promptText: string) => {
    onSendMessage(promptText);
  };

  // Helper to render markdown formatting without extra dependencies
  const renderFormattedContent = (content: string) => {
    if (!content) return null;

    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderTextLines(content.substring(lastIndex, match.index), `txt-${lastIndex}`));
      }
      const lang = match[1] || 'code';
      const codeSnippet = match[2];
      parts.push(
        <div
          key={`code-${match.index}`}
          className="my-2 bg-[#0c0f16] border border-[#232c3d] rounded-md overflow-hidden font-mono text-[11px]"
        >
          <div className="px-2.5 py-1 bg-[#151a24] text-slate-400 text-[10px] flex items-center justify-between border-b border-[#232c3d]">
            <span className="uppercase">{lang}</span>
            <span>Snippet</span>
          </div>
          <pre className="p-2.5 text-violet-200 overflow-x-auto leading-relaxed">
            <code>{codeSnippet}</code>
          </pre>
        </div>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(renderTextLines(content.substring(lastIndex), `txt-${lastIndex}`));
    }

    return parts;
  };

  const renderTextLines = (text: string, keyPrefix: string) => {
    const lines = text.split('\n');
    return (
      <div key={keyPrefix} className="space-y-1">
        {lines.map((line, i) => {
          if (!line.trim()) return <div key={i} className="h-1" />;
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            return (
              <div key={i} className="flex items-start gap-1.5 pl-1">
                <span className="text-violet-400 font-bold">•</span>
                <span>{renderInlineFormatting(line.trim().substring(2))}</span>
              </div>
            );
          }
          return <p key={i}>{renderInlineFormatting(line)}</p>;
        })}
      </div>
    );
  };

  const renderInlineFormatting = (text: string) => {
    const tokens = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return tokens.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={idx}
            className="px-1 py-0.5 bg-[#1f2637] text-violet-300 rounded font-mono text-[10.5px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#11141a]">
      {/* Header Controls: Model Selector & Reset */}
      <div className="px-3 py-2 bg-[#0c0e13] border-b border-[#232936] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Bot className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <select
            value={selectedModel}
            onChange={(e) => onSelectModel?.(e.target.value)}
            className="bg-[#161b24] text-[11px] font-mono text-slate-300 border border-[#262f40] rounded px-1.5 py-1 outline-none focus:border-violet-500 truncate w-full cursor-pointer"
            title="Select Gemini Reasoning Model"
          >
            <option value="gemini-3.5-flash">Gemini 3.5 Flash (Default)</option>
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fast)</option>
            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Advanced)</option>
          </select>
        </div>

        {onClearHistory && (
          <button
            type="button"
            onClick={onClearHistory}
            title="Reset conversation thread"
            className="p-1.5 hover:bg-[#1f2633] text-slate-400 hover:text-slate-200 rounded transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col text-xs leading-relaxed ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 font-mono">
              {msg.role === 'user' ? (
                <>
                  <span>Engineer</span>
                  <User className="w-3 h-3 text-slate-300" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-violet-400" />
                  <span className="font-semibold text-violet-400">KITT AI</span>
                  {msg.modelUsed && (
                    <span className="px-1.5 py-0.2 bg-violet-950/60 text-violet-300 border border-violet-800/40 rounded text-[9px]">
                      {msg.modelUsed === 'gemini-3.5-flash'
                        ? '3.5 Flash'
                        : msg.modelUsed === 'gemini-3.1-flash-lite'
                        ? '3.1 Lite'
                        : msg.modelUsed === 'gemini-3.1-pro-preview'
                        ? '3.1 Pro'
                        : msg.modelUsed}
                    </span>
                  )}
                </>
              )}
              <span className="text-slate-600">{msg.timestamp}</span>
            </div>

            <div
              className={`p-3 rounded-lg max-w-[95%] ${
                msg.role === 'user'
                  ? 'bg-violet-600/30 border border-violet-500/40 text-slate-100 rounded-tr-none'
                  : 'bg-[#161b24] border border-[#262f40] text-slate-200 rounded-tl-none shadow-md'
              }`}
            >
              <div className="text-[11.5px] leading-relaxed">
                {renderFormattedContent(msg.content)}
              </div>

              {/* AI Engineering Plan Steps */}
              {msg.plan && msg.plan.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-[#232c3d] space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">
                    EXECUTION PLAN:
                  </span>
                  {msg.plan.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-200">{step.title}: </span>
                        <span className="text-slate-400">{step.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Action Preview with Apply Confirmation button */}
              {msg.plannedActions &&
                msg.plannedActions.length > 0 &&
                msg.status === 'pending_confirmation' && (
                  <div className="mt-3 p-2.5 bg-violet-950/30 border border-violet-500/30 rounded-md">
                    <div className="flex items-center gap-1 text-[11px] font-mono text-violet-300 font-semibold mb-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Proposed Modifications ({msg.plannedActions.length})</span>
                    </div>
                    <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-0.5 mb-2">
                      {msg.plannedActions.map((act, i) => (
                        <li key={i}>{act.description}</li>
                      ))}
                    </ul>
                    <button
                      onClick={() => onApplyPendingActions(msg.id)}
                      className="w-full py-1.5 px-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white rounded text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1.5 shadow cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Apply Changes to Canvas</span>
                    </button>
                  </div>
                )}
            </div>
          </div>
        ))}

        {isAiProcessing && (
          <div className="flex items-center gap-2 p-3 bg-[#161b24] rounded-lg border border-[#232c3d] text-xs font-mono text-violet-300">
            <RefreshCw className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
            <span>KITT is analyzing circuit physics and synthesizing changes...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Contextual Quick Suggestions */}
      <div className="px-2.5 py-1.5 border-t border-[#232936] bg-[#0c0e13] flex flex-wrap gap-1 shrink-0">
        <button
          onClick={() => handleQuickAction('Build a digital half-adder circuit with XOR and AND gates.')}
          className="px-2 py-0.5 text-[10px] font-mono bg-violet-950/40 hover:bg-violet-900/60 text-violet-300 rounded border border-violet-700/40 transition-colors cursor-pointer"
        >
          + Half-Adder
        </button>
        <button
          onClick={() => handleQuickAction('Add an ANSI/IEEE 2-input AND gate.')}
          className="px-2 py-0.5 text-[10px] font-mono bg-[#161b24] hover:bg-[#202736] text-slate-300 rounded border border-[#262f40] transition-colors cursor-pointer"
        >
          + AND Gate
        </button>
        <button
          onClick={() => handleQuickAction('Add a NOT inverter gate with negation bubble.')}
          className="px-2 py-0.5 text-[10px] font-mono bg-[#161b24] hover:bg-[#202736] text-slate-300 rounded border border-[#262f40] transition-colors cursor-pointer"
        >
          + NOT Gate
        </button>
        <button
          onClick={() => handleQuickAction('Add an LED connected with a 220 ohm current limiting resistor.')}
          className="px-2 py-0.5 text-[10px] font-mono bg-[#161b24] hover:bg-[#202736] text-slate-300 rounded border border-[#262f40] transition-colors cursor-pointer"
        >
          + LED & Resistor
        </button>
        <button
          onClick={() => handleQuickAction('Explain how to build an Arduino circuit in this workspace.')}
          className="px-2 py-0.5 text-[10px] font-mono bg-[#161b24] hover:bg-[#202736] text-slate-300 rounded border border-[#262f40] transition-colors cursor-pointer"
        >
          Circuit Guide
        </button>
      </div>

      {/* User Prompt Input Box */}
      <form onSubmit={handleSend} className="p-2.5 bg-[#0f1218] border-t border-[#232936] flex gap-2 shrink-0">
        <div className="relative flex-1">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={compact ? 1 : 2}
            placeholder="Tell KITT what to build or wire (Enter to send)..."
            className="w-full bg-[#161b24] text-xs text-slate-200 placeholder-slate-500 px-2.5 py-2 rounded-md border border-[#262f40] focus:border-violet-500 outline-none transition-colors resize-none font-sans"
            disabled={isAiProcessing}
          />
        </div>
        <button
          type="submit"
          disabled={!inputText.trim() || isAiProcessing}
          className="self-end p-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-40 disabled:hover:bg-violet-600 text-white rounded-md transition-colors cursor-pointer"
          title="Send to KITT AI (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
