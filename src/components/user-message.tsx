import { Message, MessageContent } from '@/components/ai-elements/message';

interface UserMessageProps {
  message: any; // Use any for now to work with AI SDK types
}

export function UserMessage({ message }: UserMessageProps) {
  // Handle both AI SDK content formats
  const getMessageText = () => {
    if (message.content) {
      return message.content;
    }
    if (message.parts?.length > 0) {
      return message.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('');
    }
    return '';
  };

  return (
    <div className="">
      <Message from="user">
        <MessageContent className='group-[.is-user]:bg-white/10 group-[.is-user]:text-white'>{getMessageText()}</MessageContent>
      </Message>
    </div>
  );
}
