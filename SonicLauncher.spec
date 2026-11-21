# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[('index.html', '.'), ('style.css', '.'), ('script.js', '.'), ('ThemeStudio.html', '.'), ('icon.ico', '.'), ('js', 'js'), ('locales', 'locales')],
    hiddenimports=['core.tweaks', 'core.scanner', 'core.mod_managers', 'core.mods', 'core.gamebanana', 'core.config', 'core.codes', 'core.backups', 'core.saves_extra', 'core.discord_rpc', 'clr', 'keyboard', 'pystray', 'PIL', 'PIL.Image', 'PIL.ImageDraw', 'PIL.ImageGrab'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['unittest', 'pydoc', 'doctest', 'xmlrpc', 'sqlite3'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='SonicLauncher',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['icon.ico'],
)
