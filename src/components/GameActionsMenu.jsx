import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameLists } from '../hooks/useGameLists.js';
import { usePermissions } from '../hooks/usePermissions.js';

export default function GameActionsMenu({ game }) {
  const [open, setOpen] = useState(false);
  const [buyPromptOpen, setBuyPromptOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const { canWrite, role } = usePermissions();
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

  if (!canWrite) {
    return (
      <div
        className="w-7 h-7 grid place-items-center rounded-md bg-black/40 text-white/60 text-[10px] leading-none cursor-not-allowed"
        title={`Read-only (${role || 'VISITOR'} cannot modify lists)`}
        onClick={(e) => e.preventDefault()}
      >
        🔒
      </div>
    );
  }

  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const isInLibrary = inLibrary(game.appid);
  const isInPlanner = inPlanner(game.appid);
  const isInWishlist = inWishlist(game.appid);

  const handleLibrary = (e) => {
    stop(e);
    if (isInLibrary) {
      setOpen(false);
      navigate('/library');
      return;
    }

    if (game.isFree) {
      addToLibrary(game);
      setOpen(false);
      navigate('/library');
      return;
    }

    setBuyPromptOpen(true);
    setOpen(false);
  };

  const handleBuyNow = () => {
    addToLibrary(game);
    setBuyPromptOpen(false);
    navigate('/library');
  };

  const handlePlanToBuy = () => {
    if (!isInWishlist) addToWishlist(game);
    setBuyPromptOpen(false);
    navigate('/planner');
  };

  const handleWishlist = (e) => {
    stop(e);
    if (!isInWishlist) addToWishlist(game);
    setOpen(false);
  };

  const handlePlanner = (e) => {
    stop(e);
    if (!isInPlanner && isInLibrary) {
      addToPlanner(game);
      setOpen(false);
      navigate('/planner');
    }
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
            hint={isInLibrary ? undefined : game.isFree ? 'FREE - Add now' : 'Own this game'}
          />
          {!game.isFree && !isInLibrary && (
            <MenuItem
              disabled={isInWishlist}
              onClick={handleWishlist}
              label={isInWishlist ? '✓ Plan to buy' : 'Plan to buy'}
              hint={isInWishlist ? undefined : `${game.price ? `$${game.price.toFixed(2)}` : 'Paid'}`}
            />
          )}
          <MenuItem
            disabled={isInPlanner || !isInLibrary}
            onClick={handlePlanner}
            label={isInPlanner ? '✓ Plan to play' : 'Plan to play'}
            hint={
              isInPlanner
                ? undefined
                : !isInLibrary
                ? '⚠️ Add to library first'
                : 'Opens Planner'
            }
          />
        </div>
      )}
      {buyPromptOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose purchase option"
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-4 shadow-2xl space-y-4"
            onClick={stop}
          >
            <div>
              <h3 className="text-lg font-semibold tracking-tight">{game.name}</h3>
              <p className="text-sm text-muted mt-1">
                This game is paid. Choose how you want to add it.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Buy right now
              </button>
              <button
                type="button"
                onClick={handlePlanToBuy}
                className="w-full rounded-lg border border-border bg-surface2 px-4 py-2.5 text-sm font-medium text-text hover:bg-surface3"
              >
                Plan to buy
              </button>
              <button
                type="button"
                onClick={() => setBuyPromptOpen(false)}
                className="w-full rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-text"
              >
                Cancel
              </button>
            </div>
          </div>
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
