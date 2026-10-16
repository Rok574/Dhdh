import AppImage from "@/features/covers/ui/AppImage";
import logo from "@/assets/logo.svg";
import spotifyLogo from "@/assets/branding/logo-spotify.svg";
import discordLogo from "@/assets/branding/logo-discord.svg";
import telegramLogo from "@/assets/branding/logo-telegram.svg";
import auroraLogo from "@/assets/branding/logo-aurora.svg";
import sunsetLogo from "@/assets/branding/logo-sunset.svg";
import oceanLogo from "@/assets/branding/logo-ocean.svg";
import forestLogo from "@/assets/branding/logo-forest.svg";
import berryLogo from "@/assets/branding/logo-berry.svg";
import carbonLogo from "@/assets/branding/logo-carbon.svg";
import pixelLogo from "@/assets/branding/logo-pixel.svg";
import scanlinesLogo from "@/assets/branding/logo-scanlines.svg";
import vhsLogo from "@/assets/branding/logo-vhs.svg";
import { usePlayerStore, type AccentVariant } from "@/features/player";

const brandingLogos: Record<Exclude<AccentVariant, "default">, string> = {
  spotify: spotifyLogo,
  discord: discordLogo,
  telegram: telegramLogo,
  aurora: auroraLogo,
  sunset: sunsetLogo,
  ocean: oceanLogo,
  forest: forestLogo,
  berry: berryLogo,
  carbon: carbonLogo,
  pixel: pixelLogo,
  scanlines: scanlinesLogo,
  vhs: vhsLogo,
};

// the app logo in the accent chosen under Settings > Appearance > Branding.
// used by the desktop sidebar and by the mobile home screen.
export default function BrandLogo({ size = 34 }: { size?: number }) {
  const accentVariant = usePlayerStore((state) => state.accentVariant);
  const themed =
    accentVariant === "default" ||
    accentVariant === "carbon" ||
    accentVariant === "pixel" ||
    accentVariant === "scanlines";

  return (
    <AppImage
      src={accentVariant === "default" ? logo : brandingLogos[accentVariant]}
      alt="Logo"
      width={size}
      height={size}
      className={themed ? "theme-logo invert dark:invert-0" : ""}
      draggable={false}
    />
  );
}
