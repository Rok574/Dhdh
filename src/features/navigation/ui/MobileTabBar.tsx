import { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { sidebarNavItems } from "../data/navigation";
import { useTranslation } from "@/languages";
import { useModalStore } from "@/features/library";

interface MobileTabBarProps {
  searchOpen: boolean;
  onSearchToggle: () => void;
}

// bottom tab bar used instead of the desktop side rail on phones.
function MobileTabBar({ searchOpen, onSearchToggle }: MobileTabBarProps) {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const settingsOpen = useModalStore((state) => state.settingsOpen);
  const toggleSettings = useModalStore((state) => state.toggleSettings);
  const closeSearch = useModalStore((state) => state.closeSearch);

  const isRouteActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/home";
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="Primary"
      className="flex h-[52px] w-full shrink-0 items-stretch justify-around"
    >
      {sidebarNavItems.map((item) => {
        const Icon = item.Icon;
        const label = t(`common.sidebar.${item.id}`) || item.label;
        const active =
          item.id === "search"
            ? searchOpen
            : item.id === "settings"
              ? settingsOpen
              : item.href
                ? isRouteActive(item.href) && !searchOpen
                : false;

        const content = (
          <>
            <Icon
              size={24}
              className={`transition-opacity duration-150 text-text-primary ${
                active ? "opacity-100" : "opacity-50"
              }`}
            />
            <span
              className={`text-[10px] leading-none font-[500] text-text-primary transition-opacity duration-150 ${
                active ? "opacity-100" : "opacity-50"
              }`}
            >
              {label}
            </span>
          </>
        );

        const className =
          "flex flex-1 flex-col items-center justify-center gap-[4px] border-none bg-transparent p-0 active:scale-[0.96] transition-transform duration-100 cursor-pointer";

        if (item.id === "search") {
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={searchOpen}
              onClick={onSearchToggle}
              className={className}
            >
              {content}
            </button>
          );
        }
        if (item.id === "settings") {
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={settingsOpen}
              onClick={toggleSettings}
              className={className}
            >
              {content}
            </button>
          );
        }
        return (
          <Link
            key={item.id}
            to={item.href!}
            aria-current={active ? "page" : undefined}
            onClick={() => closeSearch()}
            className={className}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

export default memo(MobileTabBar);
