# AstroPinax

A clean, modern browser new tab page with NASA's Astronomy Picture of the Day as a full-bleed background, featuring a keyboard-centric search bar, fast shortcuts, and a Web Audio space synth.
## Getting started

Install dependencies first:
```
bun install
```
Then, either build or start the dev server:
```
bun run dev
bun run build
```

## Controls & Shortcuts

Typing these in the search bar will trigger various actions:
- `>help` - show the terminal guide
- `>random` - fetch a random date
- `>today` - jump to today's APOD

- `>theme` - switch themes
- `>settings` - show the settings dialog
- `>music` - toggle ambient sounds

You can also type `/github`, `/reddit`, or `/ddg` followed by a search term to perform a search directly in the new tab.
## Themes
There are three themes in Settings (or hit the header theme button or type `>theme`) - Space (default), Void (true OLED black), and Nova (daylight / light mode).

## Set as Default New Tab (Chromium)
Unfortunately, Chrome-based browsers do not allow apps to override the default new tab directly. Instead, you need to find a "Custom New Tab" extension in your browser's web store and set AstroPinax as your default new tab.
That means:
1. Finding a "Custom New Tab" extension from your browser's web store
2. Opening the extension's options and setting the new tab page URL to `https://tadstech.github.io/AstroPinax/`
3. Saving the options - every new tab should now open as AstroPinax
You'll find these instructions again in-app inside the Settings > Set as Default New Tab menu, with a copy button for the URL.

The majority of your user's config is saved in the browser's localStorage. You can change the default search engine, themes, or keyboard shortcuts in Settings.