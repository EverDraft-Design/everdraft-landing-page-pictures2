import React, { useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { normalizeChapterContent, sanitizeChapterHtml } from './chapter-content.js';

const pasteGuardKey = new PluginKey('everdraftChapterPasteGuard');

function ToolbarButton({ label, onClick, active = false, disabled = false, children }) {
  return (
    <button
      type="button"
      className="chapter-editor-tool"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ChapterEditor({ textarea, placeholder, onReady }) {
  const readyCallback = useRef(onReady);

  useEffect(() => {
    readyCallback.current = onReady;
  }, [onReady]);

  const syncTextarea = useCallback((editor) => {
    const html = sanitizeChapterHtml(editor.getHTML());
    if (textarea.value === html) return;
    textarea.value = html;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }, [textarea]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        code: false,
        codeBlock: false,
        heading: false,
        link: false,
        listItem: false,
        orderedList: false
      }),
      TextAlign.configure({
        types: ['paragraph'],
        alignments: ['left', 'center', 'right']
      })
    ],
    content: normalizeChapterContent(textarea.value),
    editorProps: {
      attributes: {
        class: 'chapter-editor-surface',
        role: 'textbox',
        'aria-label': 'Chapter content',
        'aria-multiline': 'true',
        spellcheck: 'true',
        'data-placeholder': placeholder
      }
    },
    onCreate: ({ editor: createdEditor }) => {
      createdEditor.registerPlugin(new Plugin({
        key: pasteGuardKey,
        props: {
          transformPastedHTML: (html) => sanitizeChapterHtml(html)
        }
      }));
      textarea.value = sanitizeChapterHtml(createdEditor.getHTML());
      readyCallback.current?.(createdEditor);
    },
    onUpdate: ({ editor: updatedEditor }) => syncTextarea(updatedEditor)
  });

  useEffect(() => () => editor?.destroy(), [editor]);

  if (!editor) {
    return <div className="chapter-editor-loading" aria-live="polite">Preparing editor…</div>;
  }

  const command = (callback) => () => callback(editor.chain().focus()).run();

  return (
    <div className="chapter-editor-shell">
      <div className="chapter-editor-toolbar" role="toolbar" aria-label="Chapter formatting">
        <ToolbarButton label="Undo" disabled={!editor.can().chain().focus().undo().run()} onClick={command((chain) => chain.undo())}>↶</ToolbarButton>
        <ToolbarButton label="Redo" disabled={!editor.can().chain().focus().redo().run()} onClick={command((chain) => chain.redo())}>↷</ToolbarButton>
        <span className="chapter-editor-divider" aria-hidden="true" />
        <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={command((chain) => chain.toggleBold())}><strong>B</strong></ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={command((chain) => chain.toggleItalic())}><em>I</em></ToolbarButton>
        <ToolbarButton label="Underline" active={editor.isActive('underline')} onClick={command((chain) => chain.toggleUnderline())}><u>U</u></ToolbarButton>
        <ToolbarButton label="Strikethrough" active={editor.isActive('strike')} onClick={command((chain) => chain.toggleStrike())}><s>S</s></ToolbarButton>
        <span className="chapter-editor-divider" aria-hidden="true" />
        <ToolbarButton label="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={command((chain) => chain.setTextAlign('left'))}>≡</ToolbarButton>
        <ToolbarButton label="Align centre" active={editor.isActive({ textAlign: 'center' })} onClick={command((chain) => chain.setTextAlign('center'))}>≡</ToolbarButton>
        <ToolbarButton label="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={command((chain) => chain.setTextAlign('right'))}>≡</ToolbarButton>
        <ToolbarButton label="Block quote" active={editor.isActive('blockquote')} onClick={command((chain) => chain.toggleBlockquote())}>❝</ToolbarButton>
        <ToolbarButton label="Scene break" onClick={command((chain) => chain.setHorizontalRule())}>✦</ToolbarButton>
        <ToolbarButton
          label="Clear formatting"
          onClick={command((chain) => chain.unsetAllMarks().clearNodes().setTextAlign('left'))}
        >
          Clear
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export function mountChapterEditor({ textarea, container, placeholder = 'Begin the chapter here…' }) {
  if (!textarea || !container) {
    throw new Error('The chapter editor requires a textarea and mount container.');
  }

  let editorInstance = null;
  let queuedContent = textarea.value;
  const root = createRoot(container);

  root.render(
    <ChapterEditor
      textarea={textarea}
      placeholder={placeholder}
      onReady={(editor) => {
        editorInstance = editor;
        if (queuedContent !== null) {
          editor.commands.setContent(normalizeChapterContent(queuedContent), { emitUpdate: false });
          textarea.value = sanitizeChapterHtml(editor.getHTML());
          queuedContent = null;
        }
      }}
    />
  );

  return {
    setContent(content) {
      if (!editorInstance) {
        queuedContent = content;
        textarea.value = normalizeChapterContent(content);
        return;
      }
      editorInstance.commands.setContent(normalizeChapterContent(content), { emitUpdate: false });
      textarea.value = sanitizeChapterHtml(editorInstance.getHTML());
    },
    getHTML() {
      return editorInstance ? sanitizeChapterHtml(editorInstance.getHTML()) : textarea.value;
    },
    destroy() {
      root.unmount();
    }
  };
}

