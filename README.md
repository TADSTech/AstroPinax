# AstroPinax

A clean, futuristic browser new tab page that loads NASA's Astronomy Picture of the Day as a full-bleed backdrop, built with a keyboard-friendly search bar, quick shortcuts, and a Web Audio space synth.

## Quick Start

1. Install dependencies:
   ```bash
   bun install
   ```
2. Build or start the dev server:
   ```bash
   bun run dev
   bun run build
   ```

## Controls & Commands

Type these directly in the search bar:
- `>help` - display terminal guide
- `>random` - fetch a random date
- `>today` - go to today's APOD
- `>theme` - toggle theme modes
- `>settings` - open dialog
- `>music` - toggle ambient noise

Type `/github <query>`, `/reddit <query>`, or `/ddg <query>` to execute targeted searches directly in the same tab.

## Themes

Three themes ship in Settings (or cycle them with the header theme button / `>theme`):
- **Space** — deep navy, the default
- **Void** — true OLED black
- **Nova** — bright daylight / light mode

## Set as your default new tab (Chromium)

Chromium browsers won't let a site override the new tab page directly, so route it through a "custom new tab" extension:

1. Install a **“Custom New Tab URL”** extension from your browser's store.
2. In its options, set the new tab URL to `https://tadstech.github.io/AstroPinax/`.
3. Save — every new tab now opens AstroPinax.

These steps are also available in-app under Settings → Set as Default New Tab, with a copy button for the URL.

## Config

Key configurations (theme, shortcuts, default search engines) are stored locally in the browser's localStorage.

Licensed under MIT.
