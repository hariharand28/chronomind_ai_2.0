import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileUploadZone } from "./FileUploadZone";
import { ProcessingTimeline } from "./ProcessingTimeline";
import { ProposalResultCard } from "./ProposalResultCard";

type FlowState = "idle" | "processing" | "done";

interface DocumentUploadFlowProps {
  className?: string;
}

/**
 * Drop-in unit: drag-and-drop upload -> animated mock processing timeline
 * -> found-items summary with "Review Proposal" CTA (navigates to /proposal).
 *
 * Usage: render this directly above your existing chat input, e.g.
 *
 *   <DocumentUploadFlow />
 *   <ChatInput ... />   // unchanged
 */
export function DocumentUploadFlow({ className }: DocumentUploadFlowProps) {
  const [state, setState] = useState<FlowState>("idle");
  const [fileName, setFileName] = useState<string>("");
  const navigate = useNavigate();

  const reset = () => {
    setState("idle");
    setFileName("");
  };

  return (
    <div className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {state === "idle" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FileUploadZone
              onFileAccepted={(file) => {
                setFileName(file.name);
                setState("processing");
              }}
            />
          </motion.div>
        )}

        {state === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ProcessingTimeline fileName={fileName} onComplete={() => setState("done")} />
          </motion.div>
        )}

        {state === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ProposalResultCard
              onReview={() => {
                navigate("/proposal");
                reset();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
