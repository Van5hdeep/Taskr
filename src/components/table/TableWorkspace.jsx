import { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { Plus, Copy, Trash2, Undo, Redo, PaintBucket, Type as TypeIcon, AlignLeft, AlignCenter, AlignRight, Settings, ChevronDown, Info, Grid, Eraser, PenLine, X, Underline, Italic, Bold, Trash } from "lucide-react";
import WorkspaceSaveModal from "../WorkspaceSaveModal";
import SaveButton from "../ui/SaveButton";

function useDraggable(initialX, initialY, zoom, onDragMove, onDragEnd) {
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
    const dx = (e.clientX - startMouse.current.x) / zoom;
    const dy = (e.clientY - startMouse.current.y) / zoom;
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

function AnnotateCanvas({ annotations, onAddAnnotation, activeTool, strokeColor, strokeWidth, eraserWidth, zoom }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const paths = [...annotations, ...(currentPath ? [currentPath] : [])];
    
    paths.forEach(path => {
      if (path.points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (path.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    });
  }, [annotations, currentPath]);

  const getCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };
  };

  const handlePointerDown = (e) => {
    if (activeTool !== 'annotate' && activeTool !== 'eraser') return;
    e.target.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setCurrentPath({ 
      color: strokeColor, 
      width: activeTool === 'eraser' ? eraserWidth : strokeWidth, 
      isEraser: activeTool === 'eraser', 
      points: [getCoords(e)] 
    });
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    setCurrentPath(prev => ({ ...prev, points: [...prev.points, getCoords(e)] }));
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    if (currentPath && currentPath.points.length > 0) {
      onAddAnnotation(currentPath);
    }
    setIsDrawing(false);
    setCurrentPath(null);
    e.target.releasePointerCapture(e.pointerId);
  };

  return (
    <canvas
      ref={canvasRef}
      width={5000}
      height={5000}
      className="absolute top-0 left-0 z-0"
      style={{ pointerEvents: (activeTool === 'annotate' || activeTool === 'eraser') ? 'auto' : 'none', cursor: activeTool === 'eraser' ? 'crosshair' : (activeTool === 'annotate' ? 'crosshair' : 'default') }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}

function TableBlock({ block, updateBlock, onDelete, onDuplicate, onMergeCheck, onDragFinish, isActive, activeCell, onCellSelect, isMergeTarget, previewRows, activeTool, zoom }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showRearrange, setShowRearrange] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const { pos, isDragging, handlePointerDown, handlePointerMove, handlePointerUp, updatePos } = useDraggable(
    block.x, 
    block.y, 
    zoom,
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

  useEffect(() => {
    if (!isActive) {
      setShowMenu(false);
      setShowRearrange(false);
      setShowInfo(false);
    }
  }, [isActive]);

  const handleCellChange = (r, c, value) => {
    const newData = [...block.data];
    newData[r] = [...newData[r]];
    newData[r][c] = value;
    updateBlock(block.id, { data: newData });
  };

  const handleCellColor = (color) => {
    if (!activeCell) return;
    const { r, c } = activeCell;
    const newColors = [...(block.cellColors || Array(block.rows).fill(0).map(()=>Array(block.cols).fill('')))];
    newColors[r] = [...newColors[r]];
    newColors[r][c] = color;
    updateBlock(block.id, { cellColors: newColors });
  };

  const handleCellAlign = (align) => {
    if (!activeCell) return;
    const { r, c } = activeCell;
    const newAlign = [...(block.cellAlign || Array(block.rows).fill(0).map(()=>Array(block.cols).fill('left')))];
    newAlign[r] = [...newAlign[r]];
    newAlign[r][c] = align;
    updateBlock(block.id, { cellAlign: newAlign });
  };

  const renderTitle = () => {
    if (!block.hasTitle) return null;
    return (
      <div className="bg-slate-200 p-[1px] mb-[1px]">
        <input 
           type="text" 
           value={block.title || ""} 
           onChange={e => updateBlock(block.id, { title: e.target.value })}
           className={`w-full p-2 outline-none text-center font-bold bg-white text-blue-900 ${isActive ? 'ring-2 ring-blue-500 z-10 relative' : ''}`}
           placeholder="Table Title"
        />
      </div>
    );
  };

  const renderGrid = (rowsToRender, isPreview = false) => {
    return (
      <div 
        className={`grid gap-[1px] bg-slate-200 border border-slate-200 ${isPreview ? 'opacity-40 mt-[1px]' : ''}`} 
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
                  className={`w-full h-full p-2 outline-none bg-transparent text-sm text-blue-900 placeholder:text-slate-300 ${!isPreview && isActive && activeCell?.r === r && activeCell?.c === c ? 'ring-2 ring-blue-500 inset-0 z-10' : ''}`}
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
      className={`absolute transition-shadow ${isDragging ? 'shadow-2xl z-50 opacity-60' : 'shadow-lg z-10'} rounded-xl border ${isActive ? 'ring-2 ring-blue-500' : ''} ${isMergeTarget ? 'ring-4 ring-blue-500 shadow-blue-500/20 scale-[1.02] transition-transform' : 'transition-none'} border-slate-200`}
      style={{ left: pos.x, top: pos.y, pointerEvents: (!activeTool || activeTool === 'selection' || activeTool === 'text') ? 'auto' : 'none' }}
      onPointerDown={(e) => {
        onCellSelect(block.id, null);
        handlePointerDown(e);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className={`p-2 rounded-xl bg-white overflow-hidden cursor-grab active:cursor-grabbing`}>
        {renderTitle()}
        {renderGrid(block.rows)}
        {isMergeTarget && previewRows > 0 && renderGrid(previewRows, true)}
      </div>

      {block.description !== undefined && (
        <div className="absolute -left-8 top-0 z-50">
          <button 
            onPointerDown={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
            className="p-1.5 rounded-full bg-blue-100 text-blue-600 shadow-sm border border-blue-200 hover:scale-110 transition-transform"
          >
            <Info className="w-4 h-4" />
          </button>
          {showInfo && (
            <div className="absolute top-8 left-0 w-64 bg-white shadow-xl border border-slate-200 p-3 rounded-lg" onPointerDown={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-blue-900">Table Description</span>
                <button onClick={() => setShowInfo(false)}><X className="w-4 h-4 text-slate-400 hover:text-blue-600" /></button>
              </div>
              <textarea 
                autoFocus
                value={block.description}
                onChange={e => updateBlock(block.id, { description: e.target.value })}
                className="w-full h-24 p-2 text-sm border border-slate-200 rounded outline-none resize-none text-blue-900 bg-white"
                placeholder="Enter table description..."
              />
            </div>
          )}
        </div>
      )}

      {showRearrange && (
        <div className="absolute top-0 right-full mr-2 z-50" onPointerDown={e => e.stopPropagation()}>
           <GridSelector onSelect={(r,c) => {
              if (r > 0 && c > 0) {
                const newData = Array(r).fill(0).map((_, i) => Array(c).fill("").map((_, j) => block.data[i]?.[j] || ""));
                const newColors = Array(r).fill(0).map((_, i) => Array(c).fill("").map((_, j) => block.cellColors?.[i]?.[j] || ""));
                const newAlign = Array(r).fill(0).map((_, i) => Array(c).fill("left").map((_, j) => block.cellAlign?.[i]?.[j] || "left"));
                updateBlock(block.id, { rows: r, cols: c, data: newData, cellColors: newColors, cellAlign: newAlign });
              }
              setShowRearrange(false);
           }} />
        </div>
      )}

      {isActive && (
        <div 
          className="absolute -bottom-3 -right-3 z-50"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className={`w-6 h-6 rounded-full shadow-md flex items-center justify-center border transition-colors bg-white border-slate-200 text-blue-600 hover:bg-slate-50`}
          >
            <Plus className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-45' : ''}`} />
          </button>
          
          {showMenu && (
            <div className={`absolute top-8 right-0 shadow-xl rounded-lg border w-56 py-2 z-50 bg-white border-slate-200 text-blue-900`}>
              <div className="px-3 py-1 mb-1 text-xs font-semibold flex items-center gap-2 border-b border-slate-100 pb-2 text-slate-500">
                <Settings className="w-3.5 h-3.5" /> Table Options
              </div>
              
              <button onClick={() => { updateBlock(block.id, { hasTitle: !block.hasTitle }); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center gap-2">
                <TypeIcon className="w-4 h-4 text-slate-400" /> {block.hasTitle ? 'Remove Title cell' : 'Add Title cell'}
              </button>
              <button onClick={() => { setShowRearrange(!showRearrange); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center gap-2">
                <Grid className="w-4 h-4 text-slate-400" /> Rearrange
              </button>
              <button onClick={() => { updateBlock(block.id, { description: block.description || "" }); setShowMenu(false); setShowInfo(true); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400" /> Add Table info
              </button>
              
              {activeCell && (
                <div className="px-3 py-2 border-y border-slate-100 my-2 bg-slate-50">
                   <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Cell Styling</div>
                   <div className="flex flex-wrap gap-1 mb-2">
                     {["bg-transparent", "bg-blue-500/20", "bg-blue-500/40", "bg-blue-500/60", "bg-slate-200", "bg-slate-300"].map(c => (
                        <button 
                          key={c} 
                          onClick={() => handleCellColor(c === "bg-transparent" ? "" : c)}
                          className={`w-5 h-5 rounded-full border shadow-sm ${c === 'bg-transparent' ? 'bg-white border-slate-300' : c} hover:scale-110 transition-transform`}
                          title="Cell Color"
                        />
                     ))}
                   </div>
                   <div className="flex items-center gap-1 border rounded overflow-hidden border-slate-200 w-fit bg-white">
                     <button onClick={() => handleCellAlign('left')} className="p-1.5 hover:bg-slate-50"><AlignLeft className="w-3.5 h-3.5" /></button>
                     <button onClick={() => handleCellAlign('center')} className="p-1.5 hover:bg-slate-50 border-x border-slate-200"><AlignCenter className="w-3.5 h-3.5" /></button>
                     <button onClick={() => handleCellAlign('right')} className="p-1.5 hover:bg-slate-50"><AlignRight className="w-3.5 h-3.5" /></button>
                   </div>
                </div>
              )}

              <button onClick={() => { onDuplicate(block.id); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center gap-2">
                <Copy className="w-4 h-4 text-slate-400" /> Duplicate
              </button>
              <button onClick={() => onDelete(block.id)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 flex items-center gap-2 text-blue-600 mt-1 border-t border-slate-100 pt-1">
                <Trash2 className="w-4 h-4" /> Delete Table
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TextBlock({ block, updateBlock, onDelete, isActive, onSelect, activeTool, zoom }) {
  const { pos, isDragging, handlePointerDown, handlePointerMove, handlePointerUp } = useDraggable(block.x, block.y, zoom, null, (x, y) => updateBlock(block.id, { x, y }));
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const textAreaRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      setShowMenu(false);
      setIsEditing(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (isEditing && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [isEditing]);

  const handleResizeMouseUp = (e) => {
    if (block.isNew) {
      updateBlock(block.id, { isNew: false });
      setIsEditing(true);
    }
    const rect = e.target.getBoundingClientRect();
    const newWidth = rect.width / zoom;
    const newHeight = rect.height / zoom;
    if (Math.abs(block.width - newWidth) > 2 || Math.abs(block.height - newHeight) > 2) {
      updateBlock(block.id, { width: newWidth, height: newHeight, isNew: false });
    }
  };

  return (
    <div 
      className={`absolute transition-shadow ${isDragging ? 'shadow-2xl z-50 opacity-90' : 'z-10'} ${isActive ? 'ring-2 ring-blue-500 rounded' : ''}`}
      style={{ left: pos.x, top: pos.y, pointerEvents: (!activeTool || activeTool === 'selection' || activeTool === 'text') ? 'auto' : 'none' }}
      onPointerDown={(e) => {
        onSelect(block.id);
        handlePointerDown(e);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {block.isNew ? (
        <div
          onMouseUp={handleResizeMouseUp}
          className={`border-2 border-blue-500 border-dashed rounded bg-blue-50/50 resize-both overflow-hidden`}
          style={{ width: block.width || 150, height: block.height || 60 }}
        />
      ) : isEditing ? (
        <textarea
          ref={textAreaRef}
          value={block.text}
          onChange={e => updateBlock(block.id, { text: e.target.value })}
          onBlur={() => setIsEditing(false)}
          onMouseUp={handleResizeMouseUp}
          className={`bg-white outline-none resize-both border-2 border-blue-500 border-dashed rounded p-2 text-blue-900`}
          style={{ 
            fontSize: block.fontSize, 
            width: block.width || 200,
            height: block.height || 100,
            color: block.color || 'inherit', 
            textAlign: block.align || 'left',
            fontWeight: block.bold ? 'bold' : 'normal',
            fontStyle: block.italic ? 'italic' : 'normal',
            textDecoration: block.underline ? 'underline' : 'none'
          }}
          placeholder="Type here..."
        />
      ) : (
        <div 
          onDoubleClick={() => setIsEditing(true)}
          className={`cursor-text whitespace-pre-wrap p-2 rounded text-blue-900 overflow-hidden`}
          style={{ 
            fontSize: block.fontSize,
            width: block.width || 200,
            height: block.height || 100,
            color: block.color || 'inherit', 
            textAlign: block.align || 'left',
            fontWeight: block.bold ? 'bold' : 'normal',
            fontStyle: block.italic ? 'italic' : 'normal',
            textDecoration: block.underline ? 'underline' : 'none'
          }}
        >
          {block.text || "Double click to edit text"}
        </div>
      )}

      {isActive && !isEditing && !block.isNew && (
        <div 
          className="absolute -bottom-3 -right-3 z-50"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className={`w-6 h-6 rounded-full shadow-md flex items-center justify-center border transition-colors bg-white border-slate-200 text-blue-600 hover:bg-slate-50`}
          >
            <Settings className={`w-3.5 h-3.5 transition-transform ${showMenu ? 'rotate-45' : ''}`} />
          </button>
          
          {showMenu && (
            <div className={`absolute top-8 right-0 shadow-xl rounded-lg border w-48 py-2 z-50 bg-white border-slate-200 text-blue-900`}>
              <div className="px-3 py-1 mb-1 text-xs font-semibold flex items-center gap-2 border-b pb-2 border-slate-100 text-slate-500">
                Text Options
              </div>
              <div className="flex flex-wrap items-center gap-1 px-3 py-2">
                <button onClick={() => updateBlock(block.id, { bold: !block.bold })} className={`p-1.5 rounded text-xs font-bold border ${block.bold ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-transparent hover:bg-slate-50'}`}><Bold className="w-3.5 h-3.5" /></button>
                <button onClick={() => updateBlock(block.id, { italic: !block.italic })} className={`p-1.5 rounded text-xs font-bold border ${block.italic ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-transparent hover:bg-slate-50'}`}><Italic className="w-3.5 h-3.5" /></button>
                <button onClick={() => updateBlock(block.id, { underline: !block.underline })} className={`p-1.5 rounded text-xs font-bold border ${block.underline ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-transparent hover:bg-slate-50'}`}><Underline className="w-3.5 h-3.5" /></button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button onClick={() => updateBlock(block.id, { fontSize: block.fontSize === '16px' ? '24px' : '16px' })} className="px-2 py-1.5 rounded text-xs font-bold hover:bg-slate-50 border border-transparent">
                  Aa
                </button>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 border-y border-slate-100 my-1">
                {["#1e3a8a", "#2563eb", "#60a5fa", "#94a3b8", "#475569", "#0f172a"].map(c => (
                  <button key={c} onClick={() => updateBlock(block.id, { color: c })} className={`w-5 h-5 rounded-full border shadow-sm ${block.color === c ? 'ring-2 ring-blue-500' : 'border-slate-300'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex items-center gap-1 px-3 py-1 mb-1">
                <button onClick={() => updateBlock(block.id, { align: 'left' })} className="p-1.5 hover:bg-slate-50 rounded"><AlignLeft className="w-3.5 h-3.5" /></button>
                <button onClick={() => updateBlock(block.id, { align: 'center' })} className="p-1.5 hover:bg-slate-50 rounded"><AlignCenter className="w-3.5 h-3.5" /></button>
                <button onClick={() => updateBlock(block.id, { align: 'right' })} className="p-1.5 hover:bg-slate-50 rounded"><AlignRight className="w-3.5 h-3.5" /></button>
              </div>
              <div className="border-t border-slate-100 pt-1 mt-1">
                <button onClick={() => onDelete(block.id)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center gap-2 text-blue-600">
                  <Trash2 className="w-4 h-4" /> Delete Text
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const GridSelector = ({ onSelect }) => {
  const [hoverRows, setHoverRows] = useState(0);
  const [hoverCols, setHoverCols] = useState(0);

  return (
    <div className={`p-3 rounded-lg shadow-xl border w-56 bg-white border-slate-200`}>
       <div className={`text-xs font-semibold mb-3 flex items-center gap-2 text-slate-600`}>
         <Grid className="w-3.5 h-3.5" /> Insert Table
       </div>
       <div className="grid gap-[2px] mx-auto w-fit" style={{ gridTemplateColumns: `repeat(8, 1fr)` }} onMouseLeave={() => {setHoverRows(0); setHoverCols(0);}}>
         {Array(8).fill(0).map((_, r) => 
           Array(8).fill(0).map((_, c) => (
             <div 
               key={`${r}-${c}`}
               onMouseEnter={() => { setHoverRows(r + 1); setHoverCols(c + 1); }}
               onClick={() => onSelect(hoverRows, hoverCols)}
               className={`w-4 h-4 border rounded-sm cursor-pointer transition-colors ${(r < hoverRows && c < hoverCols) ? 'bg-blue-100 border-blue-500' : 'bg-white border-slate-200'}`}
             />
           ))
         )}
       </div>
       <div className={`text-center mt-3 text-xs font-medium h-4 text-slate-500`}>
         {hoverRows > 0 ? `${hoverRows} x ${hoverCols}` : 'Select table size'}
       </div>
    </div>
  );
};

const FillSelector = ({ onFill }) => {
  const [selectedColor, setSelectedColor] = useState("bg-blue-500/20");
  
  return (
    <div className={`p-3 rounded-lg shadow-xl border w-48 bg-white border-slate-200`}>
       <div className={`text-xs font-semibold mb-2 flex items-center gap-2 text-slate-600`}>
         <PaintBucket className="w-3.5 h-3.5" /> Fill Target
       </div>
       <div className="flex flex-wrap gap-1 mb-3">
         {["bg-transparent", "bg-blue-500/20", "bg-blue-500/40", "bg-blue-500/60", "bg-slate-200", "bg-slate-300"].map(c => (
            <button 
              key={c} 
              onClick={() => setSelectedColor(c === "bg-transparent" ? "" : c)}
              className={`w-6 h-6 rounded border shadow-sm ${c === 'bg-transparent' ? 'bg-slate-50 border-slate-300' : c} ${selectedColor === (c === "bg-transparent" ? "" : c) ? 'ring-2 ring-blue-500 ring-offset-1' : ''} hover:scale-110 transition-transform`}
            />
         ))}
       </div>
       <div className="flex flex-col gap-1 text-xs font-medium text-slate-600">
         <button onClick={() => onFill(selectedColor, 'cell')} className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 rounded text-left border border-transparent transition-colors">Fill Cell</button>
         <button onClick={() => onFill(selectedColor, 'row')} className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 rounded text-left border border-transparent transition-colors">Fill Row</button>
         <button onClick={() => onFill(selectedColor, 'col')} className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 rounded text-left border border-transparent transition-colors">Fill Column</button>
         <button onClick={() => onFill(selectedColor, 'table')} className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 rounded text-left border border-transparent transition-colors">Fill Table</button>
       </div>
    </div>
  );
};

function ClearWorkspaceModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in" onPointerDown={onCancel}>
      <div 
        className={`w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl`}
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-blue-600 mb-4 mx-auto">
          <Trash className="w-6 h-6" />
        </div>
        <h2 className={`text-center text-lg font-bold mb-2 text-blue-900`}>Clear Workspace</h2>
        <p className={`text-center text-sm mb-6 text-slate-500`}>
          Are you sure you want to clear the entire workspace? This will remove all tables, text, and annotations.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className={`flex-1 px-4 py-2 rounded-xl font-semibold border border-slate-300 bg-white text-slate-600 hover:bg-slate-50`}>
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700">
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TableWorkspace({ t, onSave }) {
  const initialBlocks = () => JSON.parse(localStorage.getItem("taskr_table_data") || "[]");
  const initialAnnotations = () => JSON.parse(localStorage.getItem("taskr_table_annotations") || "[]");

  const [history, setHistory] = useState([{ blocks: initialBlocks(), annotations: initialAnnotations() }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentBlocks = history[historyIndex].blocks;
  const currentAnnotations = history[historyIndex].annotations;

  const pushState = (newBlocks, newAnnotations) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ blocks: newBlocks, annotations: newAnnotations });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    localStorage.setItem("taskr_table_data", JSON.stringify(newBlocks));
    localStorage.setItem("taskr_table_annotations", JSON.stringify(newAnnotations));
  };

  const undo = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      localStorage.setItem("taskr_table_data", JSON.stringify(history[idx].blocks));
      localStorage.setItem("taskr_table_annotations", JSON.stringify(history[idx].annotations));
      setActiveBlockId(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      localStorage.setItem("taskr_table_data", JSON.stringify(history[idx].blocks));
      localStorage.setItem("taskr_table_annotations", JSON.stringify(history[idx].annotations));
      setActiveBlockId(null);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const [workspaceTitle, setWorkspaceTitle] = useState(() => localStorage.getItem("taskr_table_title") || "TABLE");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  
  const [previewMerge, setPreviewMerge] = useState(null);
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [showFillMenu, setShowFillMenu] = useState(false);
  const [showEraserMenu, setShowEraserMenu] = useState(false);
  
  const [activeTool, setActiveTool] = useState(null);
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [activeCell, setActiveCell] = useState(null);
  
  const [strokeColor, setStrokeColor] = useState('#2563eb');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [eraserWidth, setEraserWidth] = useState(10);
  
  const [zoom, setZoom] = useState(1);
  const workspaceRef = useRef(null);

  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;
    
    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        
        const zoomDelta = -e.deltaY * 0.005;
        setZoom(prevZoom => {
          const newZoom = Math.min(Math.max(prevZoom + zoomDelta, 0.1), 5);
          
          const rect = el.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          const docX = (el.scrollLeft + mouseX) / prevZoom;
          const docY = (el.scrollTop + mouseY) / prevZoom;
          
          requestAnimationFrame(() => {
            el.scrollLeft = docX * newZoom - mouseX;
            el.scrollTop = docY * newZoom - mouseY;
          });

          return newZoom;
        });
      }
    };
    
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleWorkspaceClick = (e) => {
    if (activeTool === 'text') {
      const el = workspaceRef.current;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const x = (mouseX + el.scrollLeft) / zoom;
      const y = (mouseY + el.scrollTop) / zoom;
      
      const id = crypto.randomUUID();
      const newBlock = { id, type: 'text', x, y, text: "", width: 150, height: 60, fontSize: '16px', bold: false, isNew: true };
      pushState([...currentBlocks, newBlock], currentAnnotations);
      setActiveBlockId(id);
      setActiveCell(null);
      setActiveTool(null);
    } else {
      setActiveBlockId(null);
      setActiveCell(null);
      setShowTableGrid(false);
      setShowFillMenu(false);
      setShowEraserMenu(false);
    }
  };

  const addTable = (r, c) => {
    const id = crypto.randomUUID();
    const data = Array(r).fill(0).map(() => Array(c).fill(""));
    const cellColors = Array(r).fill(0).map(() => Array(c).fill(""));
    const cellAlign = Array(r).fill(0).map(() => Array(c).fill("left"));
    
    const el = workspaceRef.current;
    const viewCenterX = el.scrollLeft + (el.clientWidth / 2);
    const viewCenterY = el.scrollTop + (el.clientHeight / 2);
    const x = viewCenterX / zoom - (c * 50); 
    const y = viewCenterY / zoom - (r * 20);

    const newBlock = { id, type: 'table', x, y, rows: r, cols: c, data, color: "bg-transparent", cellColors, cellAlign };
    pushState([...currentBlocks, newBlock], currentAnnotations);
    setActiveBlockId(id);
    setActiveCell(null);
    setActiveTool(null);
  };

  const updateBlock = (id, updates) => {
    const newBlocks = currentBlocks.map(b => b.id === id ? { ...b, ...updates } : b);
    pushState(newBlocks, currentAnnotations);
  };

  const deleteBlock = (id) => {
    const newBlocks = currentBlocks.filter(b => b.id !== id);
    pushState(newBlocks, currentAnnotations);
    if (previewMerge?.sourceId === id || previewMerge?.targetId === id) setPreviewMerge(null);
    if (activeBlockId === id) {
      setActiveBlockId(null);
      setActiveCell(null);
    }
  };

  const duplicateBlock = (id) => {
    const block = currentBlocks.find(b => b.id === id);
    if (!block) return;
    const newBlock = JSON.parse(JSON.stringify(block));
    newBlock.id = crypto.randomUUID();
    newBlock.x += 40;
    newBlock.y += 40;
    pushState([...currentBlocks, newBlock], currentAnnotations);
    setActiveBlockId(newBlock.id);
  };

  const handleMergeCheck = (sourceId, x, y) => {
    const sourceBlock = currentBlocks.find(b => b.id === sourceId);
    if (!sourceBlock || sourceBlock.type !== 'table') return;

    const threshold = 50;
    const target = currentBlocks.find(b => b.id !== sourceId && b.type === 'table' && Math.abs(b.x - x) < threshold && Math.abs((b.y + (b.rows * 40)) - y) < threshold * 2);
    
    if (target && target.cols === sourceBlock.cols) {
      setPreviewMerge({ sourceId, targetId: target.id, sourceRows: sourceBlock.rows });
    } else {
      setPreviewMerge(null);
    }
  };

  const handleDragFinish = (sourceId, x, y) => {
    if (previewMerge && previewMerge.sourceId === sourceId) {
      const { targetId } = previewMerge;
      const source = currentBlocks.find(b => b.id === sourceId);
      const target = currentBlocks.find(b => b.id === targetId);
      if (source && target) {
        const newData = [...target.data, ...source.data];
        const newCellColors = [...(target.cellColors || []), ...(source.cellColors || [])];
        const newCellAlign = [...(target.cellAlign || []), ...(source.cellAlign || [])];
        
        const newBlocks = currentBlocks.map(b => {
          if (b.id === targetId) {
            return { ...b, rows: target.rows + source.rows, data: newData, cellColors: newCellColors, cellAlign: newCellAlign };
          }
          return b;
        }).filter(b => b.id !== sourceId);
        
        pushState(newBlocks, currentAnnotations);
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

  const handleFill = (color, target) => {
    if (!activeBlockId) return;
    const block = currentBlocks.find(b => b.id === activeBlockId);
    if (!block || block.type !== 'table') return;

    const newColors = [...(block.cellColors || Array(block.rows).fill(0).map(()=>Array(block.cols).fill('')))];
    
    if (target === 'cell' && activeCell) {
      newColors[activeCell.r] = [...newColors[activeCell.r]];
      newColors[activeCell.r][activeCell.c] = color;
    } else if (target === 'row' && activeCell) {
      newColors[activeCell.r] = Array(block.cols).fill(color);
    } else if (target === 'col' && activeCell) {
      for (let r = 0; r < block.rows; r++) {
        newColors[r] = [...newColors[r]];
        newColors[r][activeCell.c] = color;
      }
    } else if (target === 'table') {
      for (let r = 0; r < block.rows; r++) {
        newColors[r] = Array(block.cols).fill(color);
      }
    }

    updateBlock(activeBlockId, { cellColors: newColors });
    setShowFillMenu(false);
  };

  const handleAddAnnotation = (path) => {
    pushState(currentBlocks, [...currentAnnotations, path]);
  };

  const confirmClearWorkspace = () => {
    pushState([], []);
    setShowClearModal(false);
  };

  return (
    <>
      <div className="w-full h-[calc(100vh-80px)] flex flex-col bg-white">
        
        {/* TITLE SECTION (Section 1) */}
        <div className="flex-none px-6 pt-6">
          <input 
            value={workspaceTitle}
            onChange={e => setWorkspaceTitle(e.target.value)}
            onBlur={() => {
              const val = workspaceTitle.trim() || "TABLE";
              setWorkspaceTitle(val);
              localStorage.setItem("taskr_table_title", val);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') e.target.blur();
            }}
            className="bg-transparent outline-none font-bold text-2xl tracking-wide text-blue-900 border-b border-transparent focus:border-blue-200 transition-colors w-full"
            placeholder="TABLE"
          />
        </div>

        {/* TABLE TOOLS CONTAINER (Section 2) */}
        <div className="flex-none px-6 pt-6">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-50 rounded-lg p-1 mr-2 border border-slate-200">
                <button 
                  onClick={undo}
                  disabled={!canUndo}
                  className={`p-1.5 rounded-md transition-colors ${canUndo ? 'text-slate-700 hover:bg-white shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}
                  title="Undo"
                >
                  <Undo className="w-4 h-4" />
                </button>
                <button 
                  onClick={redo}
                  disabled={!canRedo}
                  className={`p-1.5 rounded-md transition-colors ${canRedo ? 'text-slate-700 hover:bg-white shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}
                  title="Redo"
                >
                  <Redo className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <button 
                  onClick={() => { setShowTableGrid(!showTableGrid); setActiveTool(null); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors bg-white border-slate-200 hover:bg-slate-50 text-blue-900`}
                >
                  <Grid className="w-4 h-4 text-slate-500" />
                  Table
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                
                {showTableGrid && (
                  <div className="absolute top-full left-0 mt-2 z-50">
                    <GridSelector onSelect={(r, c) => { if(r>0 && c>0){addTable(r, c);} setShowTableGrid(false); }} />
                  </div>
                )}
              </div>

              <button 
                onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${activeTool === 'text' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 hover:bg-slate-50 text-blue-900'}`}
              >
                <TypeIcon className="w-4 h-4" />
                Text
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => { setShowFillMenu(!showFillMenu); setActiveTool(null); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors bg-white border-slate-200 hover:bg-slate-50 text-blue-900`}
                >
                  <PaintBucket className="w-4 h-4 text-slate-500" />
                  Fill
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                {showFillMenu && (
                  <div className="absolute top-full left-0 mt-2 z-50">
                    <FillSelector onFill={handleFill} />
                  </div>
                )}
              </div>

              <div className="w-px h-6 bg-slate-200 mx-1" />

              <button 
                onClick={() => setActiveTool(activeTool === 'annotate' ? null : 'annotate')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${activeTool === 'annotate' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 hover:bg-slate-50 text-blue-900'}`}
              >
                <PenLine className="w-4 h-4" />
                Annotate
              </button>
              
              {activeTool === 'annotate' && (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm mx-1">
                  {["#2563eb", "#60a5fa", "#93c5fd", "#475569", "#0f172a"].map(c => (
                    <button key={c} onClick={() => setStrokeColor(c)} className={`w-5 h-5 rounded-full border shadow-sm ${strokeColor === c ? 'ring-2 ring-blue-500' : 'border-slate-300'}`} style={{ backgroundColor: c }} />
                  ))}
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button onClick={() => setStrokeWidth(2)} className={`px-2 py-1 rounded text-xs font-bold ${strokeWidth === 2 ? 'bg-slate-100 text-blue-900' : 'hover:bg-slate-50 text-slate-500'}`}>1x</button>
                  <button onClick={() => setStrokeWidth(5)} className={`px-2 py-1 rounded text-xs font-bold ${strokeWidth === 5 ? 'bg-slate-100 text-blue-900' : 'hover:bg-slate-50 text-slate-500'}`}>2x</button>
                </div>
              )}

              <div className="relative">
                <button 
                  onClick={() => { setActiveTool(activeTool === 'eraser' ? null : 'eraser'); setShowEraserMenu(activeTool !== 'eraser'); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${activeTool === 'eraser' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 hover:bg-slate-50 text-blue-900'}`}
                >
                  <Eraser className="w-4 h-4" />
                  Eraser
                </button>
                {showEraserMenu && activeTool === 'eraser' && (
                  <div className={`absolute top-full left-0 mt-2 p-3 w-48 rounded-xl shadow-xl border z-50 bg-white border-slate-200`}>
                    <div className={`text-xs font-semibold mb-3 text-slate-600`}>Eraser Size</div>
                    <div className="flex flex-col gap-2">
                      {[{label: 'Small', size: 5}, {label: 'Medium', size: 15}, {label: 'Large', size: 30}].map(sz => (
                          <button key={sz.label} onClick={() => { setEraserWidth(sz.size); setShowEraserMenu(false); }} className={`px-2 py-1.5 text-left rounded text-sm ${eraserWidth === sz.size ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                            {sz.label}
                          </button>
                      ))}
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <div className={`text-xs mb-1 text-slate-500`}>Custom: {eraserWidth}px</div>
                        <input type="range" min="1" max="100" value={eraserWidth} onChange={e => setEraserWidth(parseInt(e.target.value))} className="w-full accent-blue-500" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="w-px h-6 bg-slate-200 mx-1" />

              <button 
                onClick={() => setShowClearModal(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors bg-white border-slate-200 hover:bg-slate-50 text-blue-600`}
              >
                Clear Workspace
              </button>
            </div>
            
            {/* Save Button explicitly aligned right by justify-between */}
            <div className="flex items-center">
              <SaveButton onClick={() => setShowSaveModal(true)} />
            </div>
          </div>
        </div>

        {/* WORKSPACE (Section 3) */}
        <div 
          ref={workspaceRef}
          className="flex-1 mt-6 relative overflow-auto bg-white border-t border-slate-200"
          onPointerDown={handleWorkspaceClick}
        >
          <div 
            className="dot-grid" 
            style={{ 
              minWidth: '5000px', 
              minHeight: '5000px', 
              transform: `scale(${zoom})`, 
              transformOrigin: 'top left' 
            }}
          >
            <AnnotateCanvas 
              annotations={currentAnnotations} 
              onAddAnnotation={handleAddAnnotation} 
              activeTool={activeTool} 
              strokeColor={strokeColor} 
              strokeWidth={strokeWidth} 
              eraserWidth={eraserWidth}
              zoom={zoom}
            />
            
            {currentBlocks.map(b => {
              if (b.type === 'table') {
                return <TableBlock 
                  key={b.id} 
                  block={b} 
                  updateBlock={updateBlock} 
                  onDelete={deleteBlock}
                  onDuplicate={duplicateBlock}
                  onMergeCheck={handleMergeCheck}
                  onDragFinish={handleDragFinish} 
                  isActive={activeBlockId === b.id}
                  activeCell={activeCell}
                  onCellSelect={(id, cell) => {
                    if (activeTool && activeTool !== 'selection' && activeTool !== 'text' && activeTool !== 'annotate' && activeTool !== 'eraser') return;
                    setActiveBlockId(id);
                    setActiveCell(cell);
                    setActiveTool(null);
                  }}
                  isMergeTarget={previewMerge?.targetId === b.id}
                  previewRows={previewMerge?.targetId === b.id ? previewMerge.sourceRows : 0}
                  activeTool={activeTool}
                  zoom={zoom}
                />;
              }
              if (b.type === 'text') {
                return <TextBlock 
                  key={b.id} 
                  block={b} 
                  updateBlock={updateBlock} 
                  onDelete={deleteBlock}
                  isActive={activeBlockId === b.id}
                  onSelect={(id) => {
                    if (activeTool && activeTool !== 'selection' && activeTool !== 'text' && activeTool !== 'annotate' && activeTool !== 'eraser') return;
                    setActiveBlockId(id);
                    setActiveCell(null);
                    setActiveTool(null);
                  }}
                  activeTool={activeTool}
                  zoom={zoom}
                />;
              }
              return null;
            })}
          </div>
        </div>
      </div>

      {showSaveModal && (
        <WorkspaceSaveModal
          defaultName=""
          onSave={(name) => {
            if (onSave) onSave(name);
            setShowSaveModal(false);
          }}
          onExportPdf={handleExportPdf}
          onCancel={() => setShowSaveModal(false)}
        />
      )}

      {showClearModal && (
        <ClearWorkspaceModal 
          onConfirm={confirmClearWorkspace}
          onCancel={() => setShowClearModal(false)}
        />
      )}
    </>
  );
}
