import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { 
  Paperclip, 
  Send, 
  X, 
  FileText, 
  Image as ImageIcon, 
  File, 
  Sparkles,
  Bot,
  Square // Imported Square for the Stop button
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  cannedReply,
  seedConversations,
  type UIMessage,
  type UIMessagePart,
} from "@/lib/mock-data";
import logoUrl from "@/assets/gethu.png";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Chronomind" },
      {
        name: "description",
        content: "Chat with your assistant, attach documents, and get answers.",
      },
    ],
  }),
  component: ChatPage,
});

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx,.txt,.md,.csv";

// Helper to determine the best icon for a file type
function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.includes("pdf") || mime.includes("word") || mime.includes("text")) return FileText;
  return File;
}

function ChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<UIMessage[]>(seedConversations[0]?.messages || []);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // Controller for aborting requests

  // Smooth scroll to bottom on new messages or pending state change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    
    // Prevent starting a new request if one is already pending
    if (pending) return;

    const text = input.trim();
    if (!text && files.length === 0) return;

    // Build the message parts
    const parts: UIMessagePart[] = [];
    if (text) parts.push({ type: "text", text });
    
    for (const f of files) {
      parts.push({
        type: "file",
        name: f.name,
        size: f.size,
        mime: f.type || "application/octet-stream",
      });
    }

    const userMsg: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts,
      createdAt: new Date().toISOString(),
    };

    // Show the user's message immediately
setMessages((prev) => [...prev, userMsg]);

// Show a temporary loading message


    setInput("");
    setFiles([]);
    setPending(true);

    // Initialize AbortController for the new request
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append("user_text", text);
      if (files.length > 0) formData.append("image", files[0]);
      
      const response = await fetch("https://chronomind-ai-2-0.onrender.com/chat", {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current?.signal, // Attach the abort signal
      });

      if (!response.ok) throw new Error("Failed to contact backend");


const data = await response.json();

const proposal = data.proposal.raw_proposal ?? data.proposal;

// Remove the loading message


sessionStorage.setItem(
    "proposal",
    JSON.stringify(proposal)
);

// Small delay so the user sees the loading state
setTimeout(() => {
    navigate({
        to: "/proposal",
    });
}, 800);


    } catch (err) { 
      // Ignore the error if it was intentionally aborted by the user
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Generation stopped by the user.");
        return; 
      }

      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred.";
      const errorReply: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [{ type: "text", text: `⚠️ **Connection Error:**\n${errorMessage}` }],
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, errorReply]);
    } finally {
      setPending(false);
      abortControllerRef.current = null;
    }
  };

  // Function to stop the ongoing generation
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Prevent submission if currently pending
      if (!pending) {
        formRef.current?.requestSubmit();
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background/50">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="mx-auto max-w-3xl px-4 py-8">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 py-24 text-center">
                <img src={logoUrl} alt="Logo" width={55} height={55} className="object-contain" />
            
              <h1 className="text-3xl font-bold tracking-tight">Hi there! How can I help?</h1>
              <p className="mt-2 text-base text-muted-foreground max-w-md">
                Ask a complex question, generate content, or attach a document to get started.
              </p>
              
              <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                {["Summarize this document", "Help me write an email", "Analyze this image", "Explain a complex topic"].map((suggestion) => (
                  <Button 
                    key={suggestion} 
                    variant="outline" 
                    className="h-auto py-3 justify-start text-muted-foreground hover:text-foreground"
                    onClick={() => setInput(suggestion)}
                    disabled={pending}
                  >
                    <Sparkles className="mr-2 h-4 w-4 text-primary" />
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {pending && (
                <div className="flex gap-3 animate-in fade-in duration-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shadow-sm">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted/40 px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-px w-full" />
            </div>
          )}
        </div>
      </div>

      {/* Input Area (Fixed to bottom with glassmorphism) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-6 pb-4">
        <div className="mx-auto max-w-3xl px-4">
          <form 
            ref={formRef}
            onSubmit={handleSubmit}
            className="relative flex flex-col rounded-2xl border bg-background/60 backdrop-blur-xl shadow-lg ring-offset-background focus-within:ring-2 focus-within:ring-primary/20 transition-all"
          >
            {/* Staged Files Preview */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b p-3">
                {files.map((f, i) => {
                  const Icon = fileIcon(f.type);
                  const isImage = f.type.startsWith("image/");
                  const objectUrl = isImage ? URL.createObjectURL(f) : null;

                  return (
                    <div
                      key={i}
                      className="group relative flex items-center gap-2 overflow-hidden rounded-lg border bg-muted/50 p-1.5 pr-3 text-sm transition-colors hover:bg-muted"
                    >
                      {isImage && objectUrl ? (
                        <div className="h-8 w-8 overflow-hidden rounded-md bg-black/5">
                          <img src={objectUrl} alt="preview" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="max-w-[120px] truncate font-medium text-xs leading-tight">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        disabled={pending}
                        className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm group-hover:flex disabled:hidden"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Text Input Row */}
            <div className="flex items-end gap-2 p-2">
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={ACCEPT}
                disabled={pending}
                className="hidden"
                onChange={(e) => {
                  const list = e.target.files;
                  if (list) setFiles((prev) => [...prev, ...Array.from(list)]);
                  e.target.value = ""; // Reset input so same file can be selected again
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={pending}
                className="mb-1 h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => fileRef.current?.click()}
                aria-label="Attach files"
              >
                <Paperclip className="h-[18px] w-[18px]" />
              </Button>
              
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={pending}
                placeholder="Message Chronomind…"
                rows={1}
                className="min-h-[44px] max-h-48 flex-1 resize-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 sm:text-sm disabled:opacity-60"
              />
              
              {pending ? (
                <Button
                  type="button"
                  size="icon"
                  className="mb-1 h-9 w-9 shrink-0 transition-transform active:scale-95"
                  onClick={handleStop}
                  aria-label="Stop generating"
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  className="mb-1 h-9 w-9 shrink-0 transition-transform active:scale-95"
                  disabled={!input.trim() && files.length === 0}
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
          <p className="mt-3 text-center text-[11px] text-muted-foreground font-medium">
            Chronomind can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const textParts = message.parts.filter((p) => p.type === "text") as { type: "text"; text: string }[];
  const text = textParts.map((p) => p.text).join("\n\n");
  const files = message.parts.filter((p) => p.type === "file") as Extract<UIMessagePart, { type: "file" }>[];

  if (isUser) {
    return (
      <div className="flex w-full justify-end animate-in slide-in-from-right-4 duration-300 fade-in">
        <div className="max-w-[85%] rounded-3xl rounded-br-sm bg-primary px-5 py-3.5 text-primary-foreground shadow-sm sm:max-w-[75%]">
          {text && <div className="whitespace-pre-wrap leading-relaxed">{text}</div>}
          
          {files.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((f, i) => {
                const isImage = f.mime?.startsWith("image/");
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg bg-primary-foreground/15 px-3 py-2 text-xs font-medium backdrop-blur-sm"
                  >
                    {isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    <span className="truncate max-w-[150px]">{f.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant Bubble
  return (
    <div className="flex w-full gap-4 animate-in slide-in-from-left-4 duration-300 fade-in">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm">
        <img src={logoUrl} alt="AI" width={20} height={20} className="object-contain" />
      </div>
      <div className="flex-1 space-y-2 overflow-hidden rounded-3xl rounded-tl-sm border bg-card/50 px-5 py-4 shadow-sm">
        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}