"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Message } from "./Message";
import { StepIndicator } from "./StepIndicator";
import { CandidateSelector } from "./CandidateSelector";
import { StyleSelector } from "./StyleSelector";
import { DeclarationCard, type CardStyle } from "./DeclarationCard";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";
import { clearState, loadState, saveState } from "@/lib/utils/storage";
import { saveDeclaration } from "@/lib/utils/gallery";
import {
  isRemoteGalleryEnabled,
  saveDeclarationRemote,
} from "@/lib/db/declarations";
import { downloadCardImage } from "@/lib/utils/cardImage";

/**
 * 核心对话窗口组件
 *
 * 这是产品的"主舞台"——协调所有步骤：
 * - Step 0-2: 3 轮对话
 * - Step 3: 生成 3 个候选宣言（loading）
 * - Step 4: 用户选/改候选
 * - Step 5: 用户选风格 + 给卡片起名
 * - Step 6: 展示最终宣言卡片 + 复制 / 存图
 *
 * ⚠️ 本次修复的三个真实 Bug（2026-08-11）
 *
 * 1. 开场白永远不出现
 *    旧版挂载后 messages 为空且没有任何自动触发，
 *    页面永远停在"查拉图斯特拉正在下山……"，
 *    用户面对一个从没问过问题的输入框，不知道该说什么。
 *    → 现在挂载后自动请求 greet 阶段。
 *
 * 2. Prompt 阶段错位一位
 *    旧版用户第一条消息带 step=0，而 step=0 的 prompt 是"开场"，
 *    AI 会无视用户的回答、重新问一遍第一个问题。
 *    → 拆出独立 greet 阶段，0/1/2 各归其位（见 lib/ai/prompts.ts）。
 *
 * 3. 刷新页面进死局
 *    旧版存档不含 candidates，用户在"选择候选"这步刷新后，
 *    step 恢复成 4 但候选是空数组，界面渲染不出任何东西。
 *    → 存档纳入全部中间态；万一仍缺失，自动重新生成候选。
 */

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Candidate = {
  id: number;
  style: string;
  text: string;
};

/** 三轮对话对应的服务端阶段 */
type ConversationStep = 0 | 1 | 2;

const MAX_INPUT_LENGTH = 2000;

export function ChatWindow() {
  const { toast } = useToast();

  // 对话状态
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  // Co-Creation 状态
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(
    null
  );
  const [editedText, setEditedText] = useState("");
  const [cardStyle, setCardStyle] = useState<CardStyle | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardCreatedAt, setCardCreatedAt] = useState<number | null>(null);
  const [generatingCandidates, setGeneratingCandidates] = useState(false);

  // UI 状态
  const [restored, setRestored] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const greetedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ---------- 存档：读 ----------
  useEffect(() => {
    const saved = loadState();
    if (saved && saved.messages.length > 0) {
      setMessages(saved.messages);
      setStep(saved.step);
      setCandidates(saved.candidates);
      setSelectedCandidateId(saved.selectedCandidateId);
      setEditedText(saved.editedText);
      setCardStyle((saved.cardStyle as CardStyle) || null);
      setCardName(saved.cardName);
      setCardCreatedAt(saved.cardCreatedAt);
      greetedRef.current = true; // 已有对话，不要再触发开场
    }
    setRestored(true);
  }, []);

  // ---------- 存档：写 ----------
  useEffect(() => {
    if (!restored) return;
    if (messages.length === 0) return;

    saveState({
      messages,
      step,
      candidates,
      selectedCandidateId,
      editedText,
      cardStyle,
      cardName,
      cardCreatedAt,
      updatedAt: Date.now(),
    });
  }, [
    restored,
    messages,
    step,
    candidates,
    selectedCandidateId,
    editedText,
    cardStyle,
    cardName,
    cardCreatedAt,
  ]);

  // ---------- 自动滚到底 ----------
  useEffect(() => {
    if (step > 2) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, step]);

  // ---------- 生成候选宣言 ----------
  const generateCandidates = useCallback(
    async (allMessages: ChatMessage[]) => {
      setGeneratingCandidates(true);
      setStep(3);

      try {
        const res = await fetch("/api/generate-candidates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: allMessages }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "生成失败");

        const list: Candidate[] = Array.isArray(data.candidates)
          ? data.candidates
          : [];
        if (list.length === 0) throw new Error("宣言铸造失败了，请重试");

        setCandidates(list);
        setIsDemo(Boolean(data.demo));
        setStep(4);
      } catch (err) {
        console.error(err);
        toast(
          err instanceof Error ? err.message : "生成候选失败，请重试",
          "error"
        );
        setStep(2); // 退回到第 3 轮对话，用户可以重发
      } finally {
        setGeneratingCandidates(false);
      }
    },
    [toast]
  );

  // ---------- 开场：AI 主动破冰 ----------
  const requestGreeting = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [], stage: "greet" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "请求失败");

      setMessages([{ role: "assistant", content: data.message }]);
      setIsDemo(Boolean(data.demo));
    } catch (err) {
      console.error(err);
      greetedRef.current = false; // 允许用户重试
      toast(
        err instanceof Error ? err.message : "查拉图斯特拉还没下山，请刷新重试",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!restored) return;
    if (greetedRef.current) return;
    if (messages.length > 0) return;

    greetedRef.current = true;
    void requestGreeting();
  }, [restored, messages.length, requestGreeting]);

  // ---------- 存档自愈：候选丢失时自动重生成 ----------
  useEffect(() => {
    if (!restored) return;
    if (generatingCandidates) return;
    const needsCandidates = step === 3 || (step === 4 && candidates.length === 0);
    if (!needsCandidates) return;
    if (messages.length < 7) return;

    void generateCandidates(messages);
    // 只在恢复后判定一次，依赖收敛到 restored
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored]);

  // ---------- 发送消息 ----------
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || generatingCandidates) return;
    if (step > 2) return;

    if (trimmed.length > MAX_INPUT_LENGTH) {
      toast(`说得太多了，单次不要超过 ${MAX_INPUT_LENGTH} 字`, "error");
      return;
    }

    const previousMessages = messages;
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, stage: step as ConversationStep }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "请求失败");

      const withReply: ChatMessage[] = [
        ...newMessages,
        { role: "assistant", content: data.message },
      ];
      setMessages(withReply);
      setIsDemo(Boolean(data.demo));

      if (step < 2) {
        setStep(step + 1);
      } else {
        // 第 3 轮对话完成，自动进入 Co-Creation
        await generateCandidates(withReply);
      }
    } catch (err) {
      console.error(err);
      // 回滚这条没发出去的消息，并把内容还给输入框，避免用户白打一遍
      setMessages(previousMessages);
      setInput(trimmed);
      toast(err instanceof Error ? err.message : "出错了，请重试", "error");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Co-Creation 交互 ----------
  const handleSelectCandidate = (id: number) => {
    setSelectedCandidateId(id);
    const target = candidates.find((c) => c.id === id);
    if (target) setEditedText(target.text);
  };

  const handleConfirmCandidate = () => {
    if (selectedCandidateId === null) return;
    if (!editedText.trim()) {
      toast("宣言不能是空的", "error");
      return;
    }
    setStep(5);
  };

  const handleConfirmFinal = () => {
    if (!cardStyle || !cardName.trim()) {
      toast("请选择风格并给卡片起个名字", "error");
      return;
    }

    const createdAt = Date.now();
    setCardCreatedAt(createdAt);
    setStep(6);

    // 定稿即收藏，用户不用再点一次"保存"
    try {
      saveDeclaration({
        declaration_text: editedText.trim(),
        card_name: cardName.trim(),
        card_style: cardStyle,
      });
      toast("宣言已收藏到「我的宣言」", "success");
    } catch (err) {
      console.error(err);
    }

    // 同步到公共画廊（云端）。未配置或失败都不影响本地收藏与主流程。
    if (isRemoteGalleryEnabled) {
      saveDeclarationRemote({
        declaration_text: editedText.trim(),
        card_name: cardName.trim(),
        card_style: cardStyle,
      }).catch((e) => console.error("远程收藏失败（不影响本地）:", e));
    }
  };

  // ---------- 成果物操作 ----------
  const handleCopy = async () => {
    const text = `《${cardName}》\n\n${editedText}\n\n—— 查拉图斯特拉\n\n#孩子的游戏`;
    try {
      await navigator.clipboard.writeText(text);
      toast("已复制，可以发朋友圈或小红书了", "success");
    } catch {
      toast("复制失败，请手动长按选中文字", "error");
    }
  };

  const handleDownload = () => {
    if (!cardStyle) return;
    try {
      downloadCardImage({
        text: editedText,
        cardName,
        style: cardStyle,
        createdAt: cardCreatedAt ?? Date.now(),
      });
      toast("分享图已开始下载", "success");
    } catch (err) {
      console.error(err);
      toast("这个浏览器不支持导出图片", "error");
    }
  };

  // ---------- 重新开始 ----------
  const handleReset = () => {
    setConfirmResetOpen(false);
    clearState();

    setMessages([]);
    setInput("");
    setStep(0);
    setCandidates([]);
    setSelectedCandidateId(null);
    setEditedText("");
    setCardStyle(null);
    setCardName("");
    setCardCreatedAt(null);

    greetedRef.current = false; // 让开场白重新触发
  };

  const busy = loading || generatingCandidates;

  return (
    <>
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-ink/10 shadow-lg overflow-hidden">
        {/* 演示模式提示 */}
        {isDemo && (
          <div className="px-4 py-2 bg-gold/10 border-b border-gold/20 text-xs text-center text-ink/70">
            演示模式：未配置 DEEPSEEK_API_KEY，当前展示的是预置回复
          </div>
        )}

        {/* 顶部：步骤指示 + 重新开始 */}
        <div className="flex items-center justify-between gap-3 p-4 border-b border-ink/10 bg-ink/5">
          <StepIndicator currentStep={step} />
          {messages.length > 0 && (
            <button
              onClick={() => setConfirmResetOpen(true)}
              className="text-xs text-ink/50 hover:text-ink whitespace-nowrap transition-colors"
            >
              重新开始
            </button>
          )}
        </div>

        {/* 阶段文案 */}
        {step > 2 && (
          <div className="px-4 py-3 text-center text-sm text-ink/60 border-b border-ink/5">
            {step === 3 && "🌀 查拉图斯特拉在编织你的宣言……"}
            {step === 4 && "✨ 选择你最有感觉的一句"}
            {step === 5 && "🎨 给宣言一个家"}
            {step === 6 && "🎉 这是你的孩子宣言"}
          </div>
        )}

        {/* 对话阶段（step 0-2） */}
        {step <= 2 && (
          <>
            <div
              ref={scrollRef}
              className="h-[26rem] sm:h-96 overflow-y-auto p-4 sm:p-6 space-y-4 scroll-smooth"
            >
              {messages.length === 0 && loading && (
                <div className="text-center text-ink/50 italic py-12">
                  🌀 查拉图斯特拉正在下山……
                </div>
              )}

              {messages.map((msg, i) => (
                <Message key={i} role={msg.role} content={msg.content} />
              ))}

              {loading && messages.length > 0 && (
                <div className="flex items-center gap-2 text-ink/50 italic text-sm">
                  <span>查拉图斯特拉在沉思</span>
                  <span className="flex gap-1">
                    <span className="animate-dot w-1 h-1 rounded-full bg-ink/40" />
                    <span className="animate-dot animation-delay-150 w-1 h-1 rounded-full bg-ink/40" />
                    <span className="animate-dot animation-delay-300 w-1 h-1 rounded-full bg-ink/40" />
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-ink/10 p-4">
              <label htmlFor="chat-input" className="sr-only">
                回复查拉图斯特拉
              </label>
              <div className="flex gap-2 items-end">
                <textarea
                  id="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder={
                    messages.length === 0
                      ? "等待查拉图斯特拉开口……"
                      : "说说你那一刻的故事……"
                  }
                  className="input-field resize-none"
                  rows={2}
                  maxLength={MAX_INPUT_LENGTH}
                  disabled={busy || messages.length === 0}
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={busy || !input.trim() || messages.length === 0}
                  className="btn-primary shrink-0"
                >
                  发送
                </button>
              </div>
              <p className="mt-2 text-xs text-ink/40">
                Enter 发送 · Shift + Enter 换行
              </p>
            </div>
          </>
        )}

        {/* Step 3: 生成候选 loading */}
        {step === 3 && (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4 animate-pulse">🌀</div>
            <p className="text-ink/60">
              查拉图斯特拉正在为你编织 3 个版本的宣言……
            </p>
          </div>
        )}

        {/* Step 4: 选择候选 */}
        {step === 4 && candidates.length > 0 && (
          <div className="p-4 sm:p-6">
            <CandidateSelector
              candidates={candidates}
              selectedId={selectedCandidateId}
              editedText={editedText}
              onSelect={handleSelectCandidate}
              onEdit={setEditedText}
              onConfirm={handleConfirmCandidate}
            />
          </div>
        )}

        {/* Step 5: 风格 + 命名 */}
        {step === 5 && (
          <div className="p-4 sm:p-6 space-y-6">
            <StyleSelector selectedStyle={cardStyle} onSelect={setCardStyle} />

            <div className="pt-4 border-t border-ink/10">
              <label
                htmlFor="card-name"
                className="block text-sm font-semibold mb-2"
              >
                给你的宣言卡片起个名字
              </label>
              <input
                id="card-name"
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="例如：凌晨三点的回声 / 我的孩子宣言"
                className="input-field"
                maxLength={20}
              />
              <p className="mt-2 text-xs text-ink/40 text-right">
                {cardName.length} / 20
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={() => setStep(4)}
                className="btn-secondary sm:w-32"
              >
                ← 上一步
              </button>
              <button
                onClick={handleConfirmFinal}
                disabled={!cardStyle || !cardName.trim()}
                className="btn-primary flex-1"
              >
                生成我的孩子宣言 ✨
              </button>
            </div>
          </div>
        )}

        {/* Step 6: 最终卡片 */}
        {step === 6 && cardStyle && (
          <div className="p-4 sm:p-6 space-y-4">
            <DeclarationCard
              text={editedText}
              cardName={cardName}
              style={cardStyle}
              createdAt={cardCreatedAt ?? undefined}
            />

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => void handleCopy()} className="btn-primary">
                📋 复制文字
              </button>
              <button onClick={handleDownload} className="btn-secondary">
                🖼 存成图片
              </button>
            </div>

            <button
              onClick={() => setConfirmResetOpen(true)}
              className="w-full text-xs text-ink/50 hover:text-ink py-2 transition-colors"
            >
              再玩一次
            </button>

            <p className="text-xs text-center text-ink/50">
              💡 把宣言发到朋友圈 / 小红书，附上 <code>#孩子的游戏</code>
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        title="确定要重新开始吗？"
        description="这会清空当前对话和宣言。已经收藏到「我的宣言」里的内容不受影响。"
        confirmText="清空并重来"
        danger
        onConfirm={handleReset}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </>
  );
}
