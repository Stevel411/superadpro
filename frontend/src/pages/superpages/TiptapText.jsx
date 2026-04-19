import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon,
  Strikethrough, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link as LinkIcon, Palette, Highlighter,
  Sparkles,
} from 'lucide-react';

/*
  TiptapText — inline rich-text editor for SuperPages element types.

  Rewritten to fix React error #185 (maximum update depth exceeded) in
  production. Three compounding issues caused the loop:

  1. `shouldRerenderOnTransaction: true` — Tiptap calls this legacy
     behaviour. Every ProseMirror transaction (including cursor moves
     fired by autofocus on mount) forced a React re-render of the whole
     component.

  2. Parent re-renders on every keystroke — Canvas.updateElement flows new
     `els` down, creating new function references for onChange / onExit
     passed as props.

  3. New function references in the useEditor options object prompted
     Tiptap's React wrapper to reinitialise the editor, firing more
     transactions, and back to (1). Loop.

  Fixes:

  - `shouldRerenderOnTransaction: false` (v3 default). Reactive toolbar
    state comes from `useEditorState` with a narrow selector, which only
    re-renders when the selected slice actually changes.
  - Parent callbacks are stored in refs that update each render but are
    never passed as identity to useEditor — the options object is stable.
  - lastEmittedRef prevents the html-sync effect from echoing our own output.
*/

export default function TiptapText({
  html,
  onChange,
  onExit,
  placeholder,
  autoFocus,
  styleOverrides,
  showAi,
  onAiRequest,
  aiBusy,
}) {
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [aiCustom, setAiCustom] = useState('');

  const onChangeRef = useRef(onChange);
  const onExitRef = useRef(onExit);
  onChangeRef.current = onChange;
  onExitRef.current = onExit;

  const lastEmittedRef = useRef(html || '');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'sp-editor-link' } }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['paragraph', 'heading'] }),
      Placeholder.configure({
        placeholder: placeholder || 'Start typing…',
        emptyEditorClass: 'sp-tt-empty',
      }),
    ],
    content: html || '',
    autofocus: autoFocus ? 'end' : false,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,

    onUpdate: ({ editor: ed }) => {
      const h = ed.getHTML();
      lastEmittedRef.current = h;
      if (onChangeRef.current) onChangeRef.current(h);
    },
    onBlur: ({ editor: ed }) => {
      setTimeout(() => {
        if (!ed || ed.isDestroyed) return;
        if (ed.isFocused) return;
        if (onExitRef.current) onExitRef.current();
      }, 150);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (html === lastEmittedRef.current) return;
    lastEmittedRef.current = html || '';
    editor.commands.setContent(html || '', { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  const tbState = useEditorState({
    editor,
    selector: (ctx) => {
      const ed = ctx.editor;
      if (!ed) return null;
      return {
        bold: ed.isActive('bold'),
        italic: ed.isActive('italic'),
        underline: ed.isActive('underline'),
        strike: ed.isActive('strike'),
        highlight: ed.isActive('highlight'),
        alignLeft: ed.isActive({ textAlign: 'left' }),
        alignCenter: ed.isActive({ textAlign: 'center' }),
        alignRight: ed.isActive({ textAlign: 'right' }),
        bulletList: ed.isActive('bulletList'),
        orderedList: ed.isActive('orderedList'),
        link: ed.isActive('link'),
        color: ed.getAttributes('textStyle').color || '',
      };
    },
  });

  const handleAiCommand = useCallback((cmd, prompt) => {
    if (!editor || !onAiRequest) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText) {
      const whole = editor.getText();
      if (!whole.trim()) return;
    }
    setAiMenuOpen(false);
    onAiRequest({
      command: cmd,
      prompt: prompt || '',
      selection: selectedText,
      replaceSelection: (newText) => {
        if (!editor || editor.isDestroyed) return;
        if (from !== to) {
          editor.chain().focus().insertContentAt({ from, to }, newText).run();
        } else {
          editor.chain().focus().clearContent().insertContent(newText).run();
        }
      },
    });
  }, [editor, onAiRequest]);

  if (!editor) return null;

  return (
    <div className="sp-tt-wrapper" style={{ width: '100%', height: '100%' }}>
      <BubbleMenu
        editor={editor}
        updateDelay={0}
        options={{ placement: 'top', offset: 8 }}
      >
        <div className="sp-tt-bubble" onMouseDown={(e) => e.preventDefault()}>
          <BubBtn active={tbState?.bold} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
            <BoldIcon size={13}/>
          </BubBtn>
          <BubBtn active={tbState?.italic} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
            <ItalicIcon size={13}/>
          </BubBtn>
          <BubBtn active={tbState?.underline} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)">
            <UnderlineIcon size={13}/>
          </BubBtn>
          <BubBtn active={tbState?.strike} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
            <Strikethrough size={13}/>
          </BubBtn>

          <Divider/>

          <ColorPicker editor={editor} currentColor={tbState?.color} />

          <BubBtn active={tbState?.highlight} onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} title="Highlight">
            <Highlighter size={13}/>
          </BubBtn>

          <Divider/>

          <BubBtn active={tbState?.alignLeft} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left">
            <AlignLeft size={13}/>
          </BubBtn>
          <BubBtn active={tbState?.alignCenter} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align center">
            <AlignCenter size={13}/>
          </BubBtn>
          <BubBtn active={tbState?.alignRight} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right">
            <AlignRight size={13}/>
          </BubBtn>

          <Divider/>

          <BubBtn active={tbState?.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
            <List size={13}/>
          </BubBtn>
          <BubBtn active={tbState?.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
            <ListOrdered size={13}/>
          </BubBtn>

          <Divider/>

          <LinkButton editor={editor} isActive={!!tbState?.link} />

          {showAi && (
            <>
              <Divider/>
              <button
                className="sp-tt-btn sp-tt-ai"
                onClick={() => setAiMenuOpen(v => !v)}
                title="AI rewrite"
                disabled={aiBusy}
              >
                <Sparkles size={11}/>
                <span style={{marginLeft: 3}}>{aiBusy ? '…' : 'AI'}</span>
              </button>
            </>
          )}
        </div>

        {showAi && aiMenuOpen && (
          <div className="sp-tt-ai-pop" onMouseDown={(e) => e.preventDefault()}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:0.5,textTransform:'uppercase',color:'#8b5cf6',marginBottom:8}}>AI commands</div>
            <AiCmd onClick={() => handleAiCommand('rewrite')}>✨ Rewrite for clarity</AiCmd>
            <AiCmd onClick={() => handleAiCommand('shorten')}>📏 Make it shorter</AiCmd>
            <AiCmd onClick={() => handleAiCommand('sharper')}>🎯 Sharper hook</AiCmd>
            <AiCmd onClick={() => handleAiCommand('benefit')}>📝 More benefit-driven</AiCmd>
            <AiCmd onClick={() => handleAiCommand('translate_es')}>🌍 Translate to Spanish</AiCmd>
            <div style={{borderTop:'0.5px solid #e2e8f0',margin:'6px -2px 4px'}}/>
            <input
              value={aiCustom}
              onChange={e => setAiCustom(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && aiCustom.trim()) {
                  handleAiCommand('custom', aiCustom.trim());
                  setAiCustom('');
                }
              }}
              placeholder="Or type your own command…"
              style={{width:'100%',padding:'7px 10px',fontSize:12,border:'0.5px solid #e2e8f0',borderRadius:4,outline:'none',background:'#f8fafc',boxSizing:'border-box',fontFamily:'inherit'}}
            />
          </div>
        )}
      </BubbleMenu>

      <EditorContent editor={editor} className="sp-tt-content" style={styleOverrides} />

      <style>{`
        .sp-tt-wrapper .ProseMirror {
          outline: none;
          min-height: 1em;
          word-break: break-word;
        }
        .sp-tt-wrapper .ProseMirror p { margin: 0; }
        .sp-tt-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
        }
        .sp-tt-wrapper .ProseMirror ul,
        .sp-tt-wrapper .ProseMirror ol {
          padding-left: 1.2em;
          margin: 0;
        }
        .sp-tt-wrapper .sp-editor-link {
          color: #0ea5e9;
          text-decoration: underline;
          cursor: pointer;
        }
        .sp-tt-bubble {
          display: flex; align-items: center; gap: 2px;
          padding: 4px;
          background: #ffffff;
          border: 0.5px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(15,23,42,0.1), 0 1px 3px rgba(15,23,42,0.06);
        }
        .sp-tt-btn {
          width: 26px; height: 26px;
          display: inline-flex; align-items: center; justify-content: center;
          border: none; background: transparent; color: #475569;
          border-radius: 4px; cursor: pointer;
          font-size: 11px; font-weight: 500;
          transition: background 0.1s, color 0.1s;
        }
        .sp-tt-btn:hover:not(:disabled) {
          background: #f1f5f9; color: #0f172a;
          transform: none !important; filter: none !important;
        }
        .sp-tt-btn:active:not(:disabled) {
          transform: none !important; filter: none !important;
        }
        .sp-tt-btn.sp-tt-active {
          background: rgba(14,165,233,0.12); color: #0284c7;
        }
        .sp-tt-ai {
          width: auto !important;
          padding: 4px 10px !important;
          background: linear-gradient(135deg, #0ea5e9, #8b5cf6) !important;
          color: #fff !important;
          font-weight: 600 !important;
        }
        .sp-tt-ai:hover:not(:disabled) {
          background: linear-gradient(135deg, #0284c7, #7c3aed) !important;
          color: #fff !important;
        }
        .sp-tt-divider { width: 1px; height: 16px; background: #e2e8f0; margin: 0 3px; }
        .sp-tt-ai-pop {
          position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          margin-top: 6px;
          background: #ffffff;
          border: 0.5px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 8px 20px rgba(15,23,42,0.15), 0 2px 6px rgba(15,23,42,0.08);
          padding: 10px; width: 300px; z-index: 50;
        }
        .sp-tt-ai-cmd {
          padding: 7px 10px; font-size: 12px; color: #475569;
          cursor: pointer; border-radius: 4px; margin-bottom: 2px;
          transition: background 0.1s;
        }
        .sp-tt-ai-cmd:hover { background: #f8fafc; }
        .sp-tt-wrapper button:hover,
        .sp-tt-wrapper button:active,
        .sp-tt-bubble button:hover,
        .sp-tt-bubble button:active {
          transform: none !important; filter: none !important;
        }
      `}</style>
    </div>
  );
}

function BubBtn({ active, onClick, title, children }) {
  return (
    <button
      className={'sp-tt-btn' + (active ? ' sp-tt-active' : '')}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="sp-tt-divider" />;
}

function AiCmd({ onClick, children }) {
  return <div className="sp-tt-ai-cmd" onClick={onClick}>{children}</div>;
}

function ColorPicker({ editor, currentColor }) {
  const [open, setOpen] = useState(false);
  const current = currentColor || '#0f172a';
  const swatches = [
    '#0f172a', '#475569', '#94a3b8',
    '#0ea5e9', '#0284c7',
    '#6366f1', '#4f46e5',
    '#8b5cf6', '#a855f7',
    '#ec4899', '#db2777',
    '#22c55e', '#16a34a',
    '#f59e0b', '#d97706',
    '#ef4444', '#dc2626',
    '#ffffff',
  ];
  return (
    <div style={{position: 'relative'}}>
      <button className="sp-tt-btn" onClick={() => setOpen(v => !v)} title="Text colour">
        <Palette size={13} style={{color: current}}/>
      </button>
      {open && (
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 6,
            boxShadow: '0 4px 12px rgba(15,23,42,0.1)', padding: 6,
            display: 'grid', gridTemplateColumns: 'repeat(5, 18px)', gap: 3, zIndex: 60,
          }}
        >
          {swatches.map(c => (
            <div
              key={c}
              onClick={() => { editor.chain().focus().setColor(c).run(); setOpen(false); }}
              style={{
                width: 18, height: 18, borderRadius: 4, background: c,
                border: c === '#ffffff' ? '1px solid #e2e8f0' : '1px solid rgba(0,0,0,0.08)',
                cursor: 'pointer',
              }}
              title={c}
            />
          ))}
          <div
            onClick={() => { editor.chain().focus().unsetColor().run(); setOpen(false); }}
            style={{
              gridColumn: 'span 5', marginTop: 3, fontSize: 10, padding: '4px 6px',
              textAlign: 'center', color: '#64748b', cursor: 'pointer',
              border: '0.5px solid #e2e8f0', borderRadius: 4,
            }}
          >
            Reset
          </div>
        </div>
      )}
    </div>
  );
}

function LinkButton({ editor, isActive }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const openMenu = () => {
    setUrl(editor.getAttributes('link').href || '');
    setOpen(v => !v);
  };
  const apply = () => {
    if (url) {
      const full = url.startsWith('http') ? url : 'https://' + url;
      editor.chain().focus().extendMarkRange('link').setLink({ href: full }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setOpen(false);
  };
  return (
    <div style={{position: 'relative'}}>
      <button
        className={'sp-tt-btn' + (isActive ? ' sp-tt-active' : '')}
        onClick={openMenu}
        title="Link"
      >
        <LinkIcon size={13}/>
      </button>
      {open && (
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 6,
            boxShadow: '0 4px 12px rgba(15,23,42,0.1)', padding: 6, zIndex: 60,
            display: 'flex', gap: 4, width: 260,
          }}
        >
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') apply(); }}
            autoFocus
            placeholder="https://…"
            style={{
              flex: 1, padding: '6px 8px', fontSize: 12,
              border: '0.5px solid #e2e8f0', borderRadius: 4, outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={apply}
            style={{
              padding: '6px 10px', fontSize: 11, fontWeight: 600,
              background: '#0ea5e9', color: '#fff', border: 'none',
              borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}
