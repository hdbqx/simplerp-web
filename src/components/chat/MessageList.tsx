import { memo, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { Pencil, RefreshCw, Save, Trash2 } from 'lucide-react';
import { type Character, type Message, type RoomMessage, type Settings } from '../../lib/db';
import { replaceVariables as replaceBuiltInVariables } from '../../lib/variables';
import { useChatStore } from '../../lib/chat-store';

type MessageListProps = {
  viewMode: 'char' | 'group';
  roomMessages?: RoomMessage[];
  settings?: Settings;
  currentCharacter?: Character;
  characterNameById: Map<number, string>;
  isTyping: boolean;
  onRegenerate: () => Promise<void>;
  onDeleteCharMessage: (message: Message) => Promise<void>;
  onEditCharMessage: (messageId: number, content: string) => Promise<void>;
  onSaveCharImage: (message: Message) => Promise<void>;
  onSetContextCutoff: (messageId: number | null) => Promise<void>;
};

const markdownSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'input'],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), 'target', 'rel'],
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    img: [...(defaultSchema.attributes?.img || []), 'src', 'alt', 'title'],
    input: ['type', 'checked', 'disabled'],
  },
};

export const MessageList = memo(function MessageList({
  viewMode,
  roomMessages = [],
  settings,
  currentCharacter,
  characterNameById,
  isTyping,
  onRegenerate,
  onDeleteCharMessage,
  onEditCharMessage,
  onSaveCharImage,
  onSetContextCutoff,
}: MessageListProps) {
  const charMessages = useChatStore((state) => state.messages);
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const allMessages = useMemo(
    () => (viewMode === 'group' ? roomMessages : charMessages),
    [charMessages, roomMessages, viewMode],
  );
  const hiddenMessageCount = viewMode === 'char' ? Math.max(0, currentCharacter?.hidden_message_count || 0) : 0;
  const visibleMessages = useMemo(
    () => (hiddenMessageCount > 0 ? allMessages.slice(hiddenMessageCount) : allMessages),
    [allMessages, hiddenMessageCount],
  );
  const cutoffMessageId = viewMode === 'char' ? currentCharacter?.context_cutoff_message_id ?? null : null;
  const cutoffIndexInAll = useMemo(
    () => (cutoffMessageId ? allMessages.findIndex((message) => message.id === cutoffMessageId) : -1),
    [allMessages, cutoffMessageId],
  );
  const markdownComponents = useMemo(
    () => ({
      a: ({ href, children, ...props }: any) => (
        <a
          {...props}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-info underline decoration-dotted underline-offset-4 transition hover:text-primary"
        >
          {children}
        </a>
      ),
      table: ({ children, ...props }: any) => (
        <div className="my-3 overflow-x-auto rounded-xl border border-base-content/10">
          <table {...props} className="table table-xs table-zebra w-full min-w-[24rem]">
            {children}
          </table>
        </div>
      ),
      input: ({ type, checked, ...props }: any) =>
        type === 'checkbox' ? (
          <input
            {...props}
            type="checkbox"
            checked={checked}
            disabled
            readOnly
            className="checkbox checkbox-xs mr-2 align-middle"
          />
        ) : (
          <input {...props} type={type} />
        ),
      img: ({ src, alt, ...props }: any) => (
        <img
          {...props}
          src={src}
          alt={alt || 'markdown image'}
          className="my-3 max-h-[28rem] rounded-2xl border border-base-content/10 object-contain shadow-lg"
          loading="lazy"
        />
      ),
    }),
    [],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length, viewMode, currentCharacter?.id]);

  useEffect(() => {
    setEditingMsgId(null);
    setEditContent('');
  }, [viewMode, currentCharacter?.id]);

  const hiddenVisibleCount = Math.min(hiddenMessageCount, allMessages.length);
  const showDividerBeforeFirstVisible =
    cutoffIndexInAll >= 0 && visibleMessages.length > 0 && cutoffIndexInAll < hiddenMessageCount;
  const showBottomDivider = cutoffIndexInAll >= 0 && cutoffIndexInAll === allMessages.length - 1;

  const renderDivider = () => (
    <div className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-[0.18em] text-warning/80">
      <div className="h-px flex-1 bg-warning/35" />
      <span>上下文断点：以上历史不再发送给 LLM</span>
      <button className="text-[10px] normal-case tracking-normal hover:text-warning" onClick={() => void onSetContextCutoff(null)}>
        清除断点
      </button>
      <div className="h-px flex-1 bg-warning/35" />
    </div>
  );

  return (
    <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4">
      {viewMode === 'char' && hiddenVisibleCount > 0 && (
        <div className="rounded-xl border border-dashed border-base-content/15 bg-base-200/40 px-4 py-2 text-xs opacity-70">
          已隐藏最早的 {hiddenVisibleCount} 条消息。它们仍保留在数据库中，也仍可参与未被截断的上下文。
        </div>
      )}

      {showDividerBeforeFirstVisible && renderDivider()}

      {visibleMessages.map((message, index) => {
        const isUser = message.role === 'user' || ('sender_type' in message && message.sender_type === 'user');
        const headerName = isUser ? settings?.user_name || '玩家' : characterNameById.get(message.char_id || 0) || 'AI';
        const isLastCharAssistant =
          viewMode === 'char' &&
          message.role !== 'user' &&
          allMessages.length > 0 &&
          message.timestamp === allMessages[allMessages.length - 1]?.timestamp;
        const fullIndex = allMessages.findIndex((item) =>
          message.id && item.id ? item.id === message.id : item.timestamp === message.timestamp,
        );
        const shouldRenderDividerAfter = cutoffIndexInAll >= 0 && fullIndex === cutoffIndexInAll;

        return (
          <div key={`${message.id || message.timestamp}-${index}`} className="space-y-3">
            <div className={`chat group animate-message ${isUser ? 'chat-end' : 'chat-start'}`}>
              <div className="chat-header mb-1 flex items-center gap-2 text-[10px] opacity-50">
                {headerName}
                {viewMode === 'char' && (
                  <div className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    {!!message.id && !message.image && (
                      <button
                        className="hover:text-primary"
                        onClick={() => {
                          setEditingMsgId(message.id!);
                          setEditContent(message.content);
                        }}
                      >
                        <Pencil size={10} />
                      </button>
                    )}
                    {!!message.id && (
                      <button
                        className={message.id === cutoffMessageId ? 'text-warning' : 'hover:text-warning'}
                        title={message.id === cutoffMessageId ? '清除上下文断点' : '将断点设在这条消息之后'}
                        onClick={() => void onSetContextCutoff(message.id === cutoffMessageId ? null : message.id!)}
                      >
                        断点
                      </button>
                    )}
                    {isLastCharAssistant && (
                      <button className="hover:text-primary" onClick={() => void onRegenerate()}>
                        <RefreshCw size={10} />
                      </button>
                    )}
                    <button className="hover:text-error" onClick={() => void onDeleteCharMessage(message as Message)}>
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>

              {message.image ? (
                <div className="group/img relative overflow-hidden chat-bubble border-base-300 bg-base-200 p-1 shadow-xl">
                  <img src={message.image} className="max-w-xs rounded-lg md:max-w-md" />
                  {viewMode === 'char' && !message.id && (
                    <div className="absolute right-2 top-2 opacity-100 transition-opacity md:opacity-0 md:group-hover/img:opacity-100">
                      <button
                        className="btn btn-circle btn-xs btn-primary shadow-lg"
                        title="保存"
                        onClick={() => void onSaveCharImage(message as Message)}
                      >
                        <Save size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`chat-bubble border shadow-lg ${
                    isUser ? 'chat-bubble-primary border-primary' : 'border-base-300 bg-base-200 text-base-content'
                  }`}
                >
                  {viewMode === 'char' && editingMsgId === message.id ? (
                    <div className="flex min-w-[200px] flex-col gap-2">
                      <textarea
                        className="textarea textarea-bordered textarea-sm w-full bg-base-100"
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                      />
                      <div className="flex justify-end gap-1">
                        <button className="btn btn-xs" onClick={() => setEditingMsgId(null)}>
                          取消
                        </button>
                        <button
                          className="btn btn-xs btn-primary"
                          onClick={async () => {
                            if (!message.id) return;
                            await onEditCharMessage(message.id, editContent);
                            setEditingMsgId(null);
                          }}
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm break-words">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSchema]]}
                        components={markdownComponents}
                      >
                        {replaceBuiltInVariables(message.content, settings || {}, currentCharacter)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>

            {shouldRenderDividerAfter && renderDivider()}
          </div>
        );
      })}

      {showBottomDivider && renderDivider()}

      {isTyping && (
        <div className="chat chat-start animate-pulse opacity-50">
          <div className="chat-bubble">思考中...</div>
        </div>
      )}
      <div ref={bottomRef} className="h-20" />
    </div>
  );
});
