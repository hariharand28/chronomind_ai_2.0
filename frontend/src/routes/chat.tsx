  import { createFileRoute } from "@tanstack/react-router";
  import { useEffect, useRef, useState } from "react";
  import { Paperclip, Send, X, FileText, Image as ImageIcon, File } from "lucide-react";
  import ReactMarkdown from "react-markdown";
  import { Button } from "@/components/ui/button";
  import { Textarea } from "@/components/ui/textarea";

  import {
    cannedReply,
    seedConversations,
    type UIMessage,
    type UIMessagePart,
  } from "@/lib/mock-data";
  import logoUrl from "@/assets/logo.png";

  export const Route = createFileRoute("/chat")({
    head: () => ({
      meta: [
        { title: "Chat — Chronomind" },
        {
          name: "description",
          content: "Chat with your assistant, attach documents, and get answers.",
        },
        { property: "og:title", content: "Chat — Chronomind" },
        {
          property: "og:description",
          content: "Chat with your assistant, attach documents, and get answers.",
        },
      ],
    }),
    component: ChatPage,
  });

  const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx,.txt,.md,.csv";

  function fileIcon(mime: string) {
    if (mime.startsWith("image/")) return ImageIcon;
    if (mime.includes("pdf") || mime.includes("word") || mime.includes("text")) return FileText;
    return File;
  }

  function ChatPage() {
    const [messages, setMessages] = useState<UIMessage[]>(seedConversations[0].messages);
    const [input, setInput] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [pending, setPending] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, pending]);

    const send = async () => {
      const text = input.trim();
      if (!text && files.length === 0) return;
      const parts: UIMessagePart[] = [];
      if (text) parts.push({ type: "text", text });
      for (const f of files)
        parts.push({
          type: "file",
          name: f.name,
          size: f.size,
          mime: f.type || "application/octet-stream",
        });
      const userMsg: UIMessage = {
        id: crypto.randomUUID(),
        role: "user",
        parts,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setFiles([]);
      setPending(true);

      try {
        const formData = new FormData();

        formData.append("user_text", text);

        // For now send only the first file
        if (files.length > 0) {
          formData.append("image", files[0]);
        }

        const response = await fetch("http://localhost:8000/chat", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to contact backend");
        }

        const data = await response.json();

        const proposal = data.proposal;

        setMessages((m) => [...m, proposal]);
      } catch (err) {
        const reply: UIMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: `Backend error:\n\n${err}`,
            },
          ],
          createdAt: new Date().toISOString(),
        };

        setMessages((m) => [...m, reply]);
      } finally {
        setPending(false);
      }
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    };

    const empty = messages.length === 0;

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8">
            {empty ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <img src={logoUrl} alt="" width={64} height={64} className="mb-4" />
                <h1 className="text-2xl font-semibold tracking-tight">How can I help you today?</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ask a question or attach documents to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
                {pending && (
                  <div className="text-sm text-muted-foreground animate-pulse">Thinking…</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t bg-background p-4">
          <div className="mx-auto max-w-3xl">
            {files.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {files.map((f, i) => {
                  const Icon = fileIcon(f.type);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-xs"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="max-w-[200px] truncate">{f.name}</span>
                      <span className="text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                      <button
                        onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="relative flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm">
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const list = e.target.files;
                  if (list) setFiles((prev) => [...prev, ...Array.from(list)]);
                  e.target.value = "";
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileRef.current?.click()}
                aria-label="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message Chronomind…"
                rows={1}
                className="min-h-[40px] max-h-48 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button
                size="icon"
                onClick={send}
                disabled={!input.trim() && files.length === 0}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Chronomind can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  function MessageBubble({ message }: { message: UIMessage }) {
    const isUser = message.role === "user";
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("\n\n");
    const files = message.parts.filter((p) => p.type === "file") as Array<
      Extract<UIMessagePart, { type: "file" }>
    >;

    if (isUser) {
      return (
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-primary-foreground">
            {text && <div className="whitespace-pre-wrap">{text}</div>}
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md bg-primary-foreground/10 px-2 py-1 text-xs"
                  >
                    <FileText className="h-3 w-3" />
                    <span className="truncate">{f.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex gap-3">
        <img src={logoUrl} alt="" width={28} height={28} className="mt-1 h-7 w-7 flex-shrink-0" />
        <div className="prose prose-sm dark:prose-invert max-w-none flex-1 text-foreground">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      </div>
    );
  }
