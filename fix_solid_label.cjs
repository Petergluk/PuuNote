const fs = require('fs');
let code = fs.readFileSync('src/components/BranchColorMenu.tsx', 'utf-8');
code = code.replace(/<!-- Solid label replaced -->\n<label[\s\S]*?<\/label>/, `
            <label
              className={\`flex shrink-0 items-center gap-1.5 rounded bg-app-card\${
                theme === "mono"
                  ? " opacity-40 cursor-not-allowed pointer-events-none"
                  : " cursor-pointer"
              }\`}
              title={t("Solid fill")}
            >
              <span className="text-[10px] text-app-text-dimmer uppercase tracking-wider">{t("Solid fill")}</span>
              <div className="flex h-[18px] w-[18px] items-center justify-center rounded border border-app-border">
                <input
                  type="checkbox"
                  checked={currentBranchColorSettings.solid}
                  onChange={(event) => setBranchSolid(event.target.checked)}
                  className="h-3 w-3 accent-app-accent"
                  aria-label={t("Solid fill")}
                />
              </div>
            </label>`.trim());
fs.writeFileSync('src/components/BranchColorMenu.tsx', code);
