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
    <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4">
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
          <div className="chat-bubble">思考中...</div>
        </div>
      )}
      <div ref={bottomRef} className="h-20" />
    </div>
  );
});
