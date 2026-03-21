import type {
  SDKMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type { FileSystem, Path } from "@effect/platform";
import type { CommandExecutor } from "@effect/platform/CommandExecutor";
import { Context, Effect, Layer, Runtime } from "effect";
import { ulid } from "ulid";
import { controllablePromise } from "../../../../lib/controllablePromise";
import type { UserConfig } from "../../../lib/config/config";
import type { InferEffect } from "../../../lib/effect/types";
import { EventBus } from "../../events/services/EventBus";
import type { CcvOptionsService } from "../../platform/services/CcvOptionsService";
import type { EnvService } from "../../platform/services/EnvService";
import { SessionRepository } from "../../session/infrastructure/SessionRepository";
import { StreamingStateDatabase } from "../../session/infrastructure/StreamingStateDatabase";
import { VirtualConversationDatabase } from "../../session/infrastructure/VirtualConversationDatabase";
import type { SessionMetaService } from "../../session/services/SessionMetaService";
import {
  createMessageGenerator,
  type UserMessageInput,
} from "../functions/createMessageGenerator";
import * as CCSessionProcess from "../models/CCSessionProcess";
import * as ClaudeCode from "../models/ClaudeCode";
import type * as CCTurn from "../models/ClaudeCodeTurn";
import { ClaudeCodePermissionService } from "./ClaudeCodePermissionService";
import { ClaudeCodeSessionProcessService } from "./ClaudeCodeSessionProcessService";

export type MessageGenerator = () => AsyncGenerator<
  SDKUserMessage,
  void,
  unknown
>;

const LayerImpl = Effect.gen(function* () {
  const eventBusService = yield* EventBus;
  const sessionRepository = yield* SessionRepository;
  const sessionProcessService = yield* ClaudeCodeSessionProcessService;
  const virtualConversationDatabase = yield* VirtualConversationDatabase;
  const permissionService = yield* ClaudeCodePermissionService;
  const streamingStateDatabase = yield* StreamingStateDatabase;

  const runtime = yield* Effect.runtime<
    | FileSystem.FileSystem
    | Path.Path
    | CommandExecutor
    | VirtualConversationDatabase
    | StreamingStateDatabase
    | SessionMetaService
    | ClaudeCodePermissionService
    | EnvService
    | CcvOptionsService
  >();

  const continueSessionProcess = (options: {
    sessionProcessId: string;
    baseSessionId: string;
    input: UserMessageInput;
  }) => {
    const { sessionProcessId, baseSessionId, input } = options;

    return Effect.gen(function* () {
      const { sessionProcess, task } =
        yield* sessionProcessService.continueSessionProcess({
          sessionProcessId,
          turnDef: {
            type: "continue",
            sessionId: baseSessionId,
            baseSessionId: baseSessionId,
            turnId: ulid(),
          },
        });

      const virtualConversation =
        yield* CCSessionProcess.createVirtualConversation(sessionProcess, {
          sessionId: baseSessionId,
          userMessage: input.text,
        });

      yield* virtualConversationDatabase.createVirtualConversation(
        sessionProcess.def.projectId,
        baseSessionId,
        [virtualConversation],
      );

      // Notify frontend that user message was added to virtual conversation
      // This allows immediate display of the user's message before Claude responds
      yield* eventBusService.emit("virtualConversationUpdated", {
        projectId: sessionProcess.def.projectId,
        sessionId: baseSessionId,
      });

      sessionProcess.def.setNextMessage(input);
      return {
        sessionProcess,
        task,
      };
    });
  };

  const startSessionProcess = (options: {
    projectId: string;
    cwd: string;
    input: UserMessageInput;
    userConfig: UserConfig;
    baseSession:
      | undefined
      | {
          type: "fork";
          sessionId: string;
        }
      | {
          type: "resume";
          sessionId: string;
        };
    ccOptions?: CCTurn.CCOptions;
  }) => {
    const { projectId, cwd, input, userConfig, baseSession, ccOptions } =
      options;

    return Effect.gen(function* () {
      const {
        generateMessages,
        setNextMessage,
        setHooks: setMessageGeneratorHooks,
      } = createMessageGenerator();

      const { sessionProcess, task } =
        yield* sessionProcessService.startSessionProcess({
          sessionDef: {
            projectId,
            cwd,
            abortController: new AbortController(),
            setNextMessage,
            sessionProcessId: ulid(),
          },
          turnDef:
            baseSession === undefined
              ? {
                  type: "new",
                  turnId: ulid(),
                  ccOptions,
                }
              : baseSession.type === "fork"
                ? {
                    type: "fork",
                    turnId: ulid(),
                    sessionId: baseSession.sessionId,
                    baseSessionId: baseSession.sessionId,
                    ccOptions,
                  }
                : {
                    type: "resume",
                    turnId: ulid(),
                    sessionId: undefined,
                    baseSessionId: baseSession.sessionId,
                    ccOptions,
                  },
        });

      const sessionInitializedPromise = controllablePromise<{
        sessionId: string;
      }>();
      const sessionFileCreatedPromise = controllablePromise<{
        sessionId: string;
      }>();

      setMessageGeneratorHooks({
        onNewUserMessageResolved: async (input) => {
          Effect.runFork(
            sessionProcessService.toNotInitializedState({
              sessionProcessId: sessionProcess.def.sessionProcessId,
              rawUserMessage: input.text,
            }),
          );
        },
      });

      const handleMessage = (message: SDKMessage) =>
        Effect.gen(function* () {
          const processState = yield* sessionProcessService.getSessionProcess(
            sessionProcess.def.sessionProcessId,
          );

          // Check abort signal before processing message
          if (sessionProcess.def.abortController.signal.aborted) {
            return "break" as const;
          }

          if (processState.type === "completed") {
            return "break" as const;
          }

          if (processState.type === "paused") {
            // rule: paused 假定更新为 not_initialized
            return yield* Effect.die(
              new Error("Illegal state: paused is not expected"),
            );
          }

          if (
            message.type === "system" &&
            message.subtype === "init" &&
            processState.type === "not_initialized"
          ) {
            yield* sessionProcessService.toInitializedState({
              sessionProcessId: processState.def.sessionProcessId,
              initContext: {
                initMessage: message,
              },
            });

            // Virtual Conversation Creation
            const virtualConversation =
              yield* CCSessionProcess.createVirtualConversation(processState, {
                sessionId: message.session_id,
                userMessage: processState.rawUserMessage,
              });

            if (processState.currentTask.def.type === "new") {
              // 末尾に追加するだけで OK
              yield* virtualConversationDatabase.createVirtualConversation(
                projectId,
                message.session_id,
                [virtualConversation],
              );
            } else if (processState.currentTask.def.type === "resume") {
              const existingSession = yield* sessionRepository.getSession(
                processState.def.projectId,
                processState.currentTask.def.baseSessionId,
              );

              const copiedConversations =
                existingSession.session === null
                  ? []
                  : existingSession.session.conversations;

              yield* virtualConversationDatabase.createVirtualConversation(
                processState.def.projectId,
                message.session_id,
                [...copiedConversations, virtualConversation],
              );
            } else {
              // do nothing
            }

            sessionInitializedPromise.resolve({
              sessionId: message.session_id,
            });

            yield* eventBusService.emit("sessionListChanged", {
              projectId: processState.def.projectId,
            });

            yield* eventBusService.emit("sessionChanged", {
              projectId: processState.def.projectId,
              sessionId: message.session_id,
            });

            return "continue" as const;
          }

          if (message.type === "stream_event") {
            const event = message.event;
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const deltaText = event.delta.text;
              const accumulatedText =
                yield* streamingStateDatabase.appendPartialText(
                  processState.def.projectId,
                  message.session_id,
                  deltaText,
                );
              yield* eventBusService.emit("streamingTokens", {
                projectId: processState.def.projectId,
                sessionId: message.session_id,
                deltaText,
                accumulatedText,
              });
            }
            return "continue" as const;
          }

          if (message.type === "tool_progress") {
            yield* streamingStateDatabase.upsertToolProgress(
              message.session_id,
              message.tool_use_id,
              message.tool_name,
              message.elapsed_time_seconds,
            );
            yield* eventBusService.emit("toolProgress", {
              projectId: processState.def.projectId,
              sessionId: message.session_id,
              toolUseId: message.tool_use_id,
              toolName: message.tool_name,
              elapsedTimeSeconds: message.elapsed_time_seconds,
            });
            return "continue" as const;
          }

          if (message.type === "system" && message.subtype === "status") {
            yield* eventBusService.emit("sessionStatusUpdated", {
              projectId: processState.def.projectId,
              sessionId: message.session_id,
              status: message.status ?? "",
              message: undefined,
            });
            return "continue" as const;
          }

          if (
            message.type === "system" &&
            (message.subtype === "hook_started" ||
              message.subtype === "hook_progress")
          ) {
            const lifecycleKind =
              message.subtype === "hook_started"
                ? ("hook_started" as const)
                : ("hook_progress" as const);
            const {
              type: _type,
              subtype: _subtype,
              session_id,
              ...rest
            } = message;
            yield* eventBusService.emit("sessionLifecycleEvent", {
              projectId: processState.def.projectId,
              sessionId: session_id,
              lifecycleKind,
              payload: Object.fromEntries(Object.entries(rest)),
            });
            return "continue" as const;
          }

          if (
            message.type === "system" &&
            message.subtype === "hook_response"
          ) {
            const {
              type: _type,
              subtype: _subtype,
              session_id,
              ...rest
            } = message;
            yield* eventBusService.emit("sessionLifecycleEvent", {
              projectId: processState.def.projectId,
              sessionId: session_id,
              lifecycleKind: "hook_response",
              payload: Object.fromEntries(Object.entries(rest)),
            });
            return "continue" as const;
          }

          if (
            message.type === "assistant" &&
            processState.type === "initialized"
          ) {
            // Clear partial text accumulation now that we have the full assistant message
            yield* streamingStateDatabase.clearPartialText(message.session_id);

            yield* sessionProcessService.toFileCreatedState({
              sessionProcessId: processState.def.sessionProcessId,
            });

            sessionFileCreatedPromise.resolve({
              sessionId: message.session_id,
            });

            // Notify frontend that new assistant message is available
            // This triggers before file watcher debounce, reducing perceived latency
            yield* eventBusService.emit("virtualConversationUpdated", {
              projectId: processState.def.projectId,
              sessionId: message.session_id,
            });

            yield* virtualConversationDatabase.deleteVirtualConversations(
              message.session_id,
            );
          }

          if (message.type === "result") {
            if (
              processState.type === "file_created" ||
              processState.type === "initialized"
            ) {
              yield* sessionProcessService.toPausedState({
                sessionProcessId: processState.def.sessionProcessId,
                resultMessage: message,
              });

              yield* eventBusService.emit("sessionChanged", {
                projectId: processState.def.projectId,
                sessionId: message.session_id,
              });
            }

            return "continue" as const;
          }

          return "continue" as const;
        });

      const handleSessionProcessDaemon = async () => {
        const messageIter = await Runtime.runPromise(runtime)(
          Effect.gen(function* () {
            const permissionOptions =
              yield* permissionService.createCanUseToolRelatedOptions({
                turnId: task.def.turnId,
                userConfig,
                sessionId: task.def.baseSessionId,
              });

            return yield* ClaudeCode.query(generateMessages(), {
              ...(task.def.type === "continue" ? {} : task.def.ccOptions),
              ...permissionOptions,
              resume: task.def.baseSessionId,
              cwd: sessionProcess.def.cwd,
              abortController: sessionProcess.def.abortController,
            });
          }),
        );

        setNextMessage(input);

        try {
          for await (const message of messageIter) {
            const result = await Runtime.runPromise(runtime)(
              handleMessage(message),
            ).catch((error) => {
              // iter 自体が落ちてなければ継続したいので握りつぶす
              Effect.runFork(
                sessionProcessService.changeTurnState({
                  sessionProcessId: sessionProcess.def.sessionProcessId,
                  turnId: task.def.turnId,
                  nextTask: {
                    status: "failed",
                    def: task.def,
                    error: error,
                  },
                }),
              );

              if (sessionInitializedPromise.status === "pending") {
                sessionInitializedPromise.reject(error);
              }

              if (sessionFileCreatedPromise.status === "pending") {
                sessionFileCreatedPromise.reject(error);
              }

              return "continue" as const;
            });

            if (result === "break") {
              break;
            } else {
            }
          }
        } catch (error) {
          if (sessionInitializedPromise.status === "pending") {
            sessionInitializedPromise.reject(error);
          }

          if (sessionFileCreatedPromise.status === "pending") {
            sessionFileCreatedPromise.reject(error);
          }

          await Effect.runPromise(
            sessionProcessService.changeTurnState({
              sessionProcessId: sessionProcess.def.sessionProcessId,
              turnId: task.def.turnId,
              nextTask: {
                status: "failed",
                def: task.def,
                error: error,
              },
            }),
          );
        }
      };

      const daemonPromise = handleSessionProcessDaemon()
        .catch((error) => {
          console.error("Error occur in task daemon process", error);
          if (sessionInitializedPromise.status === "pending") {
            sessionInitializedPromise.reject(error);
          }
          if (sessionFileCreatedPromise.status === "pending") {
            sessionFileCreatedPromise.reject(error);
          }
          throw error;
        })
        .finally(() => {
          Effect.runFork(
            Effect.gen(function* () {
              const currentProcess =
                yield* sessionProcessService.getSessionProcess(
                  sessionProcess.def.sessionProcessId,
                );

              yield* sessionProcessService.toCompletedState({
                sessionProcessId: currentProcess.def.sessionProcessId,
              });
            }),
          );
        });

      return {
        sessionProcess,
        task,
        daemonPromise,
        awaitSessionInitialized: async () =>
          await sessionInitializedPromise.promise,
        awaitSessionFileCreated: async () =>
          await sessionFileCreatedPromise.promise,
        yieldSessionInitialized: () =>
          Effect.promise(() => sessionInitializedPromise.promise),
        yieldSessionFileCreated: () =>
          Effect.promise(() => sessionFileCreatedPromise.promise),
      };
    });
  };

  const getPublicSessionProcesses = () =>
    Effect.gen(function* () {
      const processes = yield* sessionProcessService.getSessionProcesses();
      return processes.filter((process) => CCSessionProcess.isPublic(process));
    });

  const abortTask = (sessionProcessId: string): Effect.Effect<void, Error> =>
    Effect.gen(function* () {
      const currentProcess =
        yield* sessionProcessService.getSessionProcess(sessionProcessId);

      currentProcess.def.abortController.abort();

      yield* sessionProcessService.toCompletedState({
        sessionProcessId: currentProcess.def.sessionProcessId,
        error: new Error("Task aborted"),
      });
    });

  const abortAllTasks = () =>
    Effect.gen(function* () {
      const processes = yield* sessionProcessService.getSessionProcesses();

      for (const process of processes) {
        yield* sessionProcessService.toCompletedState({
          sessionProcessId: process.def.sessionProcessId,
          error: new Error("Task aborted"),
        });
      }
    });

  return {
    continueSessionProcess,
    startSessionProcess,
    abortTask,
    abortAllTasks,
    getPublicSessionProcesses,
  };
});

export type IClaudeCodeLifeCycleService = InferEffect<typeof LayerImpl>;

export class ClaudeCodeLifeCycleService extends Context.Tag(
  "ClaudeCodeLifeCycleService",
)<ClaudeCodeLifeCycleService, IClaudeCodeLifeCycleService>() {
  static Live = Layer.effect(this, LayerImpl);
}
