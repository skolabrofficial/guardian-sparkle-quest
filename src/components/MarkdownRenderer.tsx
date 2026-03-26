import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: Props) {
  if (!content) return null;

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => <h1 className="text-xl font-extrabold mt-4 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>,
          p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5">{children}</ol>,
          li: ({ children }) => <li className="my-0.5">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-300 pl-3 my-2 italic text-muted-foreground">{children}</blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return <code className="px-1.5 py-0.5 rounded-md text-xs font-mono" style={{ background: '#eef5ff', color: '#1e40af' }} {...props}>{children}</code>;
            }
            return (
              <pre className="rounded-xl p-3 overflow-x-auto text-xs my-2" style={{ background: '#1e293b', color: '#e2e8f0' }}>
                <code className={className} {...props}>{children}</code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-border px-3 py-1.5 font-bold text-left" style={{ background: '#f0f4ff' }}>{children}</th>,
          td: ({ children }) => <td className="border border-border px-3 py-1.5">{children}</td>,
          a: ({ href, children }) => <a href={href} className="text-blue-600 font-bold hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
          img: ({ src, alt }) => <img src={src} alt={alt || ''} className="rounded-xl max-w-full my-2" loading="lazy" />,
          hr: () => <hr className="my-4 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
