# chat-demo-app

把 DeepSeek 官方的 **API 使用 demo** 打包成安卓 App，技术栈是 [Capacitor](https://capacitorjs.com/)。网页部分完全沿用官方构建产物，只加了一个原生桥接补丁。

> **非官方项目。** 与 DeepSeek 无隶属关系，不代表官方立场。仓库里的网页资源来自 DeepSeek 发布的官方 demo，版权归 DeepSeek 所有。

## 这是什么

官方 demo 是一份纯静态网页，用户自己填 API Key，由浏览器直接请求 `api.deepseek.com`。它没有后端，天然适合塞进 WebView —— 这里做的就是这些事：

- 用 Capacitor 把静态资源装进安卓壳
- 补上浏览器有、WebView 没有的几件事（返回键、外链、文件导出）
- 用 GitHub Actions 自动出包并发 Release

API Key 仍然只存在设备本地的 `localStorage` 里，不经过任何第三方服务器。

## 功能

跟官方 demo 一致：

- 多轮对话、思考模式、联网搜索开关
- Markdown / 代码高亮 / KaTeX 公式渲染
- 文件与图片上传（走 DeepSeek Files API）
- 语音输入（麦克风录音转写）
- 回答朗读（TTS）
- 会话历史、主题切换、中英文界面
- 对话数据导出为 zip

安卓端额外补的：

- 返回键：有弹层时先关弹层，否则双击退出
- 外部链接（引用角标、API 文档）用系统浏览器打开，不会把 App 顶掉
- 导出 zip 时调起系统分享面板，可存到「文件」或发给其他 App
- 输入框跟随软键盘调整，不会被遮住

## 下载安装

去 [Releases](../../releases/latest) 下载：

- `chat-demo-<版本>-universal.apk` — 通用包，任何设备都能装
- `chat-demo-<版本>-arm64-v8a.apk` — 只含 arm64，现代手机装这个

两个包目前体积接近，因为网页产物里没有原生库。等以后引入带 `.so` 的插件，单架构包才会明显更小。

安装时如果提示「应用未安装」，先卸载旧版本 —— 说明两次构建用了不同的签名密钥。

## 使用

1. 打开 App，填入 DeepSeek API Key（在 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 申请）
2. Key 保存在本机，可随时在设置里更换
3. 首次用语音输入时，系统会询问麦克风权限

## 与官方 demo 的差异

官方产物 `src/static/`、`src/LICENSE` 一字未改。改动只有四处：

| 位置 | 改了什么 | 为什么 |
| --- | --- | --- |
| `src/index.html` | 尾部加了一行 `<script src="native-bridge.js">` | 挂载补丁 |
| `src/native-bridge.js` | 新增文件 | 补 WebView 缺口，浏览器里自动失效 |
| `android/` | Capacitor 生成的工程 + 权限、签名、ABI 配置 | 打包所需 |
| `capacitor.config.json` | appId / appName / webDir | 打包所需 |

`native-bridge.js` 只在 `Capacitor.isNativePlatform()` 为真时生效，纯浏览器打开时什么都不做。

## 构建

### GitHub Actions（推荐）

推送到 `main` 或提 PR 会构建并把 APK 传成 artifact。打 tag 会额外发布 Release：

```bash
git tag v0.1.2
git push origin v0.1.2
```

### 本地

需要 JDK 21、Node 18+、Android SDK（platform 35 + build-tools 35.0.0）。

```bash
npm ci
npx cap sync android
cd android && ./gradlew assembleRelease
```

产物在 `android/app/build/outputs/apk/release/`。

改了 `src/` 里的任何东西之后，必须重新 `npx cap sync android`，否则改的是旧副本。

## 签名

仓库里带了一个公开的演示密钥 `android/keystore/demo-release.jks`（口令全是 `chatdemo`）。它的作用是让 CI 零配置也能产出可覆盖升级的 release APK。

**这个密钥是公开的，任何人都能用同名包伪造签名。** 自用无所谓，要正经分发就换成自己的。

在仓库 Settings → Secrets 里加上这四个，CI 会自动改用你的密钥：

- `ANDROID_KEYSTORE_BASE64` — `base64 -w0 your-release.jks` 的输出
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

## 目录结构

```
src/                      官方网页产物（未改动，除 index.html 加一行）
src/native-bridge.js      原生桥接补丁
capacitor.config.json     Capacitor 配置
android/                  Android 工程
  keystore/               签名密钥
.github/workflows/        CI
```

## 一些说明

**targetSdk 是 34 不是 35。** targetSdk 35 会在 Android 15 上强制 edge-to-edge，而这份网页没有处理安全区，顶栏会被状态栏压住。等布局加上 `env(safe-area-inset-*)` 再升。

**`minSdk` 是 24。** 网页产物用了可选链和空值合并，需要较新的 WebView。

**对话历史存在 IndexedDB 里。** 清除应用数据会一起清掉。重要对话先用「导出」存一份。

## 许可

MIT。见 [LICENSE](LICENSE)。

`src/` 下的网页资源版权归 DeepSeek，同样以 MIT 协议发布。
