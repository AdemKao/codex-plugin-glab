# 支援

[English](SUPPORT.md) | [繁體中文](SUPPORT.zh-TW.md)

## 尋求協助前

1. 先閱讀 [README](README.zh-TW.md) 與 [文件索引](docs/README.zh-TW.md)。
2. 確認問題來源是在 Codex、ChatGPT、GitLab MCP、`glab`，還是這個 plugin。
3. 如果問題與本機 checkout 有關，先執行：

```bash
python3 scripts/validate_plugin.py
```

4. 在貼出 log 或截圖前，移除 access token、OAuth secret、private repository 內容與其他敏感資訊。

## 該在哪裡提問

- **Plugin bug：** 使用 repository 的 bug report template。
- **功能建議：** 使用 feature request template。
- **安全漏洞或憑證外洩：** 不要建立 public issue，請依照 [SECURITY.md](SECURITY.md) 回報。
- **GitLab MCP / GitLab API 行為：** 先對照 GitLab 官方文件確認行為，再判斷是否為 plugin 問題。
- **ChatGPT / Codex 產品限制：** 先確認 OpenAI 最新產品文件，再判斷是否應在此 repo 回報。

## 回報時應包含

請提供 plugin version 或 commit、Codex/ChatGPT 使用介面、相關 GitLab offering/version、執行的操作、預期行為、實際行為，以及已去除敏感資訊的重現步驟。

本專案以 best-effort 方式維護，不保證固定回覆或解決時間。
