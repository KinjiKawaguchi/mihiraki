import type { Reaction, ReactionKind } from "@mihiraki/core";
import { useEffect, useState } from "preact/hooks";
import { useMessages } from "../i18n/i18n";
import { ReactionPicker } from "./ReactionPicker";
import { REACTION_EMOJI } from "./reaction-emoji";

/** `reactions` with the viewer's `kind` reaction given or taken back. */
function withReaction(
  reactions: readonly Reaction[],
  kind: ReactionKind,
  isOn: boolean,
): readonly Reaction[] {
  const existing = reactions.find((reaction) => reaction.kind === kind);
  if (!existing) return isOn ? [...reactions, { kind, count: 1, isByViewer: true }] : reactions;
  if (existing.isByViewer === isOn) return reactions;
  const count = existing.count + (isOn ? 1 : -1);
  return reactions.flatMap((reaction) =>
    reaction.kind !== kind ? [reaction] : count > 0 ? [{ kind, count, isByViewer: isOn }] : [],
  );
}

/** Resolves with why the change failed, or null once the host accepted it. */
export type ChangeReaction = (kind: ReactionKind, isOn: boolean) => Promise<string | null>;

/**
 * Shows the change at once and keeps it until the reloaded reactions arrive, as GitHub's
 * own buttons do; a refused change is taken back.
 */
function useReactionChanges(reactions: readonly Reaction[], change: ChangeReaction) {
  const [shown, setShown] = useState<readonly Reaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setShown(null), [reactions]);
  const current = shown ?? reactions;

  const toggle = async (kind: ReactionKind) => {
    const isOn = !current.some((reaction) => reaction.kind === kind && reaction.isByViewer);
    setShown(withReaction(current, kind, isOn));
    setError(null);
    const failure = await change(kind, isOn);
    if (failure === null) return;
    setShown(null);
    setError(failure);
  };

  return { current, error, toggle };
}

interface ReactionsProps {
  readonly reactions: readonly Reaction[];
  /** Absent where the viewer may not react; the reactions are then only shown. */
  readonly onChange?: ChangeReaction;
}

export function Reactions({ reactions, onChange }: ReactionsProps) {
  if (!onChange) return <ReactionCounts reactions={reactions} />;
  return <ReactionButtons reactions={reactions} onChange={onChange} />;
}

function ReactionCounts({ reactions }: { readonly reactions: readonly Reaction[] }) {
  if (reactions.length === 0) return null;
  return (
    <ul class="mhr-reactions">
      {reactions.map((reaction) => (
        <li
          key={reaction.kind}
          class={`mhr-reaction${reaction.isByViewer ? " mhr-reaction--mine" : ""}`}
        >
          <span aria-hidden="true">{REACTION_EMOJI[reaction.kind]}</span>
          <span>{reaction.count}</span>
        </li>
      ))}
    </ul>
  );
}

function ReactionButtons({
  reactions,
  onChange,
}: {
  readonly reactions: readonly Reaction[];
  readonly onChange: ChangeReaction;
}) {
  const t = useMessages();
  const changes = useReactionChanges(reactions, onChange);
  return (
    <>
      <ul class="mhr-reactions">
        {changes.current.map((reaction) => (
          <li key={reaction.kind}>
            <button
              type="button"
              class={`mhr-reaction${reaction.isByViewer ? " mhr-reaction--mine" : ""}`}
              aria-pressed={reaction.isByViewer}
              aria-label={t.reactionLabel(t.reactionName[reaction.kind], reaction.count)}
              onClick={() => void changes.toggle(reaction.kind)}
            >
              <span aria-hidden="true">{REACTION_EMOJI[reaction.kind]}</span>
              <span aria-hidden="true">{reaction.count}</span>
            </button>
          </li>
        ))}
        <li>
          <ReactionPicker onPick={(kind) => void changes.toggle(kind)} />
        </li>
      </ul>
      {changes.error && <p class="mhr-form__error">{changes.error}</p>}
    </>
  );
}
