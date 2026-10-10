import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TaskItem, TaskList } from "@tiptap/extension-list";

export const RICH_TEXT_EXTENSIONS = [
  StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
  TextStyle,
  Color,
  FontSize,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TaskList,
  TaskItem.configure({ nested: true }),
];

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

/**
 * A rich text box. Formatting applies to the selection (per word), not the
 * whole box. Edits are committed to history after a short pause or on blur.
 */
export default function TextBlock({ block, editing, onCommit, onEditorReady, onExit }) {
  const commitTimer = useRef(null);
  // The doc object we last showed or committed. Our own commits come back as
  // the same object, so only genuinely external changes (undo, reload) reset.
  const shownDoc = useRef(block.doc);
  // Editor JSON as last committed/loaded, in Tiptap's normalised form.
  const lastSerialized = useRef(null);
  const wasEditing = useRef(editing);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  const flush = (instance) => {
    clearTimeout(commitTimer.current);
    const json = instance.getJSON();
    const serialized = JSON.stringify(json);
    if (lastSerialized.current == null || serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;
    shownDoc.current = json;
    commitRef.current({ doc: json });
  };

  const editor = useEditor({
    extensions: RICH_TEXT_EXTENSIONS,
    content: block.doc ?? EMPTY_DOC,
    editable: editing,
    immediatelyRender: true,
    editorProps: { attributes: { class: "taskr-rich h-full outline-none", spellcheck: "true" } },
    onCreate: ({ editor: instance }) => { lastSerialized.current = JSON.stringify(instance.getJSON()); },
    onUpdate: ({ editor: instance }) => {
      clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(() => flush(instance), 900);
    },
    onBlur: ({ editor: instance }) => flush(instance),
  });

  useEffect(() => () => clearTimeout(commitTimer.current), []);

  // Undo/redo or a reload replaced block.doc → show it without committing.
  useEffect(() => {
    if (!editor || block.doc === shownDoc.current) return;
    shownDoc.current = block.doc;
    editor.commands.setContent(block.doc ?? EMPTY_DOC, { emitUpdate: false });
    lastSerialized.current = JSON.stringify(editor.getJSON());
  }, [editor, block.doc]);

  useEffect(() => {
    if (!editor) return;
    if (lastSerialized.current == null) lastSerialized.current = JSON.stringify(editor.getJSON());
    editor.setEditable(editing);
    if (editing) {
      requestAnimationFrame(() => editor.commands.focus("end"));
      onEditorReady?.(editor);
    } else if (wasEditing.current) {
      flush(editor);
    }
    wasEditing.current = editing;
  }, [editor, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="h-full w-full"
      style={{
        backgroundColor: block.fill || "transparent",
        border: block.framed || (block.stroke && block.stroke !== "transparent") ? `${block.strokeWidth || 1}px solid ${block.stroke || "#000000"}` : "1px solid transparent",
        padding: block.framed ? 12 : 2,
        fontSize: block.fontSize || 16,
        color: "#0f172a",
        cursor: editing ? "text" : undefined,
      }}
      onPointerDown={(event) => { if (editing) event.stopPropagation(); }}
      onKeyDown={(event) => { if (event.key === "Escape" && editing) { event.stopPropagation(); onExit?.(); } }}
    >
      <EditorContent editor={editor} className="h-full" />
    </div>
  );
}
