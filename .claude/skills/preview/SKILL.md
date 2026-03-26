---
name: preview
description: Preview the reference template HTML in the browser. Use when the user wants to see the site design, check the template, or preview changes.
disable-model-invocation: true
allowed-tools: Bash(python *), Bash(open *), Bash(xdg-open *)
---

# テンプレートプレビュー

リファレンステンプレートをブラウザでプレビューします。

## 手順

リファレンスHTMLをブラウザで開きます：

```bash
python3 -m http.server 8080 --directory /home/user/oracle_cloud_dify/docs &
echo "http://localhost:8080/reference-template.html でプレビュー可能"
```

## ファイルの場所

- テンプレート: `docs/reference-template.html`
- デザインガイド: `docs/DESIGN_GUIDE.md`
- クイックスタート: `docs/GETTING_STARTED.md`
