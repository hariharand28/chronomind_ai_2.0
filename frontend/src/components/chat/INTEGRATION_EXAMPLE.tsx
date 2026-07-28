/**
 * INTEGRATION EXAMPLE — not a component to import, just a reference.
 *
 * Shows the minimal diff to your existing Chat page. Only two lines
 * change: an import, and one new line right above your chat input.
 * Sidebar, layout, and the rest of the chat UI stay untouched.
 */

import { DocumentUploadFlow } from "@/components/document-upload/DocumentUploadFlow";
// ...your existing imports (ChatInput, MessageList, Sidebar, etc.) stay as-is

export function ChatPage() {
  return (
    <div className="flex h-full">
      {/* <Sidebar />  <-- unchanged, not touched */}

      <div className="flex flex-1 flex-col">
        {/* <MessageList />  <-- unchanged, not touched */}

        <div className="border-t border-border p-4">
          {/* NEW: upload zone -> processing timeline -> proposal summary */}
          <DocumentUploadFlow className="mb-3" />

          {/* <ChatInput />  <-- unchanged, not touched */}
        </div>
      </div>
    </div>
  );
}
