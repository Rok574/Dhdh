import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { CloseLine, Search2Line, CloseCircleFill, ExitLine, ArrowLeftLine, RightLine } from "@mingcute/react";
import {
  Play,
  Palette,
  Gallery,
  HeadphonesRound,
  ShieldCheck,
  InfoCircle,
  Book2,
  QuestionCircle,
  Database,
  Widget5,
} from "@solar-icons/react";
import Dialog from "@/shared/ui/Dialog";
import { UserAvatar } from "@/shared/ui";
import { useTranslation, getTranslationsForAllLocales } from "@/languages";
import { useModalStore } from "@/features/library";
import { useAuthStore } from "@/features/auth";
import { useIsMobile } from "@/shared/hooks";
import {
  PlaybackTab,
  AppearanceTab,
  CustomizationTab,
  AudioTab,
  StorageTab,
  AboutTab,
  OverlayTab,
} from "./tabs";

type TabId = "Playback" | "Overlay" | "Appearance" | "Customization" | "Audio" | "Storage" | "About";

const TAB_ICONS: Record<TabId, typeof Play> = {
  Playback: Play,
  Overlay: Widget5,
  Appearance: Palette,
  Customization: Gallery,
  Audio: HeadphonesRound,
  Storage: Database,
  About: InfoCircle,
};

const TAB_GROUPS: { labelKey: "preferences" | "application"; ids: TabId[] }[] = [
  { labelKey: "preferences", ids: ["Playback", "Overlay", "Audio", "Appearance", "Customization"] },
  { labelKey: "application", ids: ["Storage", "About"] },
];


const SETTING_ITEMS: { tabId: TabId; titleKey: string; descKey?: string }[] = [
  // Playback
  { tabId: "Playback", titleKey: "settings.autoplay_similar.title", descKey: "settings.autoplay_similar.description" },
  { tabId: "Playback", titleKey: "settings.track_double_click.title", descKey: "settings.track_double_click.description" },
  { tabId: "Playback", titleKey: "settings.default_playback_context.title", descKey: "settings.default_playback_context.description" },
  { tabId: "Playback", titleKey: "settings.audio.pause_on_device_change.title", descKey: "settings.audio.pause_on_device_change.description" },

  // Overlay
  { tabId: "Overlay", titleKey: "settings.overlay.position.title", descKey: "settings.overlay.position.description" },
  { tabId: "Overlay", titleKey: "settings.overlay.show_lyrics.title", descKey: "settings.overlay.show_lyrics.description" },
  { tabId: "Overlay", titleKey: "settings.overlay.auto_show_on_minimize.title", descKey: "settings.overlay.auto_show_on_minimize.description" },
  { tabId: "Overlay", titleKey: "settings.overlay.always_on_top.title", descKey: "settings.overlay.always_on_top.description" },

  // Appearance
  { tabId: "Appearance", titleKey: "settings.language.label", descKey: "settings.language.description" },
  { tabId: "Appearance", titleKey: "settings.theme.title", descKey: "settings.theme.description" },
  { tabId: "Appearance", titleKey: "settings.branding.title", descKey: "settings.branding.description" },

  // Customization
  { tabId: "Customization", titleKey: "settings.customization.wallpaper_title", descKey: "settings.customization.wallpaper_description" },
  { tabId: "Customization", titleKey: "settings.customization.blocks_title", descKey: "settings.customization.blocks_description" },
  { tabId: "Customization", titleKey: "settings.customization.reset_all", descKey: "settings.customization.reset_all_desc" },

  // Audio
  { tabId: "Audio", titleKey: "settings.audio.title", descKey: "settings.audio.description" },
  { tabId: "Audio", titleKey: "settings.connection.checks_title" },

  // Storage
  { tabId: "Storage", titleKey: "settings.storage.title", descKey: "settings.storage.description" },
  { tabId: "Storage", titleKey: "settings.storage.usage_title" },
  { tabId: "Storage", titleKey: "settings.storage.open_folder", descKey: "settings.storage.open_folder_description" },

  // About
  { tabId: "About", titleKey: "settings.about.liner", descKey: "common.app.version" },
  { tabId: "About", titleKey: "settings.notifications.test_button" },
];

const font = { fontFamily: "var(--font-inter), sans-serif" } as const;

export default function SettingsModal() {
  const { t } = useTranslation();
  const open = useModalStore((state) => state.settingsOpen);
  const close = useModalStore((state) => state.closeSettings);

  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TabId>("Playback");
  const [searchQuery, setSearchQuery] = useState("");
  // phones show one pane at a time: the list of sections, then a section
  const [mobileView, setMobileView] = useState<"menu" | "detail">("menu");

  const handleClose = () => {
    setSearchQuery("");
    setMobileView("menu");
    close();
  };

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    if (isMobile) setMobileView("detail");
  };

  const tabLabels: Record<TabId, string> = {
    Playback: t("settings.tabs.playback"),
    Overlay: t("settings.tabs.overlay") || "Overlay",
    Appearance: t("settings.tabs.appearance"),
    Customization: t("settings.tabs.customization") || "Customization",
    Audio: t("settings.tabs.audio"),
    Storage: t("settings.tabs.storage"),
    About: t("settings.tabs.about"),
  };

  const tabDescriptions: Record<TabId, string> = {
    Playback: t("settings.playback.description"),
    Overlay: t("settings.overlay.description") || "Desktop overlay behavior, position and lyrics display.",
    Appearance: t("settings.theme.description"),
    Customization: t("settings.customization.description") || "Window background wallpaper, transparency and block blur effects.",
    Audio: t("settings.audio.description"),
    Storage: t("settings.storage.description"),
    About: t("settings.about.tagline"),
  };

  const matchingTabIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().trim();
    const set = new Set<TabId>();

    const TAB_LABEL_KEYS: Record<TabId, string> = {
      Playback: "settings.tabs.playback",
      Overlay: "settings.tabs.overlay",
      Appearance: "settings.theme.title",
      Customization: "settings.tabs.customization",
      Audio: "settings.tabs.audio",
      Storage: "settings.tabs.storage",
      About: "settings.tabs.about",
    };

    const TAB_DESC_KEYS: Record<TabId, string> = {
      Playback: "settings.playback.description",
      Overlay: "settings.overlay.description",
      Appearance: "settings.theme.description",
      Customization: "settings.customization.description",
      Audio: "settings.audio.description",
      Storage: "settings.storage.description",
      About: "settings.about.tagline",
    };


    (Object.keys(TAB_LABEL_KEYS) as TabId[]).forEach((tabId) => {
      const texts = [
        ...getTranslationsForAllLocales(TAB_LABEL_KEYS[tabId]),
        ...getTranslationsForAllLocales(TAB_DESC_KEYS[tabId]),
      ];
      if (texts.some((txt) => txt.toLowerCase().includes(query))) {
        set.add(tabId);
      }
    });

    SETTING_ITEMS.forEach((item) => {
      const texts = [
        ...getTranslationsForAllLocales(item.titleKey),
        ...(item.descKey ? getTranslationsForAllLocales(item.descKey) : []),
      ];
      if (texts.some((txt) => txt.toLowerCase().includes(query))) {
        set.add(item.tabId);
      }
    });

    return set;
  }, [searchQuery]);

  const filteredGroups = useMemo(() => {
    return TAB_GROUPS.map((group) => {
      const ids = group.ids.filter(
        (id) =>
          // the overlay is a desktop-only window, nothing to configure on phones
          !(isMobile && id === "Overlay") &&
          (!matchingTabIds || matchingTabIds.has(id)),
      );
      return { ...group, ids };
    }).filter((group) => group.ids.length > 0);
  }, [matchingTabIds, isMobile]);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    if (matchingTabIds && matchingTabIds.size > 0 && !matchingTabIds.has(activeTab)) {
      const firstMatch = TAB_GROUPS.flatMap((g) => g.ids).find((id) => matchingTabIds.has(id));
      if (firstMatch) {
        setActiveTab(firstMatch);
      }
    }
  }, [searchQuery, matchingTabIds, activeTab]);

  const openExternal = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const displayName =
    user?.displayName ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "Liner";
  const handle = user?.username ? `@${user.username}` : (user?.email ?? t("settings.manage_account"));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (!next ? handleClose() : undefined)}
      maxWidth={isMobile ? "100%" : 880}
      className={
        isMobile
          ? "p-0 h-full !mx-0 !max-h-none !rounded-none !flex-col overflow-hidden !bg-bg-elevated !border-0 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
          : "p-0 h-[620px] max-h-[86vh] !flex-row overflow-hidden !bg-bg-elevated !border-0"
      }
    >
      {(!isMobile || mobileView === "menu") && (
      <aside
        className={`${
          isMobile ? "w-full flex-1" : "w-[248px] shrink-0"
        } flex flex-col min-h-0 bg-transparent`}
      >
        {isMobile && (
          <div className="flex items-center justify-between px-[16px] pt-[14px] pb-[2px] shrink-0">
            <h3
              className="text-text-primary text-[22px] m-0 font-[600] tracking-[-0.01em]"
              style={font}
            >
              {t("settings.title")}
            </h3>
            <button
              type="button"
              aria-label={t("common.close") || "Close"}
              onClick={handleClose}
              className="w-[36px] h-[36px] shrink-0 inline-flex items-center justify-center rounded-full text-text-secondary bg-border-alpha-14 active:opacity-70 border-0 p-0 cursor-pointer"
            >
              <CloseLine size={18} />
            </button>
          </div>
        )}
        <div className={`${isMobile ? "px-[16px] pt-[10px]" : "px-[12px] pt-[14px]"} pb-[8px]`}>
          <div className="relative flex items-center">
            <Search2Line
              size={15}
              className="absolute left-[10px] text-text-tertiary pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("settings.search_placeholder")}
              className={`w-full ${isMobile ? "h-[40px] text-[16px]" : "h-[32px] text-[13px]"} pl-[30px] pr-[26px] bg-border-alpha-14 text-text-primary rounded-[8px] border-0 outline-none placeholder:text-text-tertiary focus:bg-border-alpha-20 transition-colors`}
              style={font}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-[6px] p-0 border-0 bg-transparent text-text-tertiary hover:text-text-primary cursor-pointer flex items-center justify-center"
              >
                <CloseCircleFill size={14} />
              </button>
            )}
          </div>
        </div>

        <nav
          className={`flex-1 min-h-0 overflow-y-auto ${isMobile ? "px-[16px]" : "px-[12px]"} pb-[12px] flex flex-col gap-[14px]`}
          role="tablist"
          aria-label={t("settings.title")}
        >
          {filteredGroups.length === 0 ? (
            <p className="text-text-tertiary text-[12px] px-[10px] py-[8px] m-0" style={font}>
              {t("search.no_results") || "Ничего не найдено"}
            </p>
          ) : (
            filteredGroups.map((group) => (
            <div key={group.labelKey} className="flex flex-col gap-[2px]">
              <p
                className="text-text-tertiary text-[11px] font-[500] m-0 px-[10px] pb-[4px] pt-[2px]"
                style={font}
              >
                {t(`settings.groups.${group.labelKey}`)}
              </p>
              {group.ids.map((id) => {
                const isActive = id === activeTab;
                const Icon = TAB_ICONS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectTab(id)}
                    className={`w-full flex items-center gap-[10px] px-[10px] ${
                      isMobile ? "py-[13px]" : "py-[8px]"
                    } rounded-[8px] border-0 cursor-pointer text-left transition-colors ${
                      isActive && !isMobile
                        ? "bg-border-alpha-14 text-text-primary"
                        : "bg-transparent text-text-secondary hover:bg-border-alpha-14 hover:text-text-primary active:bg-border-alpha-14"
                    }`}
                    style={{
                      ...font,
                      fontSize: isMobile ? "16px" : "13.5px",
                      fontWeight: isActive && !isMobile ? 500 : 400,
                    }}
                  >
                    <Icon
                      size={isMobile ? 22 : 18}
                      weight="Bold"
                      className={isActive && !isMobile ? "text-text-primary shrink-0" : "text-text-tertiary shrink-0"}
                    />
                    <span className="truncate leading-none flex-1">{tabLabels[id]}</span>
                    {isMobile && <RightLine size={18} className="text-text-tertiary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )))}

          <div className="flex flex-col gap-[2px] pt-[2px] mt-[2px] border-t border-solid border-border-primary">
            <p
              className="text-text-tertiary text-[11px] font-[500] m-0 px-[10px] pt-[10px] pb-[4px]"
              style={font}
            >
              {t("settings.groups.help")}
            </p>
            <button
              type="button"
              onClick={() => openExternal("https://github.com/tryliner/desktop/blob/main/README.md")}
              className={`w-full flex items-center gap-[10px] px-[10px] ${isMobile ? "py-[13px]" : "py-[8px]"} rounded-[8px] border-0 bg-transparent text-text-secondary hover:bg-border-alpha-14 hover:text-text-primary active:bg-border-alpha-14 cursor-pointer text-left transition-colors`}
              style={{ ...font, fontSize: isMobile ? "16px" : "13.5px" }}
            >
              <Book2 size={18} weight="Bold" className="text-text-tertiary shrink-0" />
              <span className="leading-none">{t("settings.docs")}</span>
            </button>
            <button
              type="button"
              onClick={() => openExternal("https://t.me/liner_app?direct")}
              className={`w-full flex items-center gap-[10px] px-[10px] ${isMobile ? "py-[13px]" : "py-[8px]"} rounded-[8px] border-0 bg-transparent text-text-secondary hover:bg-border-alpha-14 hover:text-text-primary active:bg-border-alpha-14 cursor-pointer text-left transition-colors`}
              style={{ ...font, fontSize: isMobile ? "16px" : "13.5px" }}
            >
              <QuestionCircle size={18} weight="Bold" className="text-text-tertiary shrink-0" />
              <span className="leading-none">{t("settings.support")}</span>
            </button>
          </div>
        </nav>

        <div className="shrink-0 p-[12px] pt-[8px]">
          <div className="flex items-center gap-[10px] px-[6px] py-[4px] min-w-0">
            <span className="relative shrink-0">
              <UserAvatar user={user ?? null} size={32} />
              <span className="absolute right-[-1px] bottom-[-1px] w-[10px] h-[10px] rounded-full bg-[#12B76A] border-2 border-bg-primary" aria-hidden />
            </span>
            <span className="flex-1 min-w-0 flex flex-col leading-tight">
              <span
                className="text-text-primary text-[13px] font-[500] truncate"
                style={font}
              >
                {displayName}
              </span>
              <span
                className="text-text-tertiary text-[12px] truncate"
                style={font}
              >
                {handle}
              </span>
            </span>
            <button
              type="button"
              onClick={async () => {
                handleClose();
                await logout();
              }}
              title={t("settings.profile.sign_out") || "Log out"}
              aria-label={t("settings.profile.sign_out") || "Log out"}
              className="p-1.5 rounded-md text-text-tertiary hover:text-[#E81123] hover:bg-border-alpha-14 transition-colors border-0 bg-transparent cursor-pointer flex items-center justify-center shrink-0"
            >
              <ExitLine size={18} className="shrink-0" />
            </button>
          </div>
        </div>
      </aside>
      )}

      {/* ── Right secondary frame: same roundness, inset with padding, darker ── */}
      {(!isMobile || mobileView === "detail") && (
      <div className={`flex-1 min-w-0 min-h-0 ${isMobile ? "" : "p-[2px]"} flex`}>
        <div
          className={`flex-1 min-w-0 min-h-0 flex flex-col ${
            isMobile ? "" : "rounded-xl"
          } bg-bg-primary overflow-hidden`}
        >
        <div
          className={`flex items-start justify-between gap-[16px] ${
            isMobile ? "px-[12px] pt-[12px]" : "px-[24px] pt-[20px]"
          } pb-[10px] shrink-0`}
        >
          {isMobile && (
            <button
              type="button"
              aria-label={t("common.back") || "Back"}
              onClick={() => setMobileView("menu")}
              className="w-[36px] h-[36px] shrink-0 inline-flex items-center justify-center rounded-full text-text-primary bg-border-alpha-14 active:opacity-70 border-0 p-0 cursor-pointer"
            >
              <ArrowLeftLine size={18} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h3
              className="text-text-primary text-[15px] m-0 font-[600] tracking-[-0.01em]"
              style={font}
            >
              {tabLabels[activeTab]}
            </h3>
            <p
              className="text-text-tertiary text-[13px] m-0 mt-[3px] leading-snug"
              style={font}
            >
              {tabDescriptions[activeTab]}
            </p>
          </div>
          <button
            type="button"
            aria-label={t("common.close") || "Close"}
            onClick={handleClose}
            className={`${isMobile ? "hidden" : "inline-flex"} w-[28px] h-[28px] shrink-0 items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-border-alpha-14 transition-colors border-0 bg-transparent p-0 cursor-pointer`}
          >
            <CloseLine size={17} />
          </button>
        </div>

        <div
          className={`flex-1 min-h-0 overflow-y-auto ${
            isMobile ? "px-[16px]" : "px-[24px]"
          } pb-[16px] flex flex-col`}
        >
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col"
          >
            {activeTab === "Playback" && <PlaybackTab searchQuery={searchQuery} />}
            {activeTab === "Overlay" && <OverlayTab searchQuery={searchQuery} />}
            {activeTab === "Appearance" && <AppearanceTab searchQuery={searchQuery} />}
            {activeTab === "Customization" && <CustomizationTab searchQuery={searchQuery} />}
            {activeTab === "Audio" && <AudioTab searchQuery={searchQuery} />}
            {activeTab === "Storage" && <StorageTab searchQuery={searchQuery} />}
            {activeTab === "About" && <AboutTab searchQuery={searchQuery} />}

          </motion.div>
        </div>
        </div>
      </div>
      )}
    </Dialog>
  );
}
