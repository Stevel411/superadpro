import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle, Color, FontFamily, FontSize } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { createPortal } from 'react-dom';
import {
  Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon,
  Strikethrough, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link as LinkIcon, Palette, Highlighter,
  Sparkles, ChevronDown,
} from 'lucide-react';
import { FONTS, FONT_SIZES } from './elementDefaults';

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
  onHeightChange,
}) {
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [aiCustom, setAiCustom] = useState('');
  // Manual bubble-menu positioning. Replaces Tiptap's BubbleMenu component
  // which was anchoring to (0,0) for reasons I couldn't track down. We
  // compute the selection's on-screen coords ourselves and render a plain
  // portal-mounted <div> using position:fixed.
  const [menuPos, setMenuPos] = useState(null);  // {x, y} in viewport coords, or null when hidden

  // linkModeRef kept as a no-op (always false) so the bubble menu
  // effect's guards still work. We're not using link-edit-mode anymore
  // (window.prompt for now; a proper floating editor panel is planned),
  // but keeping the ref avoids a larger refactor.
  const linkModeRef = useRef({ active: false });

  const onChangeRef = useRef(onChange);
  const onExitRef = useRef(onExit);
  const onHeightChangeRef = useRef(onHeightChange);
  onChangeRef.current = onChange;
  onExitRef.current = onExit;
  onHeightChangeRef.current = onHeightChange;

  const wrapperRef = useRef(null);
  const lastEmittedRef = useRef(html || '');
  const lastReportedHeightRef = useRef(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        // Disable StarterKit's built-in Link and Underline — we register
        // them ourselves below. Keeping both results in the 'duplicate
        // extension names' warning Tiptap prints to the console.
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'sp-editor-link' } }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
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

  // Manual bubble-menu positioning: subscribe to the editor's selection
  // and blur/focus events, compute viewport coords for the selected range
  // via ProseMirror's coordsAtPos, and update menuPos. When the selection
  // is empty or the editor isn't focused, menuPos = null → menu hides.
  useEffect(() => {
    if (!editor) return;

    // Shared check: is the user currently interacting with our bubble
    // menu (focus inside a toolbar input/button)? If so, we should NOT
    // hide the menu even if the editor has lost focus. Used by both the
    // selection-update path and the blur path so they agree.
    function focusInsideMenu() {
      const a = document.activeElement;
      if (!a || !a.closest) return false;
      return !!a.closest('.sp-tt-bubble-wrap');
    }

    function updateMenuPos() {
      if (!editor || editor.isDestroyed) { setMenuPos(null); return; }
      // Link-edit mode — freeze the menu in place. The menu IS the link
      // editor now; any selection/focus changes triggered by the URL
      // input should not move or hide it.
      if (linkModeRef.current.active) return;
      const { from, to, empty } = editor.state.selection;
      if (empty) {
        if (focusInsideMenu()) return;
        setMenuPos(null); return;
      }
      if (!editor.view.hasFocus() && focusInsideMenu()) return;
      if (!editor.view.hasFocus()) { setMenuPos(null); return; }

      try {
        const startCoords = editor.view.coordsAtPos(from);
        const endCoords = editor.view.coordsAtPos(to);
        const top = Math.min(startCoords.top, endCoords.top);
        const leftMid = (startCoords.left + endCoords.left) / 2;
        setMenuPos({ x: leftMid, y: top });
      } catch (err) {
        setMenuPos(null);
      }
    }

    editor.on('selectionUpdate', updateMenuPos);
    editor.on('focus', updateMenuPos);
    editor.on('blur', () => {
      queueMicrotask(() => {
        if (!editor || editor.isDestroyed) return;
        if (linkModeRef.current.active) return;
        if (focusInsideMenu()) return;
        if (editor.view.hasFocus()) return;
        setMenuPos(null);
      });
    });
    window.addEventListener('scroll', updateMenuPos, { passive: true, capture: true });
    window.addEventListener('resize', updateMenuPos);

    return () => {
      editor.off('selectionUpdate', updateMenuPos);
      editor.off('focus', updateMenuPos);
      window.removeEventListener('scroll', updateMenuPos, { capture: true });
      window.removeEventListener('resize', updateMenuPos);
    };
  }, [editor]);

  // Auto-grow the element height based on the editor content's actual
  // rendered height. Watches the ProseMirror DOM node with a
  // ResizeObserver. When the height changes by >= 4px, report up so Canvas
  // can resize the element. Also triggers a menu reposition because the
  // selection rect moves when text reflows.
  useEffect(() => {
    if (!editor || !wrapperRef.current) return;
    const pmNode = wrapperRef.current.querySelector('.ProseMirror');
    if (!pmNode) return;

    const report = () => {
      const h = pmNode.scrollHeight || pmNode.offsetHeight;
      if (!h) return;
      if (Math.abs(h - lastReportedHeightRef.current) < 4) return;
      lastReportedHeightRef.current = h;
      if (onHeightChangeRef.current) onHeightChangeRef.current(h);
      // Text reflowed → selection rect may have moved, recompute menu pos
      if (editor && !editor.isDestroyed && editor.view.hasFocus()) {
        try {
          const { from, to, empty } = editor.state.selection;
          if (empty) return;
          const s = editor.view.coordsAtPos(from);
          const e = editor.view.coordsAtPos(to);
          setMenuPos({ x: (s.left + e.left) / 2, y: Math.min(s.top, e.top) });
        } catch (err) { /* ignore */ }
      }
    };

    // Fire once on mount for the initial height
    report();

    const ro = new ResizeObserver(report);
    ro.observe(pmNode);
    return () => ro.disconnect();
  }, [editor]);

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
        fontFamily: ed.getAttributes('textStyle').fontFamily || '',
        fontSize: ed.getAttributes('textStyle').fontSize || '',
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
    <div ref={wrapperRef} className="sp-tt-wrapper" style={{ width: '100%', height: '100%' }}>
      {/* Portal is ALWAYS rendered, even when menuPos is null. Hiding
          via CSS instead of unmounting preserves the internal state of
          children like LinkButton (the popup's `open` state) across
          transient menuPos null/value toggles that happen during focus
          transitions. Previously, conditional rendering of this portal
          destroyed LinkButton the moment its own popup tried to open,
          because the popup triggered a focus change which briefly set
          menuPos to null, unmounting the whole tree. */}
      {createPortal(
        <div
          className="sp-tt-bubble-wrap"
          style={{
            position: 'fixed',
            top: menuPos ? menuPos.y : -9999,
            left: menuPos ? menuPos.x : -9999,
            transform: 'translate(-50%, calc(-100% - 8px))',
            zIndex: 1000,
            // Visible whenever we have a position. In link-edit mode the
            // menu stays visible — it becomes the link editor itself.
            visibility: menuPos ? 'visible' : 'hidden',
            pointerEvents: menuPos ? 'auto' : 'none',
            opacity: menuPos ? 1 : 0,
            transition: 'opacity 0.12s',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="sp-tt-bubble">
            <FontSelect editor={editor} currentFont={tbState?.fontFamily} />
            <SizeInput editor={editor} currentSize={tbState?.fontSize} />

            <Divider/>

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
        </div>,
        document.body
      )}

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
        .sp-tt-select {
          display: inline-flex; align-items: center;
          height: 26px; padding: 0 6px;
          border: 0.5px solid #e2e8f0; background: #fff;
          color: #0f172a; border-radius: 4px;
          font-size: 11px; font-weight: 500;
          cursor: pointer;
          transition: background 0.1s;
        }
        .sp-tt-select:hover {
          background: #f1f5f9;
          transform: none !important; filter: none !important;
        }
        .sp-tt-select:active {
          transform: none !important; filter: none !important;
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

/**
 * Font family dropdown. Shows the current font name (or 'Font' if none set),
 * renders each option in its own typeface so the user can preview the look
 * before picking. 24 fonts sourced from elementDefaults.FONTS.
 */
function FontSelect({ editor, currentFont }) {
  const [open, setOpen] = useState(false);
  // Try to match the current fontFamily (which is a full CSS value like
  // 'Sora,sans-serif') to one of our known fonts so we can show its label.
  const currentLabel = (() => {
    if (!currentFont) return 'Font';
    const match = FONTS.find(f => f.value === currentFont || currentFont.includes(f.label));
    return match ? match.label : 'Custom';
  })();

  return (
    <div style={{position: 'relative'}}>
      <button
        className="sp-tt-select"
        onClick={() => setOpen(v => !v)}
        title="Font family"
      >
        <span style={{maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: currentFont || 'inherit'}}>
          {currentLabel}
        </span>
        <ChevronDown size={11} style={{marginLeft: 2, flexShrink: 0}}/>
      </button>
      {open && (
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 6,
            boxShadow: '0 4px 12px rgba(15,23,42,0.1)', padding: 4,
            width: 220, maxHeight: 320, overflowY: 'auto', zIndex: 60,
          }}
        >
          {FONTS.map(f => (
            <div
              key={f.value}
              onClick={() => {
                editor.chain().focus().setFontFamily(f.value).run();
                setOpen(false);
              }}
              style={{
                padding: '8px 10px', fontSize: 14, cursor: 'pointer',
                borderRadius: 4, fontFamily: f.value,
                background: currentFont === f.value ? 'rgba(14,165,233,0.12)' : 'transparent',
                color: currentFont === f.value ? '#0284c7' : '#0f172a',
              }}
              onMouseEnter={e => { if (currentFont !== f.value) e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseLeave={e => { if (currentFont !== f.value) e.currentTarget.style.background = 'transparent'; }}
            >
              {f.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Font size input — number input + dropdown of presets.
 * User can type a custom number (in pixels) or click the arrow to pick
 * from the 20 preset sizes.
 */
function SizeInput({ editor, currentSize }) {
  const [open, setOpen] = useState(false);
  // Parse the current fontSize into a plain number for the input.
  const currentPx = (() => {
    if (!currentSize) return '';
    const n = parseInt(currentSize, 10);
    return isNaN(n) ? '' : String(n);
  })();
  const [value, setValue] = useState(currentPx);

  // Keep the input synced with the editor's current size
  useEffect(() => { setValue(currentPx); /* eslint-disable-next-line */ }, [currentSize]);

  const apply = (px) => {
    const n = parseInt(px, 10);
    if (isNaN(n) || n < 1 || n > 500) return;
    editor.chain().focus().setFontSize(n + 'px').run();
  };

  return (
    <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value.replace(/[^0-9]/g, ''))}
        onKeyDown={e => { if (e.key === 'Enter') { apply(value); e.currentTarget.blur(); } }}
        onBlur={() => apply(value)}
        onMouseDown={e => e.stopPropagation()}
        title="Font size (px)"
        placeholder="–"
        style={{
          width: 34, height: 26, padding: '0 4px',
          border: '0.5px solid #e2e8f0', borderRadius: 4,
          background: '#fff', color: '#0f172a', fontSize: 11,
          textAlign: 'center', outline: 'none', fontFamily: 'inherit',
          marginLeft: 4,
        }}
      />
      <button
        className="sp-tt-btn"
        onClick={() => setOpen(v => !v)}
        title="Preset sizes"
        style={{width: 18, marginLeft: -2}}
      >
        <ChevronDown size={11}/>
      </button>
      {open && (
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 6,
            boxShadow: '0 4px 12px rgba(15,23,42,0.1)', padding: 4,
            width: 60, maxHeight: 260, overflowY: 'auto', zIndex: 60,
          }}
        >
          {FONT_SIZES.map(size => (
            <div
              key={size}
              onClick={() => {
                editor.chain().focus().setFontSize(size).run();
                setValue(parseInt(size, 10) + '');
                setOpen(false);
              }}
              style={{
                padding: '6px 10px', fontSize: 12, cursor: 'pointer',
                borderRadius: 4, textAlign: 'center',
                background: currentSize === size ? 'rgba(14,165,233,0.12)' : 'transparent',
                color: currentSize === size ? '#0284c7' : '#475569',
              }}
              onMouseEnter={e => { if (currentSize !== size) e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseLeave={e => { if (currentSize !== size) e.currentTarget.style.background = 'transparent'; }}
            >
              {parseInt(size, 10)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

/**
 * Link button. Triggers the link dialog owned by TiptapText (top level,
 * independent of the bubble menu's mount/unmount cycles). No local
 * state — just dispatches the click.
 */
/**
 * Link button — uses window.prompt() for URL entry.
 *
 * We tried a custom in-editor popup for link entry (11+ commits across a
 * long session) and could not get it to reliably survive the focus
 * transitions that happen when a React input mounts inside a bubble
 * menu that's portaled to document.body while the edited element has
 * its own click/mousedown handlers.
 *
 * window.prompt() sidesteps the entire focus cascade because it blocks
 * the event loop synchronously. The future plan is a draggable floating
 * editor panel (Figma-style inspector) that's not coupled to the
 * selection at all. Until then this is robust.
 */
function LinkButton({ editor, isActive }) {
  const handleClick = () => {
    const existing = editor.getAttributes('link').href || '';
    const input = window.prompt('Enter a URL (leave blank to remove link):', existing);
    if (input === null) return;  // user cancelled
    const trimmed = input.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    const full = /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
    editor.chain().focus().extendMarkRange('link').setLink({ href: full }).run();
  };
  return (
    <button
      className={'sp-tt-btn' + (isActive ? ' sp-tt-active' : '')}
      onClick={handleClick}
      title={isActive ? 'Edit or remove link' : 'Add link'}
    >
      <LinkIcon size={13}/>
    </button>
  );
}
