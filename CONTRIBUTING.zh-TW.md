# 貢獻指南

[English](CONTRIBUTING.md) | [繁體中文](CONTRIBUTING.zh-TW.md)

感謝協助改善 codex-plugin-glab。

## 原則

1. 預設使用者介面與主要文件維持英文；若功能行為有變更，請同步更新繁體中文文件。
2. 優先依照 GitLab 官方 MCP / API / CLI 行為，不自行假設未公開協定。
3. MCP/connector 操作採 read-first；只有 MCP 無法良好處理時才使用本機 `git` / `glab`。
4. 文件或測試不可放入真實 token。
5. 不提供破壞性預設；force-push、繞過 protected branch 或不可逆操作都不可自動執行。

## 開發

從 `main` 建立分支後進行修改，完成後執行：

```bash
python3 scripts/validate_plugin.py
```

若修改 skill，至少要在 Codex 以一個自然語言 prompt 測試該 workflow。

## Pull Request

請包含：

- 修改內容與原因；
- 假設的 GitLab / Codex 版本或功能；
- 做過的驗證；
- security / permission 影響；
- 若適用，英文與繁體中文文件更新。
