import { memo, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Send, Square } from 'lucide-react';

type GroupMember = {
  id: number;
  name: string;
};

type ChatInputProps = {
  viewMode: 'char' | 'group';
  isTyping: boolean;
  placeholder: string;
  scopeKey: string;
  groupMembers?: GroupMember[];
  onSend: (text: string) => Promise<boolean>;
  onSendAsMember?: (text: string, memberId: number | null) => Promise<boolean>;
  onOpenImageGen: () => void;
  onStop: () => void;
};

export const ChatInput = memo(function ChatInput({
  viewMode,
  isTyping,
  placeholder,
  scopeKey,
  groupMembers = [],
  onSend,
  onSendAsMember,
  onOpenImageGen,
  onStop,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const resetInput = () => {
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const resizeTextarea = () => {
    if (!inputRef.current) return;
    inputRef.current.style.height = 'auto';
    inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
  };

  useEffect(() => {
    resetInput();
  }, [scopeKey]);

  const sendPlayerMessage = async () => {
    if (!input.trim()) return;
    const shouldClear = await onSend(input);
    if (shouldClear) resetInput();
  };

  const sendGroupMemberMessage = async (memberId: number | null) => {
    if (!onSendAsMember || !input.trim()) return;
    const shouldClear = await onSendAsMember(input, memberId);
    if (shouldClear) resetInput();
  };

  return (
    <div className="safe-pb shrink-0 border-t border-base-300 bg-base-100 p-2 md:p-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        {viewMode === 'group' && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => sendGroupMemberMessage(null)}
              disabled={isTyping || !input.trim()}
              className="btn btn-sm btn-outline whitespace-nowrap rounded-full"
            >
              玩家发言
            </button>
            {groupMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => sendGroupMemberMessage(member.id)}
                disabled={isTyping || !input.trim()}
                className="btn btn-sm btn-secondary whitespace-nowrap rounded-full"
              >
                @{member.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-base-300 bg-base-200 p-1.5 shadow-inner md:p-2">
          <button className="btn btn-circle btn-ghost btn-sm mb-1 shrink-0 text-accent" onClick={onOpenImageGen}>
            <ImageIcon size={22} />
          </button>
          <textarea
            ref={inputRef}
            className="textarea textarea-ghost max-h-32 min-h-[2.5rem] flex-1 resize-none px-1 py-2 text-base leading-relaxed focus:outline-none md:max-h-48"
            rows={1}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              resizeTextarea();
            }}
            placeholder={placeholder}
            onKeyDown={async (event) => {
              if (event.key === 'Enter' && !event.shiftKey && viewMode === 'char') {
                event.preventDefault();
                await sendPlayerMessage();
              }
            }}
          />
          {isTyping ? (
            <button className="btn btn-circle btn-error btn-sm mb-1 shrink-0 shadow-lg" onClick={onStop}>
              <Square size={18} fill="currentColor" />
            </button>
          ) : (
            viewMode === 'char' && (
              <button
                className="btn btn-circle btn-primary btn-sm mb-1 shrink-0 shadow-lg"
                onClick={sendPlayerMessage}
                disabled={!input.trim()}
              >
                <Send size={18} />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
});
