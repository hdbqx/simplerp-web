import { memo, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
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
}: MessageListProps) {
  const charMessages = useChatStore((state) => state.messages);
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const renderMessages = useMemo(
    () => (viewMode === 'group' ? roomMessages : charMessages),
    [charMessages, roomMessages, viewMode],
  );

  const lastMessage = renderMessages[renderMessages.length - 1];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [renderMessages.length, lastMessage?.content, lastMessage?.image, lastMessage?.timestamp, isTyping]);

  useEffect(() => {
    setEditingMsgId(null);
    setEditContent('');
  }, [viewMode, currentCharacter?.id]);

  return (
    <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4 md:px-6 md:py-6">
      {renderMessages.map((message, index) => {
        const isUser = message.role === 'user' || ('sender_type' in message && message.sender_type === 'user');
        const headerName = isUser ? settings?.user_name || '玩家' : characterNameById.get(message.char_id || 0) || 'AI';
        const isLastCharAssistant =
          viewMode === 'char' &&
          message.role !== 'user' &&
          index === charMessages.length - 1;

        return (
          <div
            key={`${message.id || message.timestamp}-${index}`}
            className={`chat group animate-message ${isUser ? 'chat-end' : 'chat-start'}`}
          >
            <div className="chat-header mb-1.5 flex items-center gap-2 px-1 text-[10px] opacity-55">
              {headerName}
              {viewMode === 'char' && (
                <div className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  {!!message.id && !message.image && (
                    <button
                      className="rounded-md p-1 hover:bg-base-300 hover:text-primary"
                      onClick={() => {
                        setEditingMsgId(message.id!);
                        setEditContent(message.content);
                      }}
                    >
                      <Pencil size={10} />
                    </button>
                  )}
                  {isLastCharAssistant && (
                    <button
                      className="rounded-md p-1 hover:bg-base-300 hover:text-primary"
                      onClick={() => void onRegenerate()}
                    >
                      <RefreshCw size={10} />
                    </button>
                  )}
                  <button
                    className="rounded-md p-1 hover:bg-base-300 hover:text-error"
                    onClick={() => void onDeleteCharMessage(message as Message)}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              )}
            </div>

            {message.image ? (
              <div className="group/img relative max-w-[min(84vw,34rem)] overflow-hidden rounded-[1.6rem] border border-base-300/70 bg-base-200/90 p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
                <img src={message.image} className="max-w-full rounded-[1.1rem]" />
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
                className={`max-w-[min(84vw,42rem)] rounded-[1.6rem] border px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)] ${
                  isUser
                    ? 'border-primary/70 bg-primary text-primary-content'
                    : 'border-base-300/70 bg-base-200/92 text-base-content'
                }`}
              >
                {viewMode === 'char' && editingMsgId === message.id ? (
                  <div className="flex min-w-[220px] flex-col gap-2">
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
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                      {replaceBuiltInVariables(message.content, settings || {}, currentCharacter)}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {isTyping && (
        <div className="chat chat-start animate-pulse opacity-50">
          <div className="rounded-[1.4rem] border border-base-300/70 bg-base-200/92 px-4 py-3 shadow-md">
            思考中...
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-8 md:h-10" />
    </div>
  );
});
