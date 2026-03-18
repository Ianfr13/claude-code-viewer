import { Trans, useLingui } from "@lingui/react";
import { ClockIcon } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";
import { useCreateSchedulerJob } from "@/hooks/useScheduler";
import { useConfig } from "../../../../../../hooks/useConfig";
import {
  ChatInput,
  type MessageInput,
  useContinueSessionProcessMutation,
} from "../../../../components/chatForm";

export const ContinueChat: FC<{
  projectId: string;
  sessionId: string;
  sessionProcessId: string;
  sessionProcessStatus?: "running" | "paused";
}> = ({ projectId, sessionId, sessionProcessId, sessionProcessStatus }) => {
  const { i18n } = useLingui();
  const continueSessionProcess = useContinueSessionProcessMutation(
    projectId,
    sessionId,
  );
  const createSchedulerJob = useCreateSchedulerJob();
  const { config } = useConfig();

  const isRunning = sessionProcessStatus === "running";

  const handleSubmit = async (input: MessageInput) => {
    if (isRunning) {
      // Queue the message to run after the current task completes.
      // Setting reservedExecutionTime to now means the scheduler will pick it
      // up immediately once the session becomes available.
      try {
        await createSchedulerJob.mutateAsync({
          name: i18n._({
            id: "chat.queued_message.name",
            message: "Queued message",
          }),
          schedule: {
            type: "reserved",
            reservedExecutionTime: new Date().toISOString(),
          },
          message: {
            content: input.text,
            projectId,
            baseSession: { type: "resume", sessionId },
          },
          enabled: true,
        });

        toast.success(
          i18n._({
            id: "chat.queued_send.success",
            message: "Message queued",
          }),
          {
            description: i18n._({
              id: "chat.queued_send.success_description",
              message: "Will be sent automatically after Claude finishes",
            }),
          },
        );
      } catch (error) {
        toast.error(
          i18n._({
            id: "chat.queued_send.failed",
            message: "Failed to queue message",
          }),
          {
            description: error instanceof Error ? error.message : undefined,
          },
        );
      }
      return;
    }

    await continueSessionProcess.mutateAsync({ input, sessionProcessId });
  };

  const getPlaceholder = () => {
    if (isRunning) {
      return i18n._({
        id: "chat.placeholder.continue.running",
        message:
          "Type a message to queue — it will be sent after Claude finishes",
      });
    }

    const behavior = config?.enterKeyBehavior;
    if (behavior === "enter-send") {
      return i18n._({
        id: "chat.placeholder.continue.enter",
        message:
          "Type your message... (Start with / for commands, @ for files, Enter to send)",
      });
    }
    if (behavior === "command-enter-send") {
      return i18n._({
        id: "chat.placeholder.continue.command_enter",
        message:
          "Type your message... (Start with / for commands, @ for files, Command+Enter to send)",
      });
    }
    return i18n._({
      id: "chat.placeholder.continue.shift_enter",
      message:
        "Type your message... (Start with / for commands, @ for files, Shift+Enter to send)",
    });
  };

  const buttonText = isRunning ? (
    <span className="flex items-center gap-1.5">
      <ClockIcon className="w-3.5 h-3.5" />
      <Trans id="chat.queue" message="Queue" />
    </span>
  ) : (
    <Trans id="chat.send" />
  );

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 pb-3">
      {isRunning && (
        <div className="flex items-center gap-1.5 mb-1.5 px-1 text-[11px] text-muted-foreground">
          <ClockIcon className="w-3 h-3 text-yellow-500 flex-shrink-0" />
          <span>
            <Trans
              id="chat.running.queue_hint"
              message="Claude is working — your message will be queued and sent after it finishes"
            />
          </span>
        </div>
      )}
      <ChatInput
        projectId={projectId}
        onSubmit={handleSubmit}
        isPending={
          isRunning
            ? createSchedulerJob.isPending
            : continueSessionProcess.isPending
        }
        error={
          isRunning ? createSchedulerJob.error : continueSessionProcess.error
        }
        placeholder={getPlaceholder()}
        buttonText={buttonText}
        containerClassName=""
        buttonSize="default"
        enableScheduledSend={!isRunning}
        baseSessionId={sessionId}
        disabled={false}
        showModelSelector={true}
      />
    </div>
  );
};
