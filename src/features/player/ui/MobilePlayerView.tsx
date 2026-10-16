import { useCallback, useRef, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play,
  Pause,
  SkipNext,
  SkipPrevious,
  Repeat,
  RepeatOne,
  Shuffle,
  MusicNote,
  ChatRoundDots,
  Playlist,
} from "@solar-icons/react";
import { HeartFill, HeartLine } from "@mingcute/react";
import { usePlayerState } from "../hooks/usePlayerState";
import { playerEngine } from "../engine/playerEngine";
import { useIsTrackLiked, useLikeTrack, useUnlikeTrack } from "@/features/library/hooks";
import { ArtistLink } from "@/features/artist";
import { useCoverReady, CoverImage } from "@/features/covers";
import ExplicitBadge from "@/shared/ui/ExplicitBadge";
import { useTranslation } from "@/languages";
import { VolumePicker } from "./VolumePicker";
import { TimelineSlider } from "./TimelineSlider";

export type MobilePlayerTab = "player" | "lyrics";

export interface MobilePlayerViewProps {
  view: MobilePlayerTab;
  onViewChange: (view: MobilePlayerTab) => void;
  onClose: () => void;
  onOpenQueue?: () => void;
  // starts the swipe-down-to-dismiss drag (see FullscreenPlayer)
  onHeaderPointerDown: (e: PointerEvent) => void;
  // the lyrics column (provider island + lyrics / empty states)
  lyricsPane: ReactNode;
}

function useLikeToggle(trackId: string | undefined) {
  const isLiked = useIsTrackLiked(trackId);
  const likeMutation = useLikeTrack();
  const unlikeMutation = useUnlikeTrack();
  const togglingRef = useRef(false);

  const toggle = useCallback(() => {
    if (!trackId || togglingRef.current) return;
    togglingRef.current = true;
    const onSettled = () => {
      togglingRef.current = false;
    };
    if (isLiked) unlikeMutation.mutate(trackId, { onSettled });
    else likeMutation.mutate(trackId, { onSettled });
  }, [trackId, isLiked, likeMutation, unlikeMutation]);

  return { isLiked, toggle };
}

function Transport({ compact = false }: { compact?: boolean }) {
  const player = usePlayerState();
  const isPlaying = player.status === "playing";
  const side = compact ? 34 : 42;
  const main = compact ? 52 : 68;

  return (
    <div
      className={`flex items-center justify-center ${
        compact ? "gap-[34px]" : "gap-[46px]"
      }`}
    >
      <button
        type="button"
        aria-label="Previous track"
        onClick={() => void playerEngine.skipPrevious()}
        className="inline-flex h-[64px] w-[64px] items-center justify-center border-none bg-transparent text-white active:scale-[0.88] active:opacity-70 transition-all duration-150 cursor-pointer"
      >
        <SkipPrevious size={side} weight="Bold" />
      </button>
      <button
        type="button"
        aria-label={isPlaying ? "Pause" : "Play"}
        onClick={() => void playerEngine.togglePlayPause()}
        className="inline-flex h-[76px] w-[76px] items-center justify-center border-none bg-transparent text-white active:scale-[0.9] transition-transform duration-150 cursor-pointer"
      >
        {player.status === "loading" ? (
          <span
            className="animate-spin rounded-full border-[3px] border-current border-t-transparent"
            style={{ width: main * 0.45, height: main * 0.45 }}
            aria-label="Loading playback"
          />
        ) : isPlaying ? (
          <Pause size={main} weight="Bold" />
        ) : (
          <Play size={main} weight="Bold" className="translate-x-[2px]" />
        )}
      </button>
      <button
        type="button"
        aria-label="Next track"
        onClick={() => void playerEngine.skipNext()}
        className="inline-flex h-[64px] w-[64px] items-center justify-center border-none bg-transparent text-white active:scale-[0.88] active:opacity-70 transition-all duration-150 cursor-pointer"
      >
        <SkipNext size={side} weight="Bold" />
      </button>
    </div>
  );
}

function ActionRow({
  view,
  onViewChange,
  onOpenQueue,
}: {
  view: MobilePlayerTab;
  onViewChange: (view: MobilePlayerTab) => void;
  onOpenQueue?: () => void;
}) {
  const player = usePlayerState();
  const { t } = useTranslation();

  const base =
    "inline-flex h-[44px] w-[52px] items-center justify-center rounded-[12px] border-none transition-all duration-150 active:scale-[0.92] cursor-pointer";
  const on = "bg-white/20 text-white";
  const off = "bg-transparent text-white/55";

  return (
    <div className="mx-auto flex w-full max-w-[320px] items-center justify-between">
      <button
        type="button"
        aria-label="Shuffle"
        aria-pressed={player.shuffle}
        onClick={() => playerEngine.setShuffle(!player.shuffle)}
        className={`${base} ${player.shuffle ? on : off}`}
      >
        <Shuffle size={22} weight={player.shuffle ? "Bold" : "Outline"} />
      </button>
      <button
        type="button"
        aria-label={t("player.lyrics")}
        aria-pressed={view === "lyrics"}
        onClick={() => onViewChange(view === "lyrics" ? "player" : "lyrics")}
        className={`${base} ${view === "lyrics" ? on : off}`}
      >
        <ChatRoundDots size={22} weight={view === "lyrics" ? "Bold" : "Outline"} />
      </button>
      <button
        type="button"
        aria-label={t("player.queue")}
        onClick={() => onOpenQueue?.()}
        className={`${base} ${off}`}
      >
        <Playlist size={22} weight="Outline" />
      </button>
      <button
        type="button"
        aria-label="Repeat"
        aria-pressed={player.repeat !== "off"}
        onClick={() =>
          playerEngine.setRepeat(
            player.repeat === "off" ? "all" : player.repeat === "all" ? "one" : "off",
          )
        }
        className={`${base} ${player.repeat !== "off" ? on : off}`}
      >
        {player.repeat === "one" ? <RepeatOne size={22} /> : <Repeat size={22} />}
      </button>
    </div>
  );
}

function LikeButton({ isLiked, onToggle }: { isLiked: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      aria-label={isLiked ? t("common.unlike") : t("common.like")}
      onClick={onToggle}
      className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full border-none bg-white/15 text-white active:scale-[0.9] transition-transform duration-150 cursor-pointer"
    >
      {isLiked ? <HeartFill size={19} /> : <HeartLine size={19} />}
    </button>
  );
}

export function MobilePlayerView({
  view,
  onViewChange,
  onClose,
  onOpenQueue,
  onHeaderPointerDown,
  lyricsPane,
}: MobilePlayerViewProps) {
  const player = usePlayerState();
  const track = player.currentTrack;
  const coverUrl = track?.coverUrl || "";
  const trackTitle = track?.title || "";
  const trackArtists = track?.artists || "";
  const isPlaying = player.status === "playing";
  const isCoverLoaded = useCoverReady(coverUrl);
  const { isLiked, toggle } = useLikeToggle(track?.id);

  const artistLine = (
    <span className="flex min-w-0 items-center gap-[6px]">
      {track?.explicit && (
        <ExplicitBadge className="!bg-white/60 !text-black !pb-0 !leading-none shrink-0" />
      )}
      <span className="min-w-0 truncate">
        <ArtistLink
          name={trackArtists}
          artistId={track?.artistId}
          artistList={track?.artistList}
          onNavigate={onClose}
          className="text-white/60"
        />
      </span>
    </span>
  );

  return (
    <div className="absolute inset-0 z-10 flex flex-col pt-[env(safe-area-inset-top,0px)] pb-[max(env(safe-area-inset-bottom,0px),14px)]">
      {/* grabber: tap to close, or drag down to dismiss */}
      <div
        onPointerDown={onHeaderPointerDown}
        style={{ touchAction: "none" }}
        className="flex h-[40px] shrink-0 items-center justify-center"
      >
        <button
          type="button"
          aria-label="Close player"
          onClick={onClose}
          className="flex h-[40px] w-[120px] items-center justify-center border-none bg-transparent p-0 cursor-pointer"
        >
          <span className="block h-[5px] w-[40px] rounded-full bg-white/45" />
        </button>
      </div>

      {view === "player" ? (
        <div className="flex min-h-0 flex-1 flex-col px-[28px]">
          {/* artwork: as large as fits, shrinks a little while paused */}
          <div
            className="flex min-h-0 flex-1 items-center justify-center"
            style={{ containerType: "size" }}
          >
            <motion.div
              animate={{ scale: isPlaying ? 1 : 0.86 }}
              transition={{ type: "spring", stiffness: 240, damping: 24, mass: 0.9 }}
              className={`relative overflow-hidden rounded-[14px] bg-black/25 shadow-[0_24px_60px_rgba(0,0,0,0.5)] ${
                coverUrl && !isCoverLoaded ? "animate-pulse" : ""
              }`}
              style={{
                width: "min(100cqw, 100cqh)",
                height: "min(100cqw, 100cqh)",
              }}
            >
              <AnimatePresence>
                <motion.div
                  key={track?.id || coverUrl || "empty"}
                  initial={{ opacity: 0, filter: "blur(8px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(8px)" }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  {coverUrl ? (
                    <CoverImage
                      key={coverUrl}
                      src={coverUrl}
                      alt={trackTitle}
                      fill
                      sizes="400px"
                      priority
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/40">
                      <MusicNote size={72} />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* title / artist / like */}
          <div className="mt-[22px] flex shrink-0 items-center gap-[14px]">
            <div className="min-w-0 flex-1">
              <p
                className="m-0 truncate text-[22px] font-[600] leading-[1.2] text-white"
                style={{ letterSpacing: "-0.02em" }}
              >
                {trackTitle}
              </p>
              <p className="m-0 mt-[2px] flex items-center text-[19px] font-[400] leading-[1.25] text-white/60">
                {artistLine}
              </p>
            </div>
            <LikeButton isLiked={isLiked} onToggle={toggle} />
          </div>

          <div className="mt-[14px] shrink-0">
            <TimelineSlider
              positionMs={player.positionMs}
              durationMs={player.durationMs}
              onSeek={(pos) => playerEngine.seek(pos)}
              showTime
              size="md"
              className="w-full"
            />
          </div>

          <div className="mt-[6px] shrink-0">
            <Transport />
          </div>

          <div className="mt-[4px] shrink-0">
            <VolumePicker className="w-full" size="sm" />
          </div>

          <div className="mt-[14px] shrink-0">
            <ActionRow view={view} onViewChange={onViewChange} onOpenQueue={onOpenQueue} />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* mini header: small cover + title / artist (also a drag handle) */}
          <div
            onPointerDown={onHeaderPointerDown}
            style={{ touchAction: "none" }}
            className="flex shrink-0 items-center gap-[12px] px-[24px] pb-[10px]"
          >
            <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[8px] bg-black/25 shadow-[0_6px_18px_rgba(0,0,0,0.4)]">
              {coverUrl ? (
                <CoverImage
                  key={coverUrl}
                  src={coverUrl}
                  alt={trackTitle}
                  fill
                  sizes="52px"
                  priority
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/40">
                  <MusicNote size={24} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-[16px] font-[600] leading-[1.25] text-white">
                {trackTitle}
              </p>
              <p className="m-0 flex items-center text-[14px] font-[400] leading-[1.3] text-white/60">
                {artistLine}
              </p>
            </div>
            <LikeButton isLiked={isLiked} onToggle={toggle} />
          </div>

          {/* lyrics, fading out under the header and above the controls */}
          <div
            className="relative min-h-0 flex-1"
            style={{
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0, #000 28px, #000 calc(100% - 36px), transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, transparent 0, #000 28px, #000 calc(100% - 36px), transparent 100%)",
            }}
          >
            {lyricsPane}
          </div>

          <div className="shrink-0 px-[28px]">
            <TimelineSlider
              positionMs={player.positionMs}
              durationMs={player.durationMs}
              onSeek={(pos) => playerEngine.seek(pos)}
              showTime
              size="md"
              className="w-full"
            />
            <div className="mt-[2px]">
              <Transport compact />
            </div>
            <div className="mt-[4px]">
              <ActionRow view={view} onViewChange={onViewChange} onOpenQueue={onOpenQueue} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MobilePlayerView;
