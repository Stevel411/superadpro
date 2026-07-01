import { useEditor, EditorContent } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Callout, VideoEmbed, CtaButton, toEmbedUrl } from './blogBlocks';
import { useState } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered,
  Heading1, Heading2, Heading3, Quote, Code, Link as LinkIcon, Image,
  AlignLeft, AlignCenter, AlignRight, Undo, Redo, Minus,
  Info, Video, Megaphone, Sparkles
} from 'lucide-react';

// Custom image node: adds a width preset (normal/wide/full) and alignment
// (left/center/right) on top of the stock image, rendered as data-w / data-align
// so the same CSS styles it identically in the editor and on the public post.
// Defaults (normal/center) render nothing extra, keeping existing images clean.
const SapImage = ImageExt.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      dataW: {
        default: 'normal',
        parseHTML: function(el) { return el.getAttribute('data-w') || 'normal'; },
        renderHTML: function(attrs) { return (attrs.dataW && attrs.dataW !== 'normal') ? { 'data-w': attrs.dataW } : {}; },
      },
      dataAlign: {
        default: 'center',
        parseHTML: function(el) { return el.getAttribute('data-align') || 'center'; },
        renderHTML: function(attrs) { return (attrs.dataAlign && attrs.dataAlign !== 'center') ? { 'data-align': attrs.dataAlign } : {}; },
      },
      dataScale: {
        default: 'md',
        parseHTML: function(el) { return el.getAttribute('data-scale') || 'md'; },
        renderHTML: function(attrs) { return (attrs.dataScale && attrs.dataScale !== 'md') ? { 'data-scale': attrs.dataScale } : {}; },
      },
    };
  },
});

export default function RichTextEditor({ content, onChange, placeholder, onImageUpload, richBlocks }) {

  var { t } = useTranslation();
  var [linkUrl, setLinkUrl] = useState('');
  var [showLinkInput, setShowLinkInput] = useState(false);
  var [showImageInput, setShowImageInput] = useState(false);
  var [imageUrl, setImageUrl] = useState('');
  var [showEmbed, setShowEmbed] = useState(false);
  var [embedUrl, setEmbedUrl] = useState('');
  var [embedErr, setEmbedErr] = useState('');
  var [showCta, setShowCta] = useState(false);
  var [ctaLabel, setCtaLabel] = useState('');
  var [ctaUrl, setCtaUrl] = useState('');
  var [showCallout, setShowCallout] = useState(false);
  var [showAiMenu, setShowAiMenu] = useState(false);
  var [aiBusy, setAiBusy] = useState('');
  var [aiErr, setAiErr] = useState('');
  // Batch-1 image UX: drag/drop + paste upload, alt-text capture, no base64.
  var [uploading, setUploading] = useState(false);
  var [uploadErr, setUploadErr] = useState('');
  var [showAlt, setShowAlt] = useState(false);
  var [altText, setAltText] = useState('');

  var editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'editor-link' } }),
      SapImage.configure({ inline: false, allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Callout, VideoEmbed, CtaButton,
      Placeholder.configure({ placeholder: placeholder || 'Start writing your lesson content...' }),
    ],
    content: content || '',
    editorProps: {
      // Drag-and-drop image upload → R2 (blog only; gated on onImageUpload so
      // the SuperLeads email composer, which passes no uploader, is unaffected
      // and keeps its own behaviour). Non-image drops fall through to default.
      handleDrop: function(view, event, slice, moved) {
        if (moved || !onImageUpload) return false;
        var files = (event.dataTransfer && event.dataTransfer.files) || [];
        var imgs = Array.prototype.filter.call(files, function(f) { return f.type && f.type.indexOf('image/') === 0; });
        if (!imgs.length) return false;
        event.preventDefault();
        imgs.forEach(function(f) { insertUploadedImage(f); });
        return true;
      },
      // Paste image from clipboard → R2 (blog only). Text/HTML paste unaffected.
      handlePaste: function(view, event, slice) {
        if (!onImageUpload) return false;
        var files = (event.clipboardData && event.clipboardData.files) || [];
        var imgs = Array.prototype.filter.call(files, function(f) { return f.type && f.type.indexOf('image/') === 0; });
        if (!imgs.length) return false;
        event.preventDefault();
        imgs.forEach(function(f) { insertUploadedImage(f); });
        return true;
      },
    },
    onUpdate: function({ editor }) {
      if (onChange) onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  function btn(active, onClick, Icon, title) {
    return (
      <button onClick={onClick} title={title}
        style={{width:30,height:30,borderRadius:6,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
          background:active?'#8b5cf6':'transparent',color:active?'#fff':'#64748b',transition:'all .1s'}}
        onMouseEnter={function(e){if(!active)e.currentTarget.style.background='#f1f5f9';}}
        onMouseLeave={function(e){if(!active)e.currentTarget.style.background='transparent';}}>
        <Icon size={15}/>
      </button>
    );
  }

  function addLink() {
    if (linkUrl) {
      var url = linkUrl.startsWith('http') ? linkUrl : 'https://' + linkUrl;
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }

  function addImage() {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
    setShowImageInput(false);
    setImageUrl('');
  }

  function addEmbed() {
    var src = toEmbedUrl(embedUrl);
    if (!src) { setEmbedErr('Paste a YouTube or Vimeo link'); return; }
    editor.chain().focus().setVideoEmbed(src).run();
    setShowEmbed(false); setEmbedUrl(''); setEmbedErr('');
  }
  function addCta() {
    var url = (ctaUrl || '').trim();
    if (url && !/^https?:\/\//i.test(url) && url.charAt(0) !== '/') url = 'https://' + url;
    editor.chain().focus().setCtaButton({ href: url || '#', label: (ctaLabel || '').trim() || 'Learn more' }).run();
    setShowCta(false); setCtaLabel(''); setCtaUrl('');
  }
  function aiToParas(t) {
    return (t || '').split(/\n\s*\n/).map(function (p) {
      return '<p>' + p.replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }
  async function runAi(mode) {
    setShowAiMenu(false);
    var sel = editor.state.selection;
    var from = sel.from, to = sel.to, empty = sel.empty;
    var selText = empty ? '' : editor.state.doc.textBetween(from, to, '\n');
    var needsSel = ['improve', 'rewrite', 'fix', 'shorten', 'lengthen'].indexOf(mode) !== -1;
    if (needsSel && !selText.trim()) { setAiErr('Select some text first.'); setTimeout(function(){setAiErr('');}, 3500); return; }
    var text = mode === 'continue' ? editor.getText().slice(-4000) : selText;
    setAiBusy(mode); setAiErr('');
    try {
      var res = await fetch('/api/blog/ai/assist', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: mode, text: text }),
      });
      var data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'AI unavailable');
      var out = data.result || '';
      if (!out) throw new Error('No suggestion came back');
      var html = aiToParas(out);
      if (mode === 'continue') {
        editor.chain().focus().insertContentAt(editor.state.doc.content.size, html).run();
      } else {
        editor.chain().focus().insertContentAt({ from: from, to: to }, html).run();
      }
    } catch (e) { setAiErr((e && e.message) || 'AI unavailable'); setTimeout(function(){setAiErr('');}, 4500); }
    setAiBusy('');
  }
  function insertCallout(type) {
    editor.chain().focus().toggleCallout({ type: type }).run();
    setShowCallout(false);
  }
  // Upload an image file to R2 (via the caller's onImageUpload) and insert it
  // with an empty alt (the "needs alt" nudge prompts the author to fill it).
  // Blog path only: on failure it errors loudly — never falls back to base64
  // (base64 bloats the post body and skips the CDN). Hoisted for the drop/paste
  // handlers defined in editorProps above.
  async function insertUploadedImage(file) {
    if (!file || !onImageUpload) return;
    if (!file.type || file.type.indexOf('image/') !== 0) {
      setUploadErr('That file isn\u2019t an image.');
      return;
    }
    setUploadErr('');
    setUploading(true);
    try {
      var url = await onImageUpload(file);
      if (url) editor.chain().focus().setImage({ src: url, alt: '' }).run();
      else setUploadErr('Upload failed — please try again.');
    } catch (err) {
      setUploadErr((err && err.message) || 'Image upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleImageUpload(e) {
    var file = e.target.files[0];
    e.target.value = '';            // allow re-selecting the same file
    if (!file) return;
    setShowImageInput(false);
    if (onImageUpload) { await insertUploadedImage(file); return; }
    // Email composer (no uploader wired): keep the inline data-URL behaviour.
    var reader = new FileReader();
    reader.onload = function(ev) { editor.chain().focus().setImage({ src: ev.target.result }).run(); };
    reader.readAsDataURL(file);
  }

  // Set alt text on the currently-selected image (SEO + accessibility).
  function applyAlt() {
    if (editor.isActive('image')) {
      editor.chain().focus().updateAttributes('image', { alt: altText }).run();
    }
    setShowAlt(false);
  }

  return (
    <div style={{border:'1.5px solid #e2e8f0',borderRadius:10,overflow:'hidden',background:'#fff'}}>
      {/* Toolbar */}
      <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:1,padding:'6px 8px',borderBottom:'1px solid #e8ecf2',background:'#f8f9fb'}}>
        {/* Text formatting */}
        {btn(editor.isActive('bold'), function(){editor.chain().focus().toggleBold().run();}, Bold, 'Bold')}
        {btn(editor.isActive('italic'), function(){editor.chain().focus().toggleItalic().run();}, Italic, 'Italic')}
        {btn(editor.isActive('underline'), function(){editor.chain().focus().toggleUnderline().run();}, UnderlineIcon, 'Underline')}
        {btn(editor.isActive('strike'), function(){editor.chain().focus().toggleStrike().run();}, Strikethrough, 'Strikethrough')}

        <div style={{width:1,height:20,background:'#e2e8f0',margin:'0 4px'}}/>

        {/* Headings */}
        {btn(editor.isActive('heading',{level:1}), function(){editor.chain().focus().toggleHeading({level:1}).run();}, Heading1, 'Heading 1')}
        {btn(editor.isActive('heading',{level:2}), function(){editor.chain().focus().toggleHeading({level:2}).run();}, Heading2, 'Heading 2')}
        {btn(editor.isActive('heading',{level:3}), function(){editor.chain().focus().toggleHeading({level:3}).run();}, Heading3, 'Heading 3')}

        <div style={{width:1,height:20,background:'#e2e8f0',margin:'0 4px'}}/>

        {/* Lists */}
        {btn(editor.isActive('bulletList'), function(){editor.chain().focus().toggleBulletList().run();}, List, 'Bullet List')}
        {btn(editor.isActive('orderedList'), function(){editor.chain().focus().toggleOrderedList().run();}, ListOrdered, 'Numbered List')}

        <div style={{width:1,height:20,background:'#e2e8f0',margin:'0 4px'}}/>

        {/* Block formatting */}
        {btn(editor.isActive('blockquote'), function(){editor.chain().focus().toggleBlockquote().run();}, Quote, 'Quote')}
        {btn(editor.isActive('codeBlock'), function(){editor.chain().focus().toggleCodeBlock().run();}, Code, 'Code Block')}
        {btn(false, function(){editor.chain().focus().setHorizontalRule().run();}, Minus, 'Divider')}

        <div style={{width:1,height:20,background:'#e2e8f0',margin:'0 4px'}}/>

        {/* Alignment */}
        {btn(editor.isActive({textAlign:'left'}), function(){editor.chain().focus().setTextAlign('left').run();}, AlignLeft, 'Align Left')}
        {btn(editor.isActive({textAlign:'center'}), function(){editor.chain().focus().setTextAlign('center').run();}, AlignCenter, 'Align Center')}
        {btn(editor.isActive({textAlign:'right'}), function(){editor.chain().focus().setTextAlign('right').run();}, AlignRight, 'Align Right')}

        <div style={{width:1,height:20,background:'#e2e8f0',margin:'0 4px'}}/>

        {/* Link */}
        {btn(editor.isActive('link'), function(){setShowLinkInput(!showLinkInput);setShowImageInput(false);}, LinkIcon, 'Link')}
        {/* Image */}
        {btn(false, function(){setShowImageInput(!showImageInput);setShowLinkInput(false);}, Image, 'Image — upload, drag & drop, or paste')}
        {editor.isActive('image') && (
          <button onClick={function(){ setAltText(editor.getAttributes('image').alt || ''); setShowAlt(!showAlt); }}
            title="Alt text (SEO + accessibility)"
            style={{height:30,padding:'0 8px',borderRadius:6,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,fontFamily:'inherit',
              background:(editor.getAttributes('image').alt ? '#e0f2fe' : '#fef3c7'),color:(editor.getAttributes('image').alt ? '#0369a1' : '#92400e')}}>
            {editor.getAttributes('image').alt ? 'ALT ✓' : '⚠ ALT'}
          </button>
        )}
        {(editor.isActive('image') || editor.isActive('videoEmbed')) && (() => {
          // One coherent layout control for the selected media (image OR video).
          // Left/Right float + shrink so text wraps beside; Normal/Wide/Full are
          // standalone block sizes. Each choice sets BOTH data-w and data-align
          // so the two can never conflict (the old Wide+Left bug).
          var nodeName = editor.isActive('image') ? 'image' : 'videoEmbed';
          var na = editor.getAttributes(nodeName);
          var w = na.dataW || 'normal';
          var al = na.dataAlign || 'center';
          var cur = (al === 'left') ? 'left'
                  : (al === 'right') ? 'right'
                  : (w === 'wide') ? 'wide'
                  : (w === 'full') ? 'full'
                  : 'normal';
          var setLayout = function(key){
            var attrs = (key === 'left')  ? { dataAlign:'left',   dataW:'normal' }
                      : (key === 'right') ? { dataAlign:'right',  dataW:'normal' }
                      : (key === 'wide')  ? { dataAlign:'center', dataW:'wide'   }
                      : (key === 'full')  ? { dataAlign:'center', dataW:'full'   }
                      :                     { dataAlign:'center', dataW:'normal' };
            editor.chain().focus().updateAttributes(nodeName, attrs).run();
          };
          var scale = na.dataScale || 'md';
          var setScale = function(v){ editor.chain().focus().updateAttributes(nodeName, { dataScale: v }).run(); };
          // Size only applies to in-column / floated media — Wide & Full are already
          // their own (breakout) sizes, so we hide it for those.
          var showSize = (cur === 'left' || cur === 'right' || cur === 'normal');
          var pill = function(active){ return {height:30,padding:'0 9px',borderRadius:6,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:'inherit',display:'flex',alignItems:'center',gap:4,background:active?'#0ea5e9':'#eef2f7',color:active?'#fff':'#475569'}; };
          return (
            <>
              <div style={{width:1,height:20,background:'#e2e8f0',margin:'0 4px'}}/>
              <span style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.4,alignSelf:'center'}}>Layout</span>
              <button onClick={function(){setLayout('left');}}   style={pill(cur==='left')}   title="Float left — text wraps to the right"><AlignLeft size={13}/>Left</button>
              <button onClick={function(){setLayout('normal');}} style={pill(cur==='normal')} title="Normal — sits in the text column">Normal</button>
              <button onClick={function(){setLayout('wide');}}   style={pill(cur==='wide')}   title="Wide — breaks out past the text">Wide</button>
              <button onClick={function(){setLayout('full');}}   style={pill(cur==='full')}   title="Full — edge to edge">Full</button>
              <button onClick={function(){setLayout('right');}}  style={pill(cur==='right')}  title="Float right — text wraps to the left">Right<AlignRight size={13}/></button>
              {showSize && (<>
                <div style={{width:1,height:20,background:'#e2e8f0',margin:'0 4px'}}/>
                <span style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.4,alignSelf:'center'}}>Size</span>
                <button onClick={function(){setScale('sm');}} style={pill(scale==='sm')} title="Small">S</button>
                <button onClick={function(){setScale('md');}} style={pill(scale==='md')} title="Medium">M</button>
                <button onClick={function(){setScale('lg');}} style={pill(scale==='lg')} title="Large">L</button>
              </>)}
            </>
          );
        })()}

        {richBlocks && (<>
        <div style={{width:1,height:20,background:'#e2e8f0',margin:'0 4px'}}/>
        {/* Content blocks */}
        {btn(editor.isActive('callout'), function(){setShowCallout(!showCallout);setShowEmbed(false);setShowCta(false);}, Info, 'Callout')}
        {btn(false, function(){setShowEmbed(!showEmbed);setShowCallout(false);setShowCta(false);setEmbedErr('');}, Video, 'Embed video')}
        {btn(false, function(){setShowCta(!showCta);setShowCallout(false);setShowEmbed(false);}, Megaphone, 'Button')}
        {btn(showAiMenu, function(){setShowAiMenu(!showAiMenu);setShowCallout(false);setShowEmbed(false);setShowCta(false);}, Sparkles, 'AI assist')}
        </>)}

        <div style={{width:1,height:20,background:'#e2e8f0',margin:'0 4px'}}/>

        {/* Undo/Redo */}
        {btn(false, function(){editor.chain().focus().undo().run();}, Undo, 'Undo')}
        {btn(false, function(){editor.chain().focus().redo().run();}, Redo, 'Redo')}
      </div>

      {/* Link input popover */}
      {showLinkInput && (
        <div style={{display:'flex',gap:6,padding:'8px 12px',borderBottom:'1px solid #e8ecf2',background:'#fefce8'}}>
          <input value={linkUrl} onChange={function(e){setLinkUrl(e.target.value);}} placeholder={t('common.urlPlaceholder')} autoFocus
            onKeyDown={function(e){if(e.key==='Enter')addLink();}}
            style={{flex:1,padding:'6px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
          <button onClick={addLink} style={{padding:'6px 12px',borderRadius:6,border:'none',background:'#8b5cf6',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t('common.addLink')}</button>
          <button onClick={function(){setShowLinkInput(false);setLinkUrl('');}} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{t('common.cancel')}</button>
        </div>
      )}

      {/* Image input popover */}
      {showImageInput && (
        <div style={{display:'flex',gap:6,padding:'8px 12px',borderBottom:'1px solid #e8ecf2',background:'#eff6ff',flexWrap:'wrap',alignItems:'center'}}>
          <label style={{display:'flex',alignItems:'center',gap:4,padding:'6px 12px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',cursor:uploading?'wait':'pointer',fontSize:11,fontWeight:600,color:'#64748b',opacity:uploading?0.6:1}}>
            {uploading ? '⏳ Uploading…' : '📁 Upload image'}
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} style={{display:'none'}}/>
          </label>
          {onImageUpload && <span style={{fontSize:11,color:'#7b91a8'}}>or just drag & drop / paste an image into the editor</span>}
          <div style={{display:'flex',gap:4,flex:1,minWidth:200}}>
            <input value={imageUrl} onChange={function(e){setImageUrl(e.target.value);}} placeholder={t('common.imagePlaceholder')}
              onKeyDown={function(e){if(e.key==='Enter')addImage();}}
              style={{flex:1,padding:'6px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
            <button onClick={addImage} style={{padding:'6px 12px',borderRadius:6,border:'none',background:'#0ea5e9',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{t('common.addBtn')}</button>
          </div>
          <button onClick={function(){setShowImageInput(false);setImageUrl('');}} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{t('common.cancel')}</button>
        </div>
      )}

      {/* Alt-text popover (image selected) */}
      {showAlt && (
        <div style={{display:'flex',gap:6,padding:'8px 12px',borderBottom:'1px solid #e8ecf2',background:'#f0f9ff',alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontSize:11,fontWeight:700,color:'#0369a1',textTransform:'uppercase',letterSpacing:.4}}>Alt text</span>
          <input value={altText} onChange={function(e){setAltText(e.target.value);}} autoFocus
            placeholder="Describe the image (helps SEO + screen readers)"
            onKeyDown={function(e){if(e.key==='Enter')applyAlt();}}
            style={{flex:1,minWidth:200,padding:'6px 10px',border:'1px solid #bae6fd',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
          <button onClick={applyAlt} style={{padding:'6px 12px',borderRadius:6,border:'none',background:'#0ea5e9',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Save</button>
          <button onClick={function(){setShowAlt(false);}} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{t('common.cancel')}</button>
        </div>
      )}

      {/* Upload error bar (no silent failures) */}
      {uploadErr && (
        <div style={{padding:'8px 12px',borderBottom:'1px solid #fecaca',background:'#fef2f2',color:'#b91c1c',fontSize:12,fontWeight:600,display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
          <span>⚠ {uploadErr}</span>
          <button onClick={function(){setUploadErr('');}} style={{border:'none',background:'transparent',color:'#b91c1c',cursor:'pointer',fontSize:14,fontWeight:700}}>×</button>
        </div>
      )}

      {/* Callout type popover */}
      {showCallout && (
        <div style={{display:'flex',gap:6,padding:'8px 12px',borderBottom:'1px solid #e8ecf2',background:'#f5f3ff',flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontSize:11,fontWeight:700,color:'#64748b'}}>Callout:</span>
          {[['info','Info','#0ea5e9'],['tip','Tip','#16a34a'],['warning','Warning','#d97706'],['success','Success','#7c3aed']].map(function(c){
            return <button key={c[0]} onClick={function(){insertCallout(c[0]);}} style={{padding:'6px 12px',borderRadius:6,border:'1px solid '+c[2],background:'#fff',color:c[2],fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>{c[1]}</button>;
          })}
          <button onClick={function(){setShowCallout(false);}} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,cursor:'pointer',fontFamily:'inherit',marginLeft:'auto'}}>Cancel</button>
        </div>
      )}

      {/* Video embed popover */}
      {showEmbed && (
        <div style={{padding:'8px 12px',borderBottom:'1px solid #e8ecf2',background:'#eff6ff'}}>
          <div style={{display:'flex',gap:6}}>
            <input value={embedUrl} onChange={function(e){setEmbedUrl(e.target.value);setEmbedErr('');}} placeholder="Paste a YouTube or Vimeo link" autoFocus
              onKeyDown={function(e){if(e.key==='Enter')addEmbed();}}
              style={{flex:1,padding:'6px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
            <button onClick={addEmbed} style={{padding:'6px 12px',borderRadius:6,border:'none',background:'#0ea5e9',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Embed</button>
            <button onClick={function(){setShowEmbed(false);setEmbedUrl('');setEmbedErr('');}} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
          </div>
          {embedErr && <div style={{fontSize:11,color:'#b42318',marginTop:5}}>{embedErr}</div>}
        </div>
      )}

      {/* CTA button popover */}
      {showCta && (
        <div style={{display:'flex',gap:6,padding:'8px 12px',borderBottom:'1px solid #e8ecf2',background:'#fdf4ff',flexWrap:'wrap'}}>
          <input value={ctaLabel} onChange={function(e){setCtaLabel(e.target.value);}} placeholder="Button text" autoFocus
            style={{flex:'1 1 130px',padding:'6px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
          <input value={ctaUrl} onChange={function(e){setCtaUrl(e.target.value);}} placeholder="Link URL"
            onKeyDown={function(e){if(e.key==='Enter')addCta();}}
            style={{flex:'2 1 190px',padding:'6px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
          <button onClick={addCta} style={{padding:'6px 12px',borderRadius:6,border:'none',background:'#7c3aed',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Add</button>
          <button onClick={function(){setShowCta(false);setCtaLabel('');setCtaUrl('');}} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
        </div>
      )}

      {/* AI assist popover */}
      {showAiMenu && (
        <div style={{display:'flex',gap:6,padding:'8px 12px',borderBottom:'1px solid #e8ecf2',background:'#f5f3ff',flexWrap:'wrap',alignItems:'center'}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700,color:'#7c3aed'}}><Sparkles size={13}/> AI:</span>
          {[['improve','Improve'],['rewrite','Rewrite'],['fix','Fix grammar'],['shorten','Make shorter'],['lengthen','Make longer'],['continue','Continue writing']].map(function(a){
            return <button key={a[0]} disabled={!!aiBusy} onClick={function(){runAi(a[0]);}}
              style={{padding:'6px 11px',borderRadius:6,border:'1px solid #ddd6fe',background:aiBusy===a[0]?'#7c3aed':'#fff',color:aiBusy===a[0]?'#fff':'#6d28d9',fontSize:11,fontWeight:700,cursor:aiBusy?'default':'pointer',fontFamily:'inherit'}}>
              {aiBusy===a[0]?'Working…':a[1]}</button>;
          })}
          <button onClick={function(){setShowAiMenu(false);}} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,cursor:'pointer',fontFamily:'inherit',marginLeft:'auto'}}>Close</button>
        </div>
      )}
      {aiErr && (
        <div style={{padding:'7px 12px',borderBottom:'1px solid #e8ecf2',background:'#fef2f2',color:'#b42318',fontSize:11.5}}>{aiErr}</div>
      )}

      {/* Editor content area */}
      <EditorContent editor={editor} />

      {/* Editor styles */}
      <style>{`
        .tiptap {
          padding: 16px 20px;
          min-height: 250px;
          max-height: 500px;
          overflow-y: auto;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          line-height: 1.8;
          color: #1e293b;
          outline: none;
        }
        .tiptap h1 { font-size: 24px; font-weight: 800; margin: 16px 0 8px; color: #0f172a; }
        .tiptap h2 { font-size: 20px; font-weight: 700; margin: 14px 0 6px; color: #0f172a; }
        .tiptap h3 { font-size: 16px; font-weight: 700; margin: 12px 0 4px; color: #0f172a; }
        .tiptap p { margin: 0 0 8px; }
        .tiptap ul, .tiptap ol { padding-left: 24px; margin: 8px 0; }
        .tiptap li { margin: 4px 0; }
        .tiptap blockquote { border-left: 3px solid #8b5cf6; margin: 12px 0; padding: 8px 16px; background: #f8f9fb; border-radius: 0 8px 8px 0; color: #475569; }
        .tiptap pre { background: #1e293b; color: #e2e8f0; padding: 14px 18px; border-radius: 8px; font-family: monospace; font-size: 13px; overflow-x: auto; margin: 12px 0; }
        .tiptap code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #8b5cf6; }
        .tiptap hr { border: none; border-top: 2px solid #e8ecf2; margin: 16px 0; }
        .tiptap img { max-width: 100%; height: auto; border-radius: 8px; margin: 14px auto; display: block; }
        /* Size presets + alignment mirrored from the public render so the editor
           is WYSIWYG. 'normal' is capped so 'wide'/'full' visibly differ. */
        .tiptap img[data-w="normal"], .tiptap img:not([data-w]):not([data-align]) { max-width: 60%; }
        /* Size scale (S/M/L). Normal media default (M) is 60% of the column; S/L
           step it down/up. Floated media below has its own scaled widths. */
        .tiptap img[data-scale="sm"]:not([data-align]):not([data-w]) { max-width: 40%; }
        .tiptap img[data-scale="lg"]:not([data-align]):not([data-w]) { max-width: 85%; }
        .tiptap .bn-embed:not([data-align]):not([data-w]) { width: 60%; margin: 16px auto; }
        .tiptap .bn-embed[data-scale="sm"]:not([data-align]):not([data-w]) { width: 40%; }
        .tiptap .bn-embed[data-scale="lg"]:not([data-align]):not([data-w]) { width: 85%; }
        .tiptap img[data-align="left"] { float: left; max-width: min(50%, 340px); margin: 6px 20px 12px 0; }
        .tiptap img[data-align="right"] { float: right; max-width: min(50%, 340px); margin: 6px 0 12px 20px; }
        .tiptap img[data-align="left"][data-scale="sm"], .tiptap img[data-align="right"][data-scale="sm"] { max-width: min(32%, 240px); }
        .tiptap img[data-align="left"][data-scale="lg"], .tiptap img[data-align="right"][data-scale="lg"] { max-width: min(62%, 460px); }
        .tiptap img[data-w="wide"] { float: none; max-width: 100%; width: 100%; margin: 16px auto; }
        .tiptap img[data-w="full"] { float: none; max-width: 100%; width: 100%; margin: 16px auto; border-radius: 4px; }
        .tiptap::after { content: ""; display: table; clear: both; }
        .tiptap h2, .tiptap h3, .tiptap blockquote { clear: both; }
        /* Editor-only nudge: images with no alt text get a dashed amber ring so
           the author can see (and fix) SEO/accessibility gaps before publishing.
           Does not affect the public render. */
        .tiptap img:not([alt]), .tiptap img[alt=""] { outline: 2px dashed #f59e0b; outline-offset: 2px; }
        .tiptap img.ProseMirror-selectednode { outline: 2px solid #0ea5e9; outline-offset: 2px; }
        .editor-link { color: #0ea5e9; text-decoration: underline; cursor: pointer; }
        .tiptap p.is-editor-empty:first-child::before { color: #94a3b8; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
        .tiptap .bn-callout { display: flex; gap: 11px; padding: 14px 16px; border-radius: 10px; margin: 16px 0; border-left: 4px solid #0ea5e9; background: #f0f9ff; }
        .tiptap .bn-callout::before { content: 'i'; flex: 0 0 20px; height: 20px; border-radius: 50%; background: #0ea5e9; color: #fff; font-weight: 800; font-style: italic; display: grid; place-items: center; font-size: 13px; }
        .tiptap .bn-callout > * { margin: 0; }
        .tiptap .bn-callout[data-type="tip"] { border-left-color: #16a34a; background: #f0fdf4; }
        .tiptap .bn-callout[data-type="tip"]::before { content: '✦'; background: #16a34a; font-style: normal; }
        .tiptap .bn-callout[data-type="warning"] { border-left-color: #d97706; background: #fffbeb; }
        .tiptap .bn-callout[data-type="warning"]::before { content: '!'; background: #d97706; font-style: normal; }
        .tiptap .bn-callout[data-type="success"] { border-left-color: #7c3aed; background: #faf5ff; }
        .tiptap .bn-callout[data-type="success"]::before { content: '✓'; background: #7c3aed; font-style: normal; }
        .tiptap .bn-embed { position: relative; aspect-ratio: 16/9; margin: 18px 0; border-radius: 10px; overflow: hidden; background: #000; }
        .tiptap .bn-embed iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        /* Video layout: same data-w / data-align model as images, so a video can
           float with text wrapping beside it (left/right) or size up (wide/full). */
        .tiptap .bn-embed[data-align="left"] { float: left; width: min(50%, 340px); margin: 6px 20px 12px 0; }
        .tiptap .bn-embed[data-align="right"] { float: right; width: min(50%, 340px); margin: 6px 0 12px 20px; }
        .tiptap .bn-embed[data-align="left"][data-scale="sm"], .tiptap .bn-embed[data-align="right"][data-scale="sm"] { width: min(32%, 240px); }
        .tiptap .bn-embed[data-align="left"][data-scale="lg"], .tiptap .bn-embed[data-align="right"][data-scale="lg"] { width: min(62%, 460px); }
        .tiptap .bn-embed[data-w="wide"] { float: none; width: 100%; margin: 16px auto; }
        .tiptap .bn-embed[data-w="full"] { float: none; width: 100%; margin: 16px auto; border-radius: 4px; }
        .tiptap .bn-embed.ProseMirror-selectednode { outline: 2px solid #0ea5e9; outline-offset: 2px; }
        /* On narrow editor panes / phones, floated media stops floating and goes
           full width so it never squeezes into an unreadable sliver. */
        @media (max-width: 600px) {
          .tiptap img[data-align="left"], .tiptap img[data-align="right"],
          .tiptap .bn-embed[data-align="left"], .tiptap .bn-embed[data-align="right"] { float: none; width: auto; max-width: 100%; margin: 14px auto; }
        }
        .tiptap .bn-btn-wrap { margin: 18px 0; }
        .tiptap .bn-btn { display: inline-block; padding: 11px 22px; background: #0ea5e9; color: #fff; border-radius: 8px; font-weight: 700; text-decoration: none; }
      `}</style>
    </div>
  );
}
