<div align="center">

<img src="src/assets/intro.png" alt="Agree Banner" width="100%" />

# 🎮 Agree — Birthday Quest

**An interactive birthday-themed mini game built with React, TypeScript & Canvas.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎭 **Character Select** | Choose between two playable characters with unique styles |
| 📸 **Photo Capture** | Snap a selfie to use as your in-game avatar |
| 💬 **Dialogue System** | Interactive NPC conversations that adapt to your name |
| ⚔️ **Combat Engine** | Canvas-based shooting mechanics with enemy AI & physics |
| 🎯 **Milestone Wishes** | Collect wishes at score milestones (100, 300, 600, 1000, 1500) |
| 🎂 **Birthday Surprise** | Unlock a special mystery box when you reach score 1703 |
| 📱 **PWA Ready** | Installable on mobile with offline support |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/edison-alpha/agree.git
cd agree

# Install
npm install

# Create .env.local and add your Gemini API key
cp .env.example .env.local

# Run
npm run dev
```

Open **http://localhost:3000** in your browser.

## 🛠 Tech Stack

- **Framework** — React 19 + TypeScript
- **Build Tool** — Vite 6
- **Styling** — Tailwind CSS 4
- **Animation** — Motion (Framer Motion)
- **AI** — Google Gemini API
- **Rendering** — HTML5 Canvas
- **Backend** — Supabase (Serverless PostgreSQL)
- **Storage** — Supabase Storage (Profile Photos)

## 📁 Project Structure

```
src/
├── components/
│   ├── screens/     # Game screens (Intro, Dialogue, HUD, etc.)
│   └── ui/          # Reusable UI components
├── constants/       # Game config, characters, dialogues
├── engine/          # Core game engine (physics, renderer, entities)
├── hooks/           # Custom React hooks (including Supabase sync)
├── lib/             # Supabase client & database types
├── services/        # Backend services (profile, level, inventory, etc.)
├── types/           # TypeScript type definitions
└── utils/           # Helper functions (audio, math)

supabase/
├── migrations/      # Database migrations
└── config.toml      # Supabase configuration
```

## 🗄️ Backend Setup

Backend menggunakan **Supabase** sebagai serverless database. Lihat [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) untuk panduan lengkap.

### Quick Setup

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login & link project:
```bash
supabase login
supabase link --project-ref your-project-ref
```

3. Apply migrations:
```bash
supabase db push
```

4. Setup environment:
```bash
cp .env.example .env
# Edit .env dengan Supabase credentials
```

### Features

- ✅ Player profiles & authentication
- ✅ Level progress tracking
- ✅ Real-time leaderboard
- ✅ Inventory system
- ✅ Mystery box & code redemption
- ✅ Ticket system (6 dimsum = 1 ticket)
- ✅ Profile photo storage
- ✅ Row Level Security (RLS)

Lihat [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) untuk detail API.

## 📜 License

MIT © [edison-alpha](https://github.com/edison-alpha)
