/**
 * INTEGRATION NOTES — no redesign, just two additions to your existing Chat page.
 *
 * Your current Chat page layout stays exactly as-is. You only need to:
 *
 * 1) Import the hook + component at the top of your Chat page file:
 *
 *    import { ProcessingTimeline } from "@/components/ProcessingTimeline";
 *    import { useProcessingStages } from "@/hooks/useProcessingStages";
 *
 * 2) Call the hook inside your existing Chat component (mock state only,
 *    auto-advances through stages — no backend wiring needed):
 *
 *    function ChatPage() {
 *      const { stages, isComplete } = useProcessingStages();
 *
 *      // ...all your existing state and logic stays untouched...
 *
 *      return (
 *        <div className="your-existing-chat-layout">
 *          <div className="your-existing-messages-area">
 *            {/* existing message list, unchanged *\/}
 *          </div>
 *
 *          {/* --- ONLY NEW LINE: place directly above your chat input --- *\/}
 *          <ProcessingTimeline stages={stages} isComplete={isComplete} className="mb-3" />
 *
 *          <div className="your-existing-chat-input">
 *            {/* existing input box, unchanged *\/}
 *          </div>
 *        </div>
 *      );
 *    }
 *
 * That's it — nothing else in the page needs to change. The timeline is a
 * self-contained card that sits above the input and doesn't affect the
 * surrounding layout or existing chat logic.
 *
 * If you want to trigger the timeline only when a document is actually
 * uploaded (instead of auto-starting), call the hook with autoStart=false
 * and drive it manually:
 *
 *    const { stages, isComplete, restart } = useProcessingStages(false);
 *    // call restart() when the user uploads a file to kick off the mock run
 */
export {};
