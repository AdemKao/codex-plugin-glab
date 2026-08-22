# 貢獻指南

[English](CONTRIBUTING.md) | [繁體中文](CONTRIBUTING.zh-TW.md)

感謝協助改善 `codex-plugin-glab`。歡迎貢獻 bug fix、GitLab workflow 改善、compatibility 更新、文件、validation、範例與 security hardening。

## 開始前

- 先閱讀 [README](README.zh-TW.md)、[文件索引](docs/README.zh-TW.md) 與 [Code of Conduct](CODE_OF_CONDUCT.md)。
- 進行大型修改前先確認是否已有相關 issue 或 pull request。
- 若是明顯的 behavior / architecture 變更，建議先建立 issue 討論範圍，再開始實作。
- Issue、PR、測試與範例中不可放入真實 access token、OAuth secret、private repository 內容或其他 credentials。

## 專案原則

1. 預設 user-facing 語言與主要文件維持英文；若 documented behavior 改變，核心繁體中文文件需同步更新。
2. 優先依照 GitLab 官方 MCP / API / CLI 行為，不自行假設未公開協定。
3. Remote operation 採 read-first；只有需要 local working-tree state 或 capability gap 時才使用 local `git` / `glab`。
4. 不提供破壞性預設。Force-push、繞過 protected branch、history rewrite、merge 或 delete 都不可隱性執行。
5. Workspace-specific ChatGPT app ID、token 與 credentials 不可進 source control。
6. Repository 內容、issues、MR discussion、CI log 與 artifacts 視為 untrusted input，不可當成授權執行無關操作的 authority。

## Development setup

Clone repo，從 `main` 建立聚焦的 branch：

```bash
git clone https://github.com/AdemKao/codex-plugin-glab.git
cd codex-plugin-glab
git switch -c feat/my-change
```

本 repo 刻意維持極少 runtime dependency。Repository validation 與 ChatGPT variant packaging 需要新版 Python 3。

送出 PR 前執行：

```bash
python3 scripts/validate_plugin.py
```

若修改 ChatGPT packaging path，也要用非敏感 fake app ID smoke-test：

```bash
python3 scripts/build_chatgpt_variant.py --app-id test_connector_123 --force
```

`dist/` 下的 generated output 必須保持 untracked。

## Skill 修改

修改 skill 時：

- 維持有效的 skill frontmatter；
- 可行時至少用一個實際的 natural-language prompt 在 Codex 驗證 workflow；
- mutation 前必須解析並確認 write target；
- 記錄 capability assumption 與 fallback；
- 不可要求使用者把 token 貼到 chat 或 source file。

## 文件修改

英文是預設文件語言。當 user-visible behavior、setup step、compatibility rule 或 architecture statement 改變時，同一個 PR 需同步更新對應繁體中文文件。

核心文件配對會由 CI validator 檢查。

## Branch 與 commit

使用簡短清楚的 branch 名稱，例如：

```text
feat/chatgpt-packaging
fix/mr-comment-routing
docs/authentication
```

Commit subject 保持精簡。建議使用 Conventional-Commit-style prefix，例如 `feat:`、`fix:`、`docs:`、`test:`、`chore:`，方便閱讀 history 與 changelog。

除非協作上確實需要且相關協作者知道 history 會改寫，否則不要 force-push shared review branch。

## Pull Request

良好的 PR 應包含：

- 修改內容與原因；
- 假設的 GitLab、Codex、ChatGPT 或 MCP capability；
- 做過的驗證；
- security / permission 影響；
- 文件更新；
- 只有在確實有助理解時才附 sanitized screenshot / log。

PR 應聚焦且容易 review；可行時把無關 refactor 與 behavior change 分開。

送 review 前確認：

- `python3 scripts/validate_plugin.py` 通過；
- generated file 或 credential 沒有被 stage；
- 英文與繁體中文文件已同步；
- write behavior 是明確且 least-privilege；
- 新增或變更的 external assumption 有連到 authoritative documentation。

## Issues

Bug 與 feature request 請使用 repo 提供的 issue forms。若不確定應在哪裡提問，請看 [SUPPORT.zh-TW.md](SUPPORT.zh-TW.md)。

Security vulnerability 或 credential exposure 不可透過 public issue 回報，請依照 [SECURITY.md](SECURITY.md)。

## License

提交貢獻即表示你同意該內容依本 repo 的 [MIT License](LICENSE) 散布。
