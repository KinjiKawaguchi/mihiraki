import type { ReactionKind } from "@mihiraki/core";
import { useState } from "preact/hooks";
import { useMessages } from "../i18n/i18n";
import { usePopupPlacement } from "./popup-placement";
import { REACTION_EMOJI } from "./reaction-emoji";
import { useCloseOnOutsidePointer } from "./use-close-on-outside-pointer";

const KINDS = Object.keys(REACTION_EMOJI) as readonly ReactionKind[];

/** GitHub's smiley button: a menu of the reactions to give or take back. */
export function ReactionPicker({ onPick }: { readonly onPick: (kind: ReactionKind) => void }) {
  const t = useMessages();
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);
  const ref = useCloseOnOutsidePointer(isOpen, close);
  const { popupRef, placement } = usePopupPlacement(isOpen, ref);

  return (
    <div class="mhr-menu" ref={ref}>
      <button
        type="button"
        class="mhr-reaction mhr-reaction--add"
        aria-label={t.addReaction}
        title={t.addReaction}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
          <path
            fill="currentColor"
            d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm3.82 1.636a.75.75 0 0 1 1.038.175l.007.009c.103.118.22.222.35.31.264.178.683.37 1.285.37.602 0 1.02-.192 1.285-.371.13-.088.247-.192.35-.31l.007-.008a.75.75 0 0 1 1.222.87l-.022-.015c.02.013.021.015.021.015v.001l-.001.002-.002.003-.005.007-.014.019a2.066 2.066 0 0 1-.184.213c-.16.166-.338.316-.53.445-.63.418-1.37.638-2.127.629-.946 0-1.652-.308-2.126-.63a3.331 3.331 0 0 1-.715-.657l-.014-.02-.005-.006-.002-.003v-.002h-.001l.613-.432-.614.43a.75.75 0 0 1 .183-1.044ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
          />
        </svg>
      </button>
      {isOpen && (
        <div
          class="mhr-menu__list mhr-reaction-picker"
          role="menu"
          ref={popupRef}
          data-placement={placement}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          {KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              role="menuitem"
              aria-label={t.reactionName[kind]}
              title={t.reactionName[kind]}
              onClick={() => {
                onPick(kind);
                close();
              }}
            >
              {REACTION_EMOJI[kind]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
