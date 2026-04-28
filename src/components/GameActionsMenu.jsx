import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameLists } from '../hooks/useGameLists.js';

export default function GameActionsMenu({ game }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const {
    inLibrary,
    inPlanner,
    inWishlist,
    addToLibrary,
    addToPlanner,
    addToWishlist,
  } = useGameLists();

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const isInLibrary = inLibrary(game.appid);
  const isInPlanner = inPlanner(game.appid);
  const isInWishlist = inWishlist(game.appid);

  const handleLibrary = (e) => {
    stop(e);
    if (!isInLibrary) addToLibrary(game);
    setOpen(false);
    navigate('/library');
  };

  const handleWishlist = (e) => {
    stop(e);
    if (!isInWishlist) addToWishlist(game);
    setOpen(false);
  };

  const handlePlanner = (e) => {
    stop(e);
    if (!isInPlanner) addToPlanner(game);
    setOpen(false);
    navigate('/planner');
  };

  return (
    <div ref={wrapRef} className="relative" onClick={stop}>
      <button
        type="button"
        aria-label="Game actions"
        onClick={(e) => {
          stop(e);
          setOpen((o) => !o);
        }}
        className="w-7 h-7 grid place-items-center rounded-md bg-black/60 hover:bg-black/80 text-white text-base leading-none"
      >
        ⋮
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-9 z-20 w-52 rounded-lg border border-border bg-surface shadow-xl overflow-hidden"
        >
          <MenuItem
            disabled={isInLibrary}
            onClick={handleLibrary}
            label={isInLibrary ? '✓ In your library' : 'Add to library'}
            hint={isInLibrary ? undefined : 'Opens Library'}
          />
          {!game.isFree && (
            <MenuItem
              disabled={isInWishlist}
              onClick={handleWishlist}
              label={isInWishlist ? '✓ Plan to buy' : 'Plan to buy'}
              hint={isInWishlist ? undefined : `${game.price ? `$${game.price.toFixed(2)}` : 'Paid'}`}
            />
          )}
          <MenuItem
            disabled={isInPlanner}
            onClick={handlePlanner}
            label={isInPlanner ? '✓ Plan to play' : 'Plan to play'}
            hint={isInPlanner ? undefined : 'Opens Planner'}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, hint, onClick, disabled }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-2 ${
        disabled
          ? 'text-muted cursor-default'
          : 'text-text hover:bg-surface2 cursor-pointer'
      }`}
    >
      <span>{label}</span>
      {hint && <span className="text-[10px] text-muted">{hint}</span>}
    </button>
  );
}
