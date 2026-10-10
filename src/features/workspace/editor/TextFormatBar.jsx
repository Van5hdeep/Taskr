import { useEditorState } from "@tiptap/react";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Highlighter, Italic, Link2, List, ListChecks, ListOrdered, RemoveFormatting, Strikethrough, Underline,
} from "lucide-react";

const TEXT_COLORS = ["#0f172a", "#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#64748b"];
const MARKERS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#ddd6fe"];
const SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px", "48px"];

function Btn({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors ${active ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-slate-200" />;

/** Formatting for the text box being edited; every command acts on the selection. */
export default function TextFormatBar({ editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      link: e.isActive("link"),
      highlight: e.isActive("highlight"),
      block: e.isActive("heading", { level: 1 }) ? "h1" : e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : "p",
      align: e.isActive({ textAlign: "center" }) ? "center" : e.isActive({ textAlign: "right" }) ? "right" : "left",
      fontSize: e.getAttributes("textStyle").fontSize ?? "",
      color: e.getAttributes("textStyle").color ?? "",
    }),
  });
  if (!editor || !state) return null;
  const chain = () => editor.chain().focus();

  const setLink = () => {
    const previous = editor.getAttributes("link").href ?? "";
    const url = window.prompt("Link URL (leave empty to remove)", previous);
    if (url === null) return;
    if (!url.trim()) chain().extendMarkRange("link").unsetLink().run();
    else chain().extendMarkRange("link").setLink({ href: /^(https?:|mailto:)/i.test(url) ? url.trim() : `https://${url.trim()}` }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Text formatting">
      <select
        aria-label="Paragraph style"
        value={state.block}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => {
          const value = event.target.value;
          if (value === "p") chain().setParagraph().run();
          else chain().toggleHeading({ level: Number(value.slice(1)) }).run();
        }}
        className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700"
      >
        <option value="p">Text</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option>
      </select>
      <select
        aria-label="Font size"
        value={state.fontSize}
        onChange={(event) => (event.target.value ? chain().setFontSize(event.target.value).run() : chain().unsetFontSize().run())}
        className="ml-1 w-[72px] rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700"
      >
        <option value="">Size</option>
        {SIZES.map((size) => <option key={size} value={size}>{parseInt(size, 10)}</option>)}
      </select>
      <Divider />
      <Btn title="Bold (Ctrl+B)" active={state.bold} onClick={() => chain().toggleBold().run()}><Bold className="h-4 w-4" /></Btn>
      <Btn title="Italic (Ctrl+I)" active={state.italic} onClick={() => chain().toggleItalic().run()}><Italic className="h-4 w-4" /></Btn>
      <Btn title="Underline (Ctrl+U)" active={state.underline} onClick={() => chain().toggleUnderline().run()}><Underline className="h-4 w-4" /></Btn>
      <Btn title="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Btn>
      <Btn title="Link" active={state.link} onClick={setLink}><Link2 className="h-4 w-4" /></Btn>
      <Divider />
      <div className="flex items-center gap-1" aria-label="Text colour">
        {TEXT_COLORS.map((color) => (
          <button key={color} type="button" title={`Text colour ${color}`} aria-label={`Text colour ${color}`} onMouseDown={(event) => event.preventDefault()} onClick={() => (color === "#0f172a" ? chain().unsetColor().run() : chain().setColor(color).run())} className={`h-4 w-4 rounded-full border ${state.color === color ? "ring-2 ring-blue-400 ring-offset-1" : "border-slate-300"}`} style={{ backgroundColor: color }} />
        ))}
      </div>
      <Divider />
      <Highlighter className="ml-1 h-3.5 w-3.5 text-slate-400" aria-hidden />
      {MARKERS.map((color) => (
        <button key={color} type="button" title="Highlight" aria-label={`Highlight ${color}`} onMouseDown={(event) => event.preventDefault()} onClick={() => chain().toggleHighlight({ color }).run()} className="h-4 w-4 rounded border border-slate-300" style={{ backgroundColor: color }} />
      ))}
      <Divider />
      <Btn title="Bulleted list" active={state.bullet} onClick={() => chain().toggleBulletList().run()}><List className="h-4 w-4" /></Btn>
      <Btn title="Numbered list" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Btn>
      <Btn title="Checklist" active={state.task} onClick={() => chain().toggleTaskList().run()}><ListChecks className="h-4 w-4" /></Btn>
      <Divider />
      <Btn title="Align left" active={state.align === "left"} onClick={() => chain().setTextAlign("left").run()}><AlignLeft className="h-4 w-4" /></Btn>
      <Btn title="Align centre" active={state.align === "center"} onClick={() => chain().setTextAlign("center").run()}><AlignCenter className="h-4 w-4" /></Btn>
      <Btn title="Align right" active={state.align === "right"} onClick={() => chain().setTextAlign("right").run()}><AlignRight className="h-4 w-4" /></Btn>
      <Divider />
      <Btn title="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="h-4 w-4" /></Btn>
    </div>
  );
}
