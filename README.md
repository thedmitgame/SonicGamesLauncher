Disclaimer: This is an unofficial fan-made open-source launcher. Sonic the Hedgehog and all related titles, names, and trademarks are property of SEGA. This repository contains no copyrighted game files, ROMs, music, or artwork — users provide their own legally owned games and custom media assets locally.
# Sonic Games Launcher(SGL) & Theme Studio
> **100% Vibecoded Project:**  
> **EN:** This entire launcher, save-file parser, and standalone Theme Studio were built from scratch through **vibecoding** — iterative human-directed architecture, UI/UX design, binary save reverse-engineering, and debugging powered by AI.  
> **RU:** Весь этот лаунчер, бинарный парсер сохранений и автономная студия тем от начала до конца созданы в формате **вайбкодинга** — живой итеративной разработки архитектуры, дизайна, реверс-инжиниринга сейвов и отладки в тандеме человека и ИИ.

---

**[English](#-features-en)** | **[Русский](#-возможности-ru)**

---

## Features (EN)

**Sonic Custom Hub** is an all-in-one customizable console-style desktop launcher for classic Sonic fan remasters and collections:
* **Supported Titles Out of the Box:** *Sonic 1 Forever*, *Sonic 2 Absolute*, *Sonic CD Restored*, *Sonic 3 A.I.R.*, *Sonic Origins* (+ support for adding any custom `.exe` game).
* **Real-Time Binary Save & Achievement Tracker:**
  * Reads native `SData.bin` (RSDKv3/v4), `OXY.PDATA` (`s3air_saveslots.bin` & `s3air_achievements.bin`), and local Steam stats (`UserGameStatsSchema_1794960.bin`).
  * Displays active save slots, characters, lives, Chaos Emeralds / Time Stones, and unlocked achievements without modifying game files.
* **Built-In Mod Manager & Conflict Detector:**
  * Drag & Drop `.zip` mod installation directly into the launcher window.
  * Toggle mods, save/load mod presets, and scan active mods for file conflicts (`Sonic 3 A.I.R.` & RSDK titles).
* **Engine Tweaks & In-Game Screenshots:**
  * Quickly toggle Fullscreen, Borderless, VSync, Pixel Filtering, and Dev Menu.
  * Global screenshot hotkey (`F6` by default) with built-in gallery & sound effect.
* **Deep Visual & Audio Customization (`.sonicpack`):**
  * **3D Ring Carousel**, Arc Wheel, and Switch Row modes with adjustable radius & tilt angle.
  * Animated character stage with mouse parallax, 5 entrance animations, background shaders, audio-reactive equalizer, custom intro video/splash, daytime atmosphere lighting, and physics-based ring cursor particles.
  * **Standalone `ThemeStudio.html`** — visual drag-and-drop HUD layout editor with `.json` and `.sonicpack` bundle export.
* **Easy Localization (`locales/`):**
  * Comes with English (`en.json`) and Russian (`ru.json`). Add any new language simply by dropping a new `.json` file into the `locales/` folder.
* **Gamepad & Keyboard Navigation:** Full XInput/DirectInput controller support right on the main screen.

### 🚀 Quick Start (EN)

#### Option 1: Portable `.exe` (No Python required)
1. Download `SGLv1.1.exe` (and `ThemeStudio.html` if needed) from the [**Releases**](../../releases) section.
2. Place `SGLv1.1.exe` in a dedicated folder and run it.
3. Click **Games & Paths** to select your game `.exe` files and customize artwork/music via **Launcher Customization**.

#### Option 2: Run from Source
```bash
git clone https://github.com/thedmitgame/SonicGamesLauncher
cd sonic-custom-hub
pip install -r requirements.txt
python main.py
```

#### Build `.exe` Yourself
```bash
pip install pyinstaller
pyinstaller --noconfirm --clean --onefile --windowed --icon "icon.ico" --name "SonicLauncher" --add-data "index.html;." --add-data "style.css;." --add-data "script.js;." --add-data "locales;locales" main.py
```

---

## 🇷🇺 Возможности (RU)

**Sonic Custom Hub** — кастомный десктопный лаунчер в консольном стиле для классических ремастеров и фанатских портов Соника:
* **Поддержка игр из коробки:** *Sonic 1 Forever*, *Sonic 2 Absolute*, *Sonic CD Restored*, *Sonic 3 A.I.R.*, *Sonic Origins* (+ возможность добавить любую свою `.exe` игру, менять подписи и порядок карточек).
* **Честный трекер сохранений, Изумрудов и достижений:**
  * Напрямую читает бинарные файлы `SData.bin` (RSDKv3/v4), контейнеры `OXY.PDATA` (`s3air_saveslots.bin` и `s3air_achievements.bin`) и локальную статистику Steam для *Sonic Origins*.
  * Показывает активные слоты, выбранных героев, жизни, очки, собранные Изумруды Хаоса / Камни Времени и открытые достижения.
* **Менеджер модов и детектор конфликтов:**
  * Установка `.zip` архивов с модами простым перетаскиванием (Drag & Drop) в окно лаунчера.
  * Включение/отключение модов, пресеты сборок и проверка конфликтующих файлов между активными модами.
* **Твики движка, рулетка и скриншоты:**
  * Быстрое переключение Fullscreen, Borderless, VSync, сглаживания пикселей и Dev Menu без ручного редактирования `.ini` / `.json`.
  * Кнопка случайного выбора игры («Рулетка»), быстрый переход к папкам игры и сейвов, а также встроенная галерея скриншотов по горячей клавише.
* **Полная кастомизация и пакеты тем `.sonicpack`:**
  * **3D-круговая карусель** с настройкой радиуса и угла наклона, параллакс персонажей от мыши, выбор анимаций появления героев, фоновые шейдеры, живой эквалайзер в такт музыке, видео-заставка перед стартом игры, освещение по времени суток и разлетающиеся кольца при клике.
  * **Автономная студия `ThemeStudio.html`** — визуальный редактор расположения всех элементов интерфейса с упаковкой тем в `.sonicpack`.
* **Открытая папка переводов (`locales/`):**
  * Переключение между русским и английским языками на лету. Любой желающий может легко сделать свой перевод, скопировав `locales/en.json`.
* **Управление с геймпада и клавиатуры.**

### Установка и запуск (RU)

#### Вариант 1: Готовый `.exe` (без установки Python)
1. Скачайте `SGLv1.1.exe` в разделе [**Releases**](../../releases).
2. Положите его в любую удобную папку и запустите.
3. Нажмите **«Игры и пути»**, чтобы указать `.exe` файлы установленных игр, и настройте обложки, персонажей и музыку под себя в меню кастомизации.

#### Вариант 2: Запуск из исходного кода
```bash
git clone https://github.com/thedmitgame/SonicGamesLauncher
cd sonic-custom-hub
pip install -r requirements.txt
python main.py
```

---

## Legal Disclaimer / Правовая информация

**EN:** This project is an unofficial, non-commercial, fan-made open-source utility. **Sonic the Hedgehog** and all related characters, names, and trademarks are the property of **SEGA**. This repository contains **zero copyrighted game code, ROMs, music tracks, fonts, or official artwork** — users supply their own legally owned game executables and personal media assets locally.

**RU:** Данный проект является неофициальной некоммерческой фанатской утилитой с открытым исходным кодом. **Sonic the Hedgehog**, а также все связанные персонажи, названия и товарные знаки являются собственностью компании **SEGA**. В этом репозитории **нет защищённых авторским правом файлов игр, ROM-образов, музыки, шрифтов или официальных артов** — все игры и медиафайлы добавляются пользователем самостоятельно локально на своём ПК.
