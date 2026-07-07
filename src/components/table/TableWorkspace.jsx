import { useState, useRef, useEffect } from "react";
import { Plus, Type, Copy, Trash2, Save, FileText, Undo, Redo, PaintBucket, Type as TypeIcon, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import WorkspaceSaveModal from "../WorkspaceSaveModal";
import SaveButton from "../ui/SaveButton";

function useDraggable(initialX, initialY, onDragMove, onDragEnd) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startMouse = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    if (["INPUT", "TEXTAREA", "BUTTON", "SELECT", "OPTION"].includes(e.target.tagName)) {
      return;
    }
    e.stopPropagation();
    setIsDragging(true);
    startPos.current = { x: pos.x, y: pos.y };
    startMouse.current = { x: e.clientX, y: e.clientY };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startMouse.current.x;
    const dy = e.clientY - startMouse.current.y;
    const newX = startPos.current.x + dx;
    const newY = startPos.current.y + dy;
    setPos({ x: newX, y: newY });
    if (onDragMove) onDragMove(newX, newY);
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
    if (onDragEnd) onDragEnd(pos.x, pos.y);
  };

  const updatePos = (newX, newY) => setPos({ x: newX, y: newY });

  return { pos, isDragging, handlePointerDown, handlePointerMove, handlePointerUp, updatePos };
}

function TableBlock({ block, updateBlock, t, dark, onMergeCheck, onDragFinish, isActive, activeCell, onCellSelect, isMergeTarget, previewRows }) {
  const { pos, isDragging, handlePointerDown, handlePointerMove, handlePointerUp, updatePos } = useDraggable(
    block.x, 
    block.y, 
    (x, y) => {
      if (onMergeCheck) onMergeCheck(block.id, x, y);
    },
    (x, y) => {
      updateBlock(block.id, { x, y });
      if (onDragFinish) onDragFinish(block.id, x, y);
    }
  );

  useEffect(() => {
    updatePos(block.x, block.y);
  }, [block.x, block.y]);

  const handleCellChange = (r, c, value) => {
    const newData = [...block.data];
    newData[r] = [...newData[r]];
    newData[r][c] = value;
    updateBlock(block.id, { data: newData });
  };

  const renderGrid = (rowsToRender, isPreview = false) => {
    return (
      <div 
        className={`grid gap-[1px] bg-black border border-black ${isPreview ? 'opacity-40 mt-[1px]' : ''}`} 
        style={{ gridTemplateColumns: `repeat(${block.cols}, minmax(100px, 1fr))` }}
      >
        {Array(rowsToRender).fill(0).map((_, r) => (
          Array(block.cols).fill(0).map((_, c) => {
            const actualRow = isPreview ? null : block.data[r];
            const cellVal = actualRow ? actualRow[c] : "";
            const cellColor = isPreview ? "" : (block.cellColors?.[r]?.[c] || '');
            const cellAlign = isPreview ? "left" : (block.cellAlign?.[r]?.[c] || 'left');
            return (
              <div 
                key={`${r}-${c}`} 
                className={`relative bg-white ${cellColor}`}
              >
                <input
                  type="text"
                  value={cellVal}
                  readOnly={isPreview}
                  onChange={isPreview ? undefined : (e) => handleCellChange(r, c, e.target.value)}
                  onFocus={isPreview ? undefined : () => onCellSelect(block.id, {r, c})}
                  style={{ textAlign: cellAlign }}
                  className={`w-full h-full p-2 outline-none bg-transparent text-sm text-black ${!isPreview && isActive && activeCell?.r === r && activeCell?.c === c ? 'ring-2 ring-blue-500 inset-0 z-10' : ''}`}
                  placeholder={isPreview ? "" : "..."}
                />
              </div>
            );
          })
        ))}
      </div>
    );
  };

  return (
    <div 
      className={`absolute transition-shadow ${isDragging ? 'shadow-2xl z-50 opacity-60' : 'shadow-lg z-10'} rounded-xl border ${isActive ? 'ring-2 ring-blue-500' : ''} ${isMergeTarget ? 'ring-4 ring-emerald-500 shadow-emerald-500/20 scale-[1.02] transition-transform' : 'transition-none'} ${dark ? 'border-slate-700/50' : 'border-slate-200'}`}
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={(e) => {
        onCellSelect(block.id, null);
        handlePointerDown(e);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className={`p-2 rounded-xl bg-transparent overflow-hidden backdrop-blur-md cursor-grab active:cursor-grabbing`}>
        {renderGrid(block.rows)}
        {isMergeTarget && previewRows > 0 && renderGrid(previewRows, true)}
      </div>
    </div>
  );
}

function TextBlock({ block, updateBlock, t, dark, isActive, onSelect }) {
  const { pos, isDragging, handlePointerDown, handlePointerMove, handlePointerUp } = useDraggable(block.x, block.y, null, (x, y) => updateBlock(block.id, { x, y }));
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div 
      className={`absolute transition-shadow ${isDragging ? 'shadow-2xl z-50 opacity-90' : 'z-10'} ${isActive ? 'ring-2 ring-blue-500 rounded' : ''}`}
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={(e) => {
        onSelect(block.id);
        handlePointerDown(e);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {isEditing ? (
        <textarea
          autoFocus
          value={block.text}
          onChange={e => updateBlock(block.id, { text: e.target.value })}
          onBlur={() => setIsEditing(false)}
          className={`bg-white dark:bg-slate-800 outline-none resize-none border border-blue-500 border-dashed rounded p-2 ${block.bold ? 'font-bold' : ''} ${t.textPrimary}`}
          style={{ fontSize: block.fontSize, width: Math.max(200, block.text.length * 10) + 'px' }}
        />
      ) : (
        <div 
          onDoubleClick={() => setIsEditing(true)}
          className={`cursor-text whitespace-pre-wrap p-2 rounded ${block.bold ? 'font-bold' : ''} ${t.textPrimary}`}
          style={{ fontSize: block.fontSize }}
        >
          {block.text || "Double click to edit text"}
        </div>
      )}
    </div>
  );
}

export default function TableWorkspace({ t, dark, onSave }) {
  const [blocks, setBlocks] = useState(() => {
    return JSON.parse(localStorage.getItem("taskr_table_data") || "[]");
  });
  
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [previewMerge, setPreviewMerge] = useState(null); // { sourceId, targetId, sourceRows }

  // Global Selection State
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [activeCell, setActiveCell] = useState(null);

  useEffect(() => {
    localStorage.setItem("taskr_table_data", JSON.stringify(blocks));
  }, [blocks]);

  const addTable = () => {
    const id = crypto.randomUUID();
    const data = Array(rows).fill(0).map(() => Array(cols).fill(""));
    const cellColors = Array(rows).fill(0).map(() => Array(cols).fill(""));
    const cellAlign = Array(rows).fill(0).map(() => Array(cols).fill("left"));
    setBlocks([...blocks, { id, type: 'table', x: 50, y: 50, rows, cols, data, color: "bg-transparent", cellColors, cellAlign }]);
    setActiveBlockId(id);
    setActiveCell(null);
  };

  const addText = () => {
    const id = crypto.randomUUID();
    setBlocks([...blocks, { id, type: 'text', x: 50, y: 50, text: "New Text", fontSize: '16px', bold: false }]);
    setActiveBlockId(id);
    setActiveCell(null);
  };

  const updateBlock = (id, updates) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBlock = (id) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (previewMerge?.sourceId === id || previewMerge?.targetId === id) setPreviewMerge(null);
    if (activeBlockId === id) {
      setActiveBlockId(null);
      setActiveCell(null);
    }
  };

  const duplicateBlock = (id) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    const newBlock = JSON.parse(JSON.stringify(block));
    newBlock.id = crypto.randomUUID();
    newBlock.x += 40;
    newBlock.y += 40;
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  const handleMergeCheck = (sourceId, x, y) => {
    const sourceBlock = blocks.find(b => b.id === sourceId);
    if (!sourceBlock || sourceBlock.type !== 'table') return;

    const threshold = 50;
    const target = blocks.find(b => b.id !== sourceId && b.type === 'table' && Math.abs(b.x - x) < threshold && Math.abs((b.y + (b.rows * 40)) - y) < threshold * 2);
    
    if (target && target.cols === sourceBlock.cols) {
      setPreviewMerge({ sourceId, targetId: target.id, sourceRows: sourceBlock.rows });
    } else {
      setPreviewMerge(null);
    }
  };

  const handleDragFinish = (sourceId, x, y) => {
    if (previewMerge && previewMerge.sourceId === sourceId) {
      const { targetId } = previewMerge;
      const source = blocks.find(b => b.id === sourceId);
      const target = blocks.find(b => b.id === targetId);
      if (source && target) {
        const newData = [...target.data, ...source.data];
        const newCellColors = [...(target.cellColors || []), ...(source.cellColors || [])];
        const newCellAlign = [...(target.cellAlign || []), ...(source.cellAlign || [])];
        
        setBlocks(blocks.map(b => {
          if (b.id === targetId) {
            return { ...b, rows: target.rows + source.rows, data: newData, cellColors: newCellColors, cellAlign: newCellAlign };
          }
          return b;
        }).filter(b => b.id !== sourceId));
        setActiveBlockId(targetId);
      }
    }
    setPreviewMerge(null);
  };

  const handleExportPdf = () => {
    setShowSaveModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Toolbar Handlers
  const handleCellColor = (color) => {
    if (!activeBlockId || !activeCell) return;
    const block = blocks.find(b => b.id === activeBlockId);
    if (!block || block.type !== 'table') return;
    const { r, c } = activeCell;
    const newColors = [...block.cellColors];
    newColors[r] = [...newColors[r]];
    newColors[r][c] = color;
    updateBlock(activeBlockId, { cellColors: newColors });
  };

  const handleCellAlign = (align) => {
    if (!activeBlockId || !activeCell) return;
    const block = blocks.find(b => b.id === activeBlockId);
    if (!block || block.type !== 'table') return;
    const { r, c } = activeCell;
    const newAlign = [...(block.cellAlign || Array(block.rows).fill(0).map(()=>Array(block.cols).fill('left')))];
    newAlign[r] = [...newAlign[r]];
    newAlign[r][c] = align;
    updateBlock(activeBlockId, { cellAlign: newAlign });
  };

  const handleToggleBold = () => {
    if (!activeBlockId) return;
    const block = blocks.find(b => b.id === activeBlockId);
    if (block?.type === 'text') {
      updateBlock(activeBlockId, { bold: !block.bold });
    }
  };

  const handleToggleFontSize = () => {
    if (!activeBlockId) return;
    const block = blocks.find(b => b.id === activeBlockId);
    if (block?.type === 'text') {
      updateBlock(activeBlockId, { fontSize: block.fontSize === '16px' ? '24px' : '16px' });
    }
  };

  const activeBlock = blocks.find(b => b.id === activeBlockId);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 pb-28 animate-fade-in flex flex-col h-[calc(100vh-140px)] print:h-auto print:p-0">
        
        {/* Top Global Toolbar (Word-style) */}
        <div className={`flex flex-col rounded-3xl border shadow-sm ${dark ? 'bg-[#161f42] border-blue-500/20' : 'bg-white border-slate-200'} no-print shrink-0 overflow-hidden`}>
          
          {/* Top Row: File / Actions */}
          <div className={`flex items-center justify-between p-3 border-b ${dark ? 'border-blue-500/20' : 'border-slate-200'} bg-black/5 dark:bg-black/20`}>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1">
                 <button onClick={() => {}} disabled className="p-2 rounded-lg hover:bg-black/10 disabled:opacity-30" title="Undo"><Undo className="w-4 h-4" /></button>
                 <button onClick={() => {}} disabled className="p-2 rounded-lg hover:bg-black/10 disabled:opacity-30" title="Redo"><Redo className="w-4 h-4" /></button>
               </div>
               <div className="w-px h-6 bg-slate-300 dark:bg-slate-600" />
               <div className="flex items-center gap-2">
                <input type="number" min="1" max="20" value={rows} onChange={e => setRows(parseInt(e.target.value) || 1)} className={`w-12 px-2 py-1 rounded border text-xs outline-none ${t.input}`} title="Rows" />
                <span className="text-xs text-slate-500 font-bold">x</span>
                <input type="number" min="1" max="20" value={cols} onChange={e => setCols(parseInt(e.target.value) || 1)} className={`w-12 px-2 py-1 rounded border text-xs outline-none ${t.input}`} title="Cols" />
                <button onClick={addTable} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Table
                </button>
                <button onClick={addText} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
                  <TypeIcon className="w-3.5 h-3.5" /> Text
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <SaveButton onClick={() => setShowSaveModal(true)} />
            </div>
          </div>

          {/* Bottom Row: Contextual Formatting Tools */}
          <div className="flex items-center p-3 gap-6 overflow-x-auto min-h-[56px]">
            {activeBlock ? (
              <>
                {/* Global Block Actions */}
                <div className="flex items-center gap-1">
                  <button onClick={() => duplicateBlock(activeBlockId)} className="p-2 rounded hover:bg-black/10 text-slate-600 dark:text-slate-300" title="Duplicate">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteBlock(activeBlockId)} className="p-2 rounded hover:bg-red-500/20 text-red-500" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                
                {/* Table Cell Formatting */}
                {activeBlock.type === 'table' && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <PaintBucket className={`w-4 h-4 mr-2 ${t.textMuted}`} />
                      {["bg-transparent", "bg-red-500/20", "bg-blue-500/20", "bg-emerald-500/20", "bg-amber-500/20", "bg-slate-800", "bg-blue-600"].map(c => (
                        <button 
                          key={c} 
                          onClick={() => handleCellColor(c === "bg-transparent" ? "" : c)}
                          disabled={!activeCell}
                          className={`w-5 h-5 rounded-full border shadow-sm disabled:opacity-30 ${c === 'bg-transparent' ? (dark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300') : c} hover:scale-110 transition-transform`}
                          title="Cell Color"
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1 ml-4 border rounded overflow-hidden dark:border-slate-700">
                      <button disabled={!activeCell} onClick={() => handleCellAlign('left')} className="p-1.5 hover:bg-black/10 disabled:opacity-30"><AlignLeft className="w-4 h-4" /></button>
                      <button disabled={!activeCell} onClick={() => handleCellAlign('center')} className="p-1.5 hover:bg-black/10 disabled:opacity-30"><AlignCenter className="w-4 h-4" /></button>
                      <button disabled={!activeCell} onClick={() => handleCellAlign('right')} className="p-1.5 hover:bg-black/10 disabled:opacity-30"><AlignRight className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}

                {/* Text Block Formatting */}
                {activeBlock.type === 'text' && (
                  <div className="flex items-center gap-1">
                    <button onClick={handleToggleBold} className={`px-3 py-1.5 rounded text-sm font-bold border ${activeBlock.bold ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/50' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}>
                      B
                    </button>
                    <button onClick={handleToggleFontSize} className="px-3 py-1.5 rounded text-sm font-bold hover:bg-black/5 dark:hover:bg-white/5">
                      Aa
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={`text-sm italic ${t.textMuted}`}>Select a table or text block to edit.</div>
            )}
          </div>
        </div>

        {/* Workspace Canvas */}
        <div 
          className={`relative flex-1 rounded-3xl border overflow-hidden ${dark ? 'dot-grid-dark border-blue-500/10 bg-[#0d1530]/40' : 'dot-grid border-slate-200 bg-white/50'} print:border-none print:bg-none print:overflow-visible`}
          onPointerDown={() => {
            setActiveBlockId(null);
            setActiveCell(null);
          }}
        >
          {blocks.map(b => {
            if (b.type === 'table') {
              return <TableBlock 
                key={b.id} 
                block={b} 
                updateBlock={updateBlock} 
                t={t} 
                dark={dark} 
                onMergeCheck={handleMergeCheck}
                onDragFinish={handleDragFinish} 
                isActive={activeBlockId === b.id}
                activeCell={activeCell}
                onCellSelect={(id, cell) => {
                  setActiveBlockId(id);
                  setActiveCell(cell);
                }}
                isMergeTarget={previewMerge?.targetId === b.id}
                previewRows={previewMerge?.targetId === b.id ? previewMerge.sourceRows : 0}
              />;
            }
            if (b.type === 'text') {
              return <TextBlock 
                key={b.id} 
                block={b} 
                updateBlock={updateBlock} 
                t={t} 
                dark={dark} 
                isActive={activeBlockId === b.id}
                onSelect={(id) => {
                  setActiveBlockId(id);
                  setActiveCell(null);
                }}
              />;
            }
            return null;
          })}
          
          {blocks.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-50">
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-blue-500 flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className={`font-bold ${t.textPrimary}`}>Empty Table Workspace</h3>
              <p className={`text-sm ${t.textMuted}`}>Add a table or text block to get started.</p>
            </div>
          )}
        </div>
      </div>

      {showSaveModal && (
        <WorkspaceSaveModal
          t={t}
          dark={dark}
          defaultName=""
          onSave={(name) => {
            if (onSave) onSave(name);
            setShowSaveModal(false);
          }}
          onExportPdf={handleExportPdf}
          onCancel={() => setShowSaveModal(false)}
        />
      )}
    </>
  );
}
