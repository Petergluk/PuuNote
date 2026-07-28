import re

with open('src/components/SettingsPanel.tsx', 'r') as f:
    content = f.read()

# Replace the inner part of <div className="flex flex-col gap-3 p-4">
# It starts at <div className="flex flex-col gap-3 p-4"> and ends at </div>\n      </section>

new_content = """        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-sm text-app-text-secondary">
              {t("settings.language")}
              <HelpCircle className="h-3.5 w-3.5 text-app-text-muted hover:text-app-text-secondary cursor-help transition-colors" title={t("settings.tooltips.language")} />
            </div>
            <div className="flex shrink-0 rounded-[0.85rem] border border-app-border bg-app-card p-0.5 shadow-sm">
              {(["ru", "en"] as const).map((lng) => (
                <button
                  key={lng}
                  onClick={() => void i18n.changeLanguage(lng)}
                  aria-pressed={language === lng}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors ${
                    language === lng
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-sm text-app-text-secondary">
              {t("settings.inactiveBranches")}
              <HelpCircle className="h-3.5 w-3.5 text-app-text-muted hover:text-app-text-secondary cursor-help transition-colors" title={t("settings.tooltips.inactiveBranches")} />
            </div>
            <div className="flex shrink-0 rounded-[0.85rem] border border-app-border bg-app-card p-0.5 shadow-sm">
              {branchModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setInactiveBranchesMode(mode.value)}
                  aria-pressed={inactiveBranchesMode === mode.value}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors ${
                    inactiveBranchesMode === mode.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {t(mode.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-sm text-app-text-secondary">
              {t("settings.focusMode")}
              <HelpCircle className="h-3.5 w-3.5 text-app-text-muted hover:text-app-text-secondary cursor-help transition-colors" title={t("settings.tooltips.focusMode")} />
            </div>
            <div className="flex shrink-0 rounded-[0.85rem] border border-app-border bg-app-card p-0.5 shadow-sm">
              {focusModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setFocusModeScope(mode.value)}
                  aria-pressed={focusModeScope === mode.value}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors ${
                    focusModeScope === mode.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {t(mode.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-sm text-app-text-secondary">
              {t("settings.editorMode")}
              <HelpCircle className="h-3.5 w-3.5 text-app-text-muted hover:text-app-text-secondary cursor-help transition-colors" title={t("settings.tooltips.editorMode")} />
            </div>
            <div className="flex shrink-0 rounded-[0.85rem] border border-app-border bg-app-card p-0.5 shadow-sm">
              {editorModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setEditorMode(mode.value)}
                  aria-pressed={editorMode === mode.value}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors ${
                    editorMode === mode.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {t(mode.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-sm text-app-text-secondary">
              {t("settings.editorEnter")}
              <HelpCircle className="h-3.5 w-3.5 text-app-text-muted hover:text-app-text-secondary cursor-help transition-colors" title={t("settings.tooltips.editorEnter")} />
            </div>
            <div className="flex shrink-0 rounded-[0.85rem] border border-app-border bg-app-card p-0.5 shadow-sm">
              {editorEnterModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setEditorEnterMode(mode.value)}
                  aria-pressed={editorEnterMode === mode.value}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors ${
                    editorEnterMode === mode.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {t(mode.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-sm text-app-text-secondary">
              {t("settings.pasteSplit")}
              <HelpCircle className="h-3.5 w-3.5 text-app-text-muted hover:text-app-text-secondary cursor-help transition-colors" title={t("settings.tooltips.pasteSplit")} />
            </div>
            <div className="flex shrink-0 rounded-[0.85rem] border border-app-border bg-app-card p-0.5 shadow-sm">
              {pasteSplitModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setPasteSplitMode(mode.value)}
                  aria-pressed={pasteSplitMode === mode.value}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors ${
                    pasteSplitMode === mode.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {t(mode.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>"""

content = re.sub(r'<div className="flex flex-col gap-3 p-4">.*?(?=\s*</section>)', new_content, content, flags=re.DOTALL)

with open('src/components/SettingsPanel.tsx', 'w') as f:
    f.write(content)

print('done')
