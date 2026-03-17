import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useState } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered,
  Heading1, Heading2, Heading3, Quote, Code, Link as LinkIcon, Image,
  AlignLeft, AlignCenter, AlignRight, Undo, Redo, Minus
} from 'lucide-react';

export default function RichTextEditor({ content, onChange, placeholder }) {
  var [linkUrl, setLinkUrl] = useState('');
  var [showLinkInput, setShowLinkInput] = useState(false);
  var [showImageInput, setShowImageInput] = useState(false);
  var [imageUrl, setImageUrl] = useState('');

  var editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'editor-link' } }),
      ImageExt.configure({ inline: false, allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Placeholder.configure({ placeholder: placeholder || 'Start writing your lesson content...' }),
    ],
    content: content || '',
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

  function handleImageUpload(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      editor.chain().focus().setImage({ src: ev.target.result }).run();
    };
    reader.readAsDataURL(file);
    setShowImageInput(false);
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
        {btn(false, function(){setShowImageInput(!showImageInput);setShowLinkInput(false);}, Image, 'Image')}

        <div style={{width:1,height:20,background:'#e2e8f0',margin:'0 4px'}}/>

        {/* Undo/Redo */}
        {btn(false, function(){editor.chain().focus().undo().run();}, Undo, 'Undo')}
        {btn(false, function(){editor.chain().focus().redo().run();}, Redo, 'Redo')}
      </div>

      {/* Link input popover */}
      {showLinkInput && (
        <div style={{display:'flex',gap:6,padding:'8px 12px',borderBottom:'1px solid #e8ecf2',background:'#fefce8'}}>
          <input value={linkUrl} onChange={function(e){setLinkUrl(e.target.value);}} placeholder="https://..." autoFocus
            onKeyDown={function(e){if(e.key==='Enter')addLink();}}
            style={{flex:1,padding:'6px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
          <button onClick={addLink} style={{padding:'6px 12px',borderRadius:6,border:'none',background:'#8b5cf6',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Add Link</button>
          <button onClick={function(){setShowLinkInput(false);setLinkUrl('');}} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
        </div>
      )}

      {/* Image input popover */}
      {showImageInput && (
        <div style={{display:'flex',gap:6,padding:'8px 12px',borderBottom:'1px solid #e8ecf2',background:'#eff6ff',flexWrap:'wrap'}}>
          <label style={{display:'flex',alignItems:'center',gap:4,padding:'6px 12px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',cursor:'pointer',fontSize:11,fontWeight:600,color:'#64748b'}}>
            📁 Upload Image
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{display:'none'}}/>
          </label>
          <div style={{display:'flex',gap:4,flex:1}}>
            <input value={imageUrl} onChange={function(e){setImageUrl(e.target.value);}} placeholder="or paste image URL..."
              onKeyDown={function(e){if(e.key==='Enter')addImage();}}
              style={{flex:1,padding:'6px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,fontFamily:'inherit',outline:'none'}}/>
            <button onClick={addImage} style={{padding:'6px 12px',borderRadius:6,border:'none',background:'#0ea5e9',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Add</button>
          </div>
          <button onClick={function(){setShowImageInput(false);setImageUrl('');}} style={{padding:'6px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
        </div>
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
        .tiptap img { max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; }
        .editor-link { color: #0ea5e9; text-decoration: underline; cursor: pointer; }
        .tiptap p.is-editor-empty:first-child::before { color: #94a3b8; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
      `}</style>
    </div>
  );
}
