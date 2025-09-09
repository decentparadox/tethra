'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ComponentProps, HTMLAttributes, ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
  dracula,
  materialDark,
  materialLight,
  nord,
  nightOwl,
  gruvboxDark,
  gruvboxLight,
  vscDarkPlus,
  tomorrow,
  atomDark,
  base16AteliersulphurpoolLight,
  okaidia,
} from 'react-syntax-highlighter/dist/esm/styles/prism';

// Theme mapping function
const getThemeByName = (themeName: string) => {
  switch (themeName) {
    case 'github-dark': return oneDark;
    case 'github-light': return oneLight;
    case 'dracula': return dracula;
    case 'material-theme-darker': return materialDark;
    case 'material-theme-lighter': return materialLight;
    case 'nord': return nord;
    case 'night-owl': return nightOwl;
    case 'gruvbox-dark-medium': return gruvboxDark;
    case 'gruvbox-light-medium': return gruvboxLight;
    case 'monokai': return okaidia; // Monokai-like theme
    case 'one-dark-pro': return vscDarkPlus;
    case 'tokyo-night': return tomorrow;
    case 'catppuccin-mocha': return atomDark;
    case 'catppuccin-latte': return base16AteliersulphurpoolLight;
    default: return oneDark;
  }
};

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: '',
});

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  theme?: string;
  children?: ReactNode;
};

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  theme,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  // Get the current theme from CSS variables or use the passed theme
  const currentTheme = theme || getComputedStyle(document.documentElement).getPropertyValue('--code-theme').trim() || 'github-dark';
  const selectedTheme = getThemeByName(currentTheme);

  return (
  <CodeBlockContext.Provider value={{ code }}>
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-md border border-border/50 bg-background text-foreground',
        className,
      )}
      {...props}
    >
      <div className="relative">
        <SyntaxHighlighter
          className="overflow-hidden"
          codeTagProps={{
            className: 'font-mono text-sm',
          }}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.875rem',
            background: 'transparent',
          }}
          language={language}
          lineNumberStyle={{
            color: 'hsl(var(--muted-foreground))',
            paddingRight: '1rem',
            minWidth: '2.5rem',
          }}
          showLineNumbers={showLineNumbers}
          style={selectedTheme}
        >
          {code}
        </SyntaxHighlighter>
        {children && (
          <div className="absolute top-2 right-2 flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  </CodeBlockContext.Provider>
  );
};

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    if (typeof window === 'undefined' || !navigator.clipboard.writeText) {
      onError?.(new Error('Clipboard API not available'));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn('shrink-0', className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
};
