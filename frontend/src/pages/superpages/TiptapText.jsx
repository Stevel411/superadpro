import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
import { useState } from 'react';

/*
  TiptapText — inline rich-text editor for SuperPages element types.

  Design principles:
  - The element wrapper (outer <div> in Canvas.jsx) is already a positioned
    block. Tiptap runs inside that, in 'single-line' mode — no heading nodes,
    no paragraph stacking, just inline marks (bold, italic, colour, etc).
  - When the user clicks the element, they should be able to type immediately.
    We auto-focus on mount if `autoFocus` is true (set by Canvas.jsx on a newly
    dropped element).
  - The BubbleMenu floats above the current selection, managed by Tiptap's
    own positioning (Floating UI under the hood). No manual coordinate math
    needed — which means no more flicker on hover.
  - The outer inline styles from el.s (fontFamily, fontSize, color, textAlign,
    lineHeight, etc) are applied to the EditorContent wrapper. This means text
    inherits those styles as a baseline; users can override character-by-
    character via the bubble menu (which uses TextStyle marks for colour).
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
  const wrapperRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // We don't want block-level document structure inside a single-line
        // element. Disable the things that would create unwanted nesting.
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        // Keep inline marks: bold, italic, strike, code
        // Keep lists: bulletList, orderedList (user can optionally use them in text blocks)
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
    // v3: keep isActive() reactive so toolbar button highlights update as
    // selection changes. Without this, hitting Bold doesn't visually toggle.
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      if (onChange) onChange(editor.getHTML());
    },
    onBlur: () => {
      // Defer slightly so clicks on the bubble menu don't fire a premature
      // blur — the menu buttons keep focus inside the editor, so a true
      // "clicked outside" blur is distinct.
      setTimeout(() => {
        if (!editor || editor.isDestroyed) return;
        if (editor.isFocused) return;
        if (onExit) onExit();
      }, 150);
    },
    // v3 syntax: editor itself is not persisted across react re-renders
    immediatelyRender: false,
  });

  // Sync external html changes back into the editor if they diverge.
  // Typically the editor owns the content, but if the parent updates el.txt
  // programmatically (eg AI rewrite, undo), we want the editor to reflect it.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (html !== undefined && html !== current) {
      editor.commands.setContent(html, false); // `false` = don't emit update
    }
    // We intentionally don't list `editor` in deps — it's stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  if (!editor) return null;

  const handleAiCommand = (cmd, prompt) => {
    if (!onAiRequest) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText) {
      // no selection — operate on whole content
      const whole = editor.getText();
      if (!whole.trim()) return;
    }
    setAiMenuOpen(false);
    onAiRequest({
      command: cmd,
      prompt: prompt || '',
      selection: selectedText,
      replaceSelection: (newText) => {
        if (from !== to) {
          editor.chain().focus().insertContentAt({ from, to }, newText).run();
        } else {
          editor.chain().focus().clearContent().insertContent(newText).run();
        }
      },
    });
  };

  return (
    <div ref={wrapperRef} className="sp-tt-wrapper" style={{ width: '100%', height: '100%' }}>
      <BubbleMenu
        editor={editor}
        updateDelay={0}
        options={{ placement: 'top', offset: 8 }}
      >
        <div className="sp-tt-bubble" onMouseDown={(e) => e.preventDefault()}>
          {/* Bold / Italic / Underline / Strike */}
          <BubBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
            <BoldIcon size={13}/>
          </BubBtn>
          <BubBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
            <ItalicIcon size={13}/>
          </BubBtn>
          <BubBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)">
            <UnderlineIcon size={13}/>
          </BubBtn>
          <BubBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
            <Strikethrough size={13}/>
          </BubBtn>

          <Divider/>

          {/* Color picker */}
          <ColorPicker editor={editor} />

          {/* Highlight */}
          <BubBtn active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} title="Highlight">
            <Highlighter size={13}/>
          </BubBtn>

          <Divider/>

          {/* Alignment */}
          <BubBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left">
            <AlignLeft size={13}/>
          </BubBtn>
          <BubBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align center">
            <AlignCenter size={13}/>
          </BubBtn>
          <BubBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right">
            <AlignRight size={13}/>
          </BubBtn>

          <Divider/>

          {/* Lists */}
          <BubBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
            <List size={13}/>
          </BubBtn>
          <BubBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
            <ListOrdered size={13}/>
          </BubBtn>

          <Divider/>

          {/* Link */}
          <LinkButton editor={editor} />

          {/* AI */}
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

        {/* AI popover — sits just below the bubble menu */}
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
        .sp-tt-wrapper .ProseMirror p {
          margin: 0;
        }
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
          display: flex;
          align-items: center;
          gap: 2px;
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
          background: #f1f5f9;
          color: #0f172a;
          transform: none !important;
          filter: none !important;
        }
        .sp-tt-btn:active:not(:disabled) {
          transform: none !important;
          filter: none !important;
        }
        .sp-tt-btn.sp-tt-active {
          background: rgba(14,165,233,0.12);
          color: #0284c7;
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
        .sp-tt-divider {
          width: 1px; height: 16px; background: #e2e8f0; margin: 0 3px;
        }
        .sp-tt-ai-pop {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 6px;
          background: #ffffff;
          border: 0.5px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 8px 20px rgba(15,23,42,0.15), 0 2px 6px rgba(15,23,42,0.08);
          padding: 10px;
          width: 300px;
          z-index: 50;
        }
        .sp-tt-ai-cmd {
          padding: 7px 10px;
          font-size: 12px;
          color: #475569;
          cursor: pointer;
          border-radius: 4px;
          margin-bottom: 2px;
          transition: background 0.1s;
        }
        .sp-tt-ai-cmd:hover {
          background: #f8fafc;
        }

        /* Neutralise the global 'button lifts 1 px on hover' rule for anything
           inside this editor. Without this, every toolbar button wobbles on
           hover and breaks the feel. */
        .sp-tt-wrapper button:hover,
        .sp-tt-wrapper button:active,
        .sp-tt-bubble button:hover,
        .sp-tt-bubble button:active {
          transform: none !important;
          filter: none !important;
        }
      `}</style>
    </div>
  );
}

/* ═══ Bubble-menu helpers ═══ */

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

function ColorPicker({ editor }) {
  const [open, setOpen] = useState(false);
  const current = editor.getAttributes('textStyle').color || '#0f172a';
  const swatches = [
    '#0f172a', '#475569', '#94a3b8', // slate ramp
    '#0ea5e9', '#0284c7', // sky
    '#6366f1', '#4f46e5', // indigo
    '#8b5cf6', '#a855f7', // purple
    '#ec4899', '#db2777', // pink
    '#22c55e', '#16a34a', // green
    '#f59e0b', '#d97706', // amber
    '#ef4444', '#dc2626', // red
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

function LinkButton({ editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(editor.getAttributes('link').href || '');
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
        className={'sp-tt-btn' + (editor.isActive('link') ? ' sp-tt-active' : '')}
        onClick={() => setOpen(v => !v)}
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
