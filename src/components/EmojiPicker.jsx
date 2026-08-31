const EMOJIS = ['😀','😂','😍','😎','😭','😡','🤔','🥳','💀','👽','👻','🔥','💚','💜','✨','⭐','🎵','🎸','🤘','👍','👎','💯','🌈','🍕'];

export default function EmojiPicker({ onPick }) {
  return <div className="emoji-picker" aria-label="Emoji picker">{EMOJIS.map((emoji) =>
    <button type="button" key={emoji} onClick={() => onPick(emoji)}>{emoji}</button>)}</div>;
}
